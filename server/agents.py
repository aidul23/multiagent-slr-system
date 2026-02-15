# agents.py
import requests
import json
from flask import jsonify
import os
from openai import OpenAI
import csv
import pandas as pd
import re
import glob
import faiss
import numpy as np
from typing import List, Dict, Any, Tuple

openai_key = os.getenv("API-KEY")
api_key = openai_key

client = OpenAI(api_key="REDACTED")


# Models (you can change these)
EMBED_MODEL = "text-embedding-ada-002"   # keep this if your FAISS was built with ada-002
CHAT_MODEL  = "gpt-4o"

def call_openai_chat(model: str, messages: List[Dict[str, str]], temperature=0.2, max_tokens=6000) -> str:
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content

def embed_query(text: str) -> np.ndarray:
    # IMPORTANT: must match the embedding model used to build your FAISS indexes
    emb = client.embeddings.create(input=text, model=EMBED_MODEL)
    return np.array(emb.data[0].embedding, dtype="float32")

def load_abstracts_from_csv(project_id: str) -> List[str]:
    project_path = os.path.join("data", project_id)
    if not os.path.exists(project_path):
        return []
    abstracts = []
    for fp in glob.glob(os.path.join(project_path, "*.csv")):
        try:
            df = pd.read_csv(fp)
            if "Abstract" in df.columns:
                abstracts.extend(df["Abstract"].dropna().astype(str).tolist())
        except Exception:
            continue
    return abstracts

def load_all_embeddings(project_id: str) -> List[Dict[str, Any]]:
    """
    Looks in dataembedding/<project_id> for triplets:
      <stem>_chunks.npy, <stem>_embeddings.npy, <stem>_faiss.index
    Returns: list of {stem, index, chunks, dim}
    """
    folder = os.path.join("dataembedding", project_id)
    if not os.path.isdir(folder):
        return []
    resources = []
    for chunk_file in glob.glob(os.path.join(folder, "*_chunks.npy")):
        stem = chunk_file[:-11]  # remove '_chunks.npy'
        emb_file = f"{stem}_embeddings.npy"
        idx_file = f"{stem}_faiss.index"
        if not (os.path.exists(emb_file) and os.path.exists(idx_file)):
            continue
        try:
            chunks = np.load(chunk_file, allow_pickle=True).tolist()
            index  = faiss.read_index(idx_file)
            resources.append({
                "stem": os.path.basename(stem),
                "index": index,
                "chunks": chunks,
                "dim": index.d
            })
        except Exception:
            continue
    return resources

def _chunk_text_of(item: Any) -> str:
    if isinstance(item, dict):
        return item.get("text") or item.get("chunk") or ""
    return str(item)

def _chunk_meta_of(item: Any) -> Dict[str, Any]:
    if isinstance(item, dict):
        return {
            "title":   item.get("title", ""),
            "year":    item.get("year", ""),
            "section": item.get("section", ""),
            "url":     item.get("url", ""),
            "paper_id":item.get("paper_id", ""),
        }
    return {"title":"", "year":"", "section":"", "url":"", "paper_id":""}

def retrieve_passages_for_query(resources: List[Dict[str,Any]], query: str,
                                total_passages=24, max_per_doc=2, trim=700) -> List[Dict[str, Any]]:
    qvec = embed_query(query).reshape(1, -1)
    hits: List[Dict[str,Any]] = []
    for res in resources:
        if res["dim"] != qvec.shape[1]:
            continue
        # overfetch, we will prune
        D, I = res["index"].search(qvec, max_per_doc * 4)
        for dist, idx in zip(D[0], I[0]):
            if idx < 0 or idx >= len(res["chunks"]):
                continue
            raw = res["chunks"][idx]
            text = _chunk_text_of(raw)
            if not text:
                continue
            meta = _chunk_meta_of(raw)
            hits.append({
                "paper_key": res["stem"] or meta.get("paper_id") or res["stem"],
                "text": text[:trim],
                "meta": meta,
                "score": float(-dist)  # higher is better
            })
    # sort and diversify
    hits.sort(key=lambda x: x["score"], reverse=True)
    kept, per_paper = [], {}
    for h in hits:
        pk = h["paper_key"]
        if per_paper.get(pk, 0) >= max_per_doc:
            continue
        kept.append(h)
        per_paper[pk] = per_paper.get(pk, 0) + 1
        if len(kept) >= total_passages:
            break
    for i, k in enumerate(kept, start=1):
        k["note_id"] = i  # local numbering per RQ
    return kept

