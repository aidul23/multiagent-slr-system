import os
import json
import time
import re
import requests
from typing import List, Dict, Any
import trafilatura

OPENAI_API_KEY = os.getenv("API-KEY")
# DEEPRESEARCH_URL = os.getenv("DEEPRESEARCH_URL")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")


def call_openai_chat(model: str, messages: List[Dict[str, str]], temperature=0.3, max_tokens=6000) -> str:
    hdrs = {"Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"}
    data = {"model": model, "messages": messages,
            "temperature": temperature, "max_tokens": max_tokens}
    r = requests.post("https://api.openai.com/v1/chat/completions",
                      headers=hdrs, data=json.dumps(data), timeout=120)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


# ---------- Option A: talk to MCP/DeepResearch server ----------
# def run_deepresearch_mcp(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Assumes your MCP server exposes POST /research
    with {objective, questions, search_string, criteria} and returns:
    {report: str, sources: [{url, title}], meta: {...}}
    Adapt to the exact API of your MCP server.
    """
    if not DEEPRESEARCH_URL:
        raise RuntimeError("DEEPRESEARCH_URL not set")
    url = f"{DEEPRESEARCH_URL}/research"
    r = requests.post(url, json=payload, timeout=600)
    r.raise_for_status()
    return r.json()

# ---------- Option B: fallback DIY deep research ----------


def tavily_search(q: str, max_results=5) -> List[Dict[str, str]]:
    if not TAVILY_API_KEY:
        return []
    r = requests.post(
        "https://api.tavily.com/search",
        headers={"Content-Type": "application/json"},
        json={"api_key": TAVILY_API_KEY, "query": q,
              "max_results": max_results, "include_answer": False},
        timeout=45,
    )
    r.raise_for_status()
    data = r.json()
    return [{"url": it["url"], "title": it.get("title", "")} for it in data.get("results", [])]


def fetch_clean_text(url: str) -> str:
    try:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            return ""
        return trafilatura.extract(downloaded, include_comments=False, include_links=False) or ""
    except Exception:
        return ""


def expand_subquestions(objective: str, questions: List[str], search_string: str) -> List[str]:
    msg = [
        {"role": "system", "content": "You decompose SLR research objectives into concrete web-search subquestions."},
        {"role": "user", "content": f"""Objective: {objective}
            Research Questions: {json.dumps(questions, indent=2)}
            Search string: {search_string}

            Produce 6-10 concise, specific subquestions that would help collect high-quality evidence and seminal papers.
            Return as a JSON list of strings only.
            """}]
    txt = call_openai_chat("gpt-4o-mini", msg, temperature=0.2)
    try:
        return json.loads(re.search(r"\[.*\]", txt, re.S).group(0))
    except Exception:
        # fallback to basic splits
        return [s.strip("-*• ").strip() for s in txt.split("\n") if s.strip()][:8]


def synthesize_report(objective: str, questions: List[str], search_string: str, notes: List[Dict[str, Any]]) -> str:
    rq_list = "\n".join([f"- RQ{i+1}: {rq}" for i, rq in enumerate(questions)])
    msg = [
        {"role": "system", "content": (
            "You are an exacting SLR writer. Produce a rigorous, reproducible SLR per Kitchenham & Charters. "
            "Write with clear headings, numbered citations [1], [2], … referencing the provided sources in-order. "
            "Every Research Question (RQ) MUST have its own subsection with a direct answer and synthesized evidence."
        )},
        {"role": "user", "content": f"""
        Write a detailed SLR (2000–3500 words) that *fully answers each RQ* and follows this structure:

        1. Abstract (150–250 words): objective, method, key findings, implications.
        2. Introduction: background, motivation, the exact RQs you will answer:
        {rq_list}
        3. Method (SLR Protocol):
        - Databases/sources & Search Strategy (include the exact Search String below).
        - Study Selection: screening flow (PRISMA-style narrative: identification → screening → eligibility → included).
        - Inclusion/Exclusion Criteria (bulleted).
        - Quality Appraisal (describe the checklist/criteria you applied).
        - Data Extraction & Synthesis approach (e.g., thematic/quantitative).
        4. Results (by RQ): For EACH RQ:
        - RQ Statement
        - Synthesis of findings with patterns/contradictions and numbered citations
        - Short 'Answer to RQ' paragraph (start with: **Answer:** …)
        5. Discussion: implications for research/practice; comparison to prior surveys if relevant.
        6. Threats to Validity: selection bias, publication bias, construct/ internal/external validity; how mitigated.
        7. Limitations & Future Work.
        8. Conclusion.
        9. References: numbered list [1]… with title and URL (map exactly to the order of sources supplied).

        Constraints & style:
        - Use only the evidence in the 'Evidence Notes' (ordered). Cite in-text with [#] that match that order.
        - Be specific and descriptive; avoid generic statements. Prefer precise claims tied to sources.
        - If evidence conflicts, acknowledge and synthesize.
        - Use clear, academic tone; no marketing language.

        Objective: {objective}

        Research Questions:
        {json.dumps(questions, indent=2)}

        Search String:
        {search_string}

        Evidence Notes (ordered; cite as [1], [2], … in this exact order):
        {json.dumps(notes, indent=2)}
        """}]
    return call_openai_chat("gpt-4o", msg, temperature=0.2, max_tokens=6000)


def run_deepresearch_fallback(objective: str, questions: List[str], search_string: str, criteria: Dict[str, Any]) -> Dict[str, Any]:
    # 1) expand subquestions
    subs = expand_subquestions(objective, questions, search_string)

    # 2) for each subquestion → search → fetch
    sources = []
    for sq in subs:
        # change to serpapi if you prefer
        hits = tavily_search(sq, max_results=5)
        for h in hits:
            if len(sources) >= 40:
                break
            text = fetch_clean_text(h["url"])
            if not text:
                continue
            snippet = text[:1500]  # keep it small
            sources.append({"url": h["url"], "title": h.get(
                "title", ""), "snippet": snippet, "subq": sq})
        if len(sources) >= 40:
            break

    # 3) synthesize
    report = synthesize_report(
        objective, questions, search_string, sources[:25])

    return {
        "report": report,
        "sources": [{"url": s["url"], "title": s["title"]} for s in sources],
        "subquestions": subs,
        "criteria": criteria
    }