def synthesize_rq_answer(rq: str, notes: List[Dict[str,Any]], model=CHAT_MODEL) -> str:
    ev_lines = []
    for n in notes:
        m = n["meta"]
        label = f"[{n['note_id']}]"
        title = m.get("title",""); year=str(m.get("year","")); section=m.get("section","")
        ev_lines.append(f"{label} (title: {title}; year: {year}; section: {section})\n{n['text']}")
    evidence_text = "\n\n".join(ev_lines) if ev_lines else "None."
    msg = [
        {"role":"system","content":"You are an exacting SLR writer. Be precise; cite with [#]."},
        {"role":"user","content":f"""
Research Question: {rq}

Evidence Notes (cite with [#] using the note IDs):
{evidence_text}

Write:
- A 400–700 word synthesis integrating patterns/contradictions across the notes, with in-text citations [#].
- A short **Answer:** paragraph directly answering the RQ (2–4 sentences).
- A brief 'Limitations for this RQ'.

Rules:
- Use ONLY the evidence provided.
- If a claim isn't supported by notes, say the evidence is insufficient.
- No invented numbers or external sources.
"""}
    ]
    return call_openai_chat(model, msg, temperature=0.2, max_tokens=2200)

def synthesize_final_report(objective: str,
                            research_questions: List[str],
                            abstracts: List[str],
                            rq_sections: List[Tuple[str, str, List[Dict[str,Any]]]],
                            model=CHAT_MODEL) -> str:
    # keep abstracts short (just for landscape)
    abs_overview = "\n".join(f"- {a[:400]}" for a in abstracts[:40])

    results_blocks, refs_blocks = [], []
    for i, (rq, answer_text, notes) in enumerate(rq_sections, start=1):
        results_blocks.append(f"### RQ{i}: {rq}\n\n{answer_text}\n")
        for n in notes:
            m = n["meta"]
            title = (m.get("title") or f"Paper {n['paper_key']}").strip()
            year  = str(m.get("year","")).strip()
            url   = m.get("url","").strip()
            ref = f"[{n['note_id']}] {title}" + (f" ({year})" if year else "") + (f". {url}" if url else "")
            refs_blocks.append(ref)
    # unique references preserving order
    seen, uniq_refs = set(), []
    for r in refs_blocks:
        if r not in seen:
            uniq_refs.append(r); seen.add(r)

    rq_list = "\n".join([f"- RQ{i+1}: {rq}" for i, rq in enumerate(research_questions)])
    msg = [
        {"role":"system","content":"You are an exacting SLR author following Kitchenham & Charters."},
        {"role":"user","content":f"""
Objective:
{objective or "N/A"}

Research Questions:
{rq_list}

--- INTRO INPUT (Abstracts overview; do NOT cite [#] here) ---
{abs_overview}

--- RESULTS INPUT (Per-RQ texts already include [#] citations) ---
{chr(10).join(results_blocks)}

--- REFERENCES INPUT (map [#] to these entries; scoped per RQ) ---
{chr(10).join(uniq_refs)}

Now produce the final SLR with:

1. Abstract (150–250 words)
2. Introduction (use abstracts overview; no [#])
3. Method (SLR Protocol): uploaded corpus; FAISS semantic retrieval; selection; inclusion/exclusion; quality appraisal; data extraction & synthesis.
4. Results (by RQ): keep the [#] in-text citations; end each with **Answer:**.
5. Discussion (implications; contradictions; gaps)
6. Threats to Validity
7. Limitations & Future Work
8. Conclusion
9. References: list only entries that appeared with [#].

Rules:
- Do NOT fabricate references; use only provided entries.
- Academic tone; specific and descriptive.
"""}
    ]
    return call_openai_chat(model, msg, temperature=0.2, max_tokens=7000)


def generate_research_objective_with_gpt(user_prompt, model="gpt-3.5-turbo"):
    """
    Generates a research objective based on a user's input prompt using OpenAI's GPT model.
    """

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Construct the dynamic prompt
    prompt_content = (
        f"You are a helpful assistant skilled in writing systematic research objectives. "
        f"Given the user's instruction: '{user_prompt}', generate a clear, well-structured, short and research objective."
    )

    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant for academic research."},
            {"role": "user", "content": prompt_content}
        ],
        "temperature": 0.7
    }

    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

    if response.status_code == 200:
        result = response.json()
        objective = result["choices"][0]["message"]["content"].strip()
        return {"research_objective": objective}
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return {"error": "Failed to generate research objective", "status_code": response.status_code}


def generate_research_questions_and_purpose_with_gpt(objective, model):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Construct the prompt dynamically
    prompt_content = (
    f"Given the following research objective:\n\n"
    f"\"{objective}\"\n\n"
    f"Generate 5–7 research questions for a systematic literature review. "
    f"For each question, also provide a purpose statement that explains its significance. "
    f"Return the output strictly in the following JSON format (do not include explanations):\n\n"
    f"""{{
    "research_questions": [
        {{
        "question": "First research question here",
        "purpose": "To examine the ..."
        }},
        {{
        "question": "Second research question here",
        "purpose": "To investigate the ..."
        }}
    ]
    }}"""
    )


    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant that returns research questions and their purposes in pure JSON format. Do not include any additional text or explanations outside the JSON structure."},
            {"role": "user", "content": prompt_content}
        ],
        "temperature": 0.7
    }

    # Send the request to OpenAI API
    # response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

    # if response.status_code == 200:
    #     result = response.json()
    #     messages = result['choices'][0]['message']['content']
        
    #     # Split response into lines, removing empty lines
    #     lines = [line.strip() for line in messages.strip().split("\n") if line.strip()]

    #     # List to hold the final formatted questions and purposes
    #     question_purpose_objects = []

    #     # Loop through the lines and pair questions and purposes
    #     for i in range(0, len(lines), 2):
    #         question_line = lines[i]
    #         purpose_line = lines[i + 1] if i + 1 < len(lines) else "Purpose not provided"
            
    #         # Extract the question by removing any number, "Research Question:" and leading spaces
    #         question = re.sub(r"^\d+\.\s*Research Question:\s*", "", question_line)
            
    #         # Extract the purpose by cleaning up the "Purpose:" prefix
    #         purpose = re.sub(r"^Purpose:\s*", "", purpose_line)

    #         # Add the cleaned-up question and purpose to the list
    #         question_purpose_objects.append({"question": question.strip(), "purpose": purpose.strip()})

    #     return {"research_questions": question_purpose_objects}  # Return all cleaned questions and purposes

    # else:
    #     print(f"Error: {response.status_code}")
    #     print(response.text)
    #     return {"error": "Failed to generate research questions"}
    try:
        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

        if response.status_code == 200:
            result = response.json()
            message_content = result['choices'][0]['message']['content']

            # Ensure the model returned valid JSON
            parsed_data = json.loads(message_content)
            return parsed_data

        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return {"error": "Failed to generate research questions"}

    except json.JSONDecodeError as e:
        print("Failed to parse LLM response as JSON:", e)
        print("Raw message content:", message_content)
        return {"error": "Model response was not valid JSON"}


def generate_summary_conclusion(papers_info):
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    prompt_parts = ["Summarize the conclusions of the following papers:"]
    for paper in papers_info:
        title = paper.get("title")
        author = paper.get("creator", "An author")
        year = paper.get("year", "A year")
        prompt_parts.append(f"- '{title}' by {author} ({year})")
    prompt = " ".join(prompt_parts)

    data = {
        "model": "gpt-3.5-turbo",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt},
        ],
    }

    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers=headers,
        data=json.dumps(data),
    )

    if response.status_code == 200:
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        summary_conclusion = content.strip()
    else:
        return jsonify({"error": "Failed to generate a summary conclusion."}), 500

    return summary_conclusion


def generate_abstract_with_openai(prompt, model):
    """Generates a summary abstract using OpenAI's GPT model based on the provided prompt."""
    # Fetching the API key from environment variables for better security practice

    headers = {
        "Authorization": f"Bearer {api_key}",  # Using the API key from environment variables
        "Content-Type": "application/json"
    }
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ]
    }

    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))
    if response.status_code == 200:
        result = response.json()
        content = result['choices'][0]['message']['content']
        return content.strip()
    else:
        raise Exception("Failed to generate a summary abstract from OpenAI.")


def generate_introduction_summary_with_openai(prompt, model):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ]
    }
    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))
    if response.status_code == 200:
        result = response.json()
        content = result['choices'][0]['message']['content']
        return content.strip()
    else:
        raise Exception("Failed to generate the introduction summary from OpenAI.")

# def generate_research_report(project_id, research_questions, model="gpt-4"):
#     """Generates a research report using OpenAI based on extracted abstracts and research questions."""
    
#     project_path = os.path.join("data", project_id)

#     if not os.path.exists(project_path):
#         return {"error": "No extracted data found for this project"}

#     # Load all abstracts from CSV files
#     all_abstracts = []
#     csv_files = [os.path.join(project_path, f) for f in os.listdir(project_path) if f.endswith(".csv")]

#     if not csv_files:
#         return {"error": "No CSV files found"}

#     for csv_file in csv_files:
#         df = pd.read_csv(csv_file)
#         if "Abstract" in df.columns:
#             all_abstracts.extend(df["Abstract"].dropna().tolist())

#     if not all_abstracts:
#         return {"error": "No abstracts found in CSV files"}

#     # Prepare OpenAI API request
#     abstracts_text = "\n\n".join(all_abstracts)
#     questions_text = "\n".join([f"- {q}" for q in research_questions])

#     prompt_text = f"""
#     You are an expert in conducting systematic literature reviews (SLRs). Based on the following collection of paper abstracts, generate a well-structured academic report.

#     ### Research Context:
#     - These abstracts are from peer-reviewed research papers related to a common topic.

#     ### Research Questions:
#     {questions_text}

#     ### Paper Abstracts:
#     {abstracts_text}

#     ---

#     ### TASK:

#     Generate a detailed, structured SLR report using the following format:

#     1. **Introduction**
#     - Briefly introduce the topic and its relevance.
#     - Mention the motivation for conducting this review.

#     2. **Research Objectives**
#     - State the goals of this SLR based on the provided research questions.

#     3. **Summary of Literature**
#     - Summarize trends, common themes, and key findings from the abstracts.
#     - Mention important techniques, datasets, or insights observed.

#     4. **Discussion**
#     - Discuss any notable gaps, contradictions, or opportunities identified.
#     - Compare methods or results if mentioned.

#     5. **Answers to Research Questions**
#     - Provide clear, concise answers to each question, labeled as RQ1, RQ2, etc.

#     6. **Conclusion**
#     - Summarize the insights gained.
#     - Suggest future directions or remaining challenges.

#     Ensure that your output is academically styled, uses clear headings, and remains concise but comprehensive. Avoid quoting entire abstracts. Instead, synthesize the content to demonstrate insight.
#     """

#     headers = {
#         "Authorization": f"Bearer {api_key}",
#         "Content-Type": "application/json"
#     }

#     data = {
#         "model": model,
#         "messages": [
#             {"role": "system", "content": "You are an AI research assistant, helping with systematic literature reviews."},
#             {"role": "user", "content": prompt_text}
#         ],
#         "temperature": 0.7
#     }

#     try:
#         response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

#         if response.status_code == 200:
#             result = response.json()
#             ai_report = result["choices"][0]["message"]["content"].strip()
#             return {"message": "AI-generated research report created successfully!", "report": ai_report}
#         else:
#             return {"error": f"OpenAI API error: {response.status_code}", "details": response.text}

#     except Exception as e:
#         return {"error": f"Unexpected error: {str(e)}"}

def generate_research_report(project_id, research_questions, objective, model):
    """
    NEW behavior:
      - Uses abstracts for Intro/landscape.
      - Uses FAISS+embeddings for per-RQ retrieval & synthesis.
      - Produces a full SLR with per-RQ answers and citations.
    Returns: {"report": str, "sources": [...], "rq_notes": {...}} OR {"error": ...}
    """
    # 1) Load abstracts (optional but nice for Intro)
    abstracts = load_abstracts_from_csv(project_id)

    # 2) Load FAISS resources
    resources = load_all_embeddings(project_id)
    if not resources:
        return {"error": "No embeddings/FAISS indexes found for this project. Upload papers and build indexes first."}

    if not research_questions:
        return {"error": "No research questions provided"}

    # 3) For each RQ: retrieve notes + synthesize an answer
    rq_sections = []          # (rq, synthesized_text, notes)
    rq_notes_map = {}         # rq -> notes

    for rq in research_questions:
        notes = retrieve_passages_for_query(
            resources,
            rq,
            total_passages=24,   # tune (12–36 typical)
            max_per_doc=2,       # diversify sources
            trim=700             # keep notes compact
        )
        answer_text = synthesize_rq_answer(rq, notes, model=model)
        rq_sections.append((rq, answer_text, notes))
        rq_notes_map[rq] = notes

    # 4) Compose final SLR
    report = synthesize_final_report(
        objective=objective,
        research_questions=research_questions,
        abstracts=abstracts,
        rq_sections=rq_sections,
        model=model
    )

    # 5) Build flat sources list (nice for Phase 3 sidebar)
    all_sources = []
    for rq, notes in rq_notes_map.items():
        for n in notes:
            m = n["meta"]
            entry = {
                "rq": rq,
                "title": m.get("title") or f"Paper {n['paper_key']}",
                "year": m.get("year",""),
                "url":  m.get("url",""),
                "paper_key": n["paper_key"],
            }
            if entry not in all_sources:
                all_sources.append(entry)

    return {
        "message": "SLR report generated successfully.",
        "report": report,
        "sources": all_sources,
        "rq_notes": rq_notes_map
    }

    
def refine_research_report(existing_report, user_feedback, model="gpt-4"):
    """Refines an AI-generated research report based on user feedback."""

    prompt = f"""
    Below is a research report previously generated:

    {existing_report}

    Based on the following user feedback or refinement instruction:
    "{user_feedback}"

    Please adjust and improve the report accordingly, while preserving structure and coherence.
    """

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a skilled academic assistant helping refine research reports."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7
    }

    try:
        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

        if response.status_code == 200:
            result = response.json()
            refined_report = result["choices"][0]["message"]["content"].strip()
            return {"refined_report": refined_report}
        else:
            return {"error": f"OpenAI API error: {response.status_code}", "details": response.text}

    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}
