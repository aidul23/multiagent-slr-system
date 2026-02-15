# agents2.py
import requests
import json
import os
import re
key = os.getenv("API-KEY")
api_key = key


def extract_pico_elements(objective, research_questions, model):
    """
    Extracts PICO elements (Population, Intervention, Comparison, Outcome) from a research objective and research questions.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    prompt_content = f"""
    Given the research objective: '{objective}' and the research questions: {', '.join(research_questions)}, 
    extract the key elements based on the PICO framework.

    **PICO Elements to Extract:**
    - **Population (P):** The target group, disease, or subject being studied.
    - **Intervention (I):** The treatment, action, or exposure being investigated.
    - **Comparison (C):** The control, alternative treatment, or placebo.
    - **Outcome (O):** The measurable effects, results, or findings.

    **Output Format (STRICT JSON, no explanations):**
    {{
      "Population": ["example1", "example2"],
      "Intervention": ["example1", "example2"],
      "Comparison": ["example1", "example2"],
      "Outcome": ["example1", "example2"]
    }}
    """

    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are an AI assistant that extracts PICO elements for systematic literature reviews."},
            {"role": "user", "content": prompt_content}
        ],
        "temperature": 0.5
    }

    response = requests.post(
        "https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

    if response.status_code == 200:
        result = response.json()
        extracted_pico = result['choices'][0]['message']['content']

        try:
            # Ensure the response is a valid JSON format
            extracted_pico = re.search(
                r"\{.*\}", extracted_pico, re.DOTALL).group(0)
            # Convert JSON string to dictionary
            pico_dict = json.loads(extracted_pico)
            return pico_dict
        except (json.JSONDecodeError, AttributeError):
            print("❌ Failed to parse valid JSON from response.")
            print(f"Raw API Response:\n{extracted_pico}")  # Debugging output
            return {"error": "Invalid PICO response format"}
    else:
        print(f"❌ OpenAI API Error: {response.status_code}")
        print(response.text)
        return {"error": "Failed to extract PICO elements"}

#research questions: {', '.join(research_questions)}, 

def extract_elements_by_strategy(objective, research_questions, model, search_strategy):
    """
    Extracts key elements based on the selected search strategy (PICO, SPIDER, etc.).
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    prompt_content = f"""
    Given the research objective: '{objective}' 
    Research Questions: {json.dumps(research_questions, indent=2)}
    extract the key elements based on the **{search_strategy}** framework.

    **{search_strategy} Elements:**
    - If {search_strategy} is **PICO**, extract Population, Intervention, Comparison, and Outcome.
    - If {search_strategy} is **SPIDER**, extract Sample, Phenomenon of Interest, Design, Evaluation, and Research type.
    - If {search_strategy} is **PEO**, extract Population, Exposure, and Outcome.
    - If {search_strategy} is **Other**, extract relevant components based on the research context.

    **Output Format (STRICT JSON, no explanations):**
    {{
      "Component1": ["example1", "example2"],
      "Component2": ["example1", "example2"],
      "Component3": ["example1", "example2"],
      "Component4": ["example1", "example2"]
    }}
    """

    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": f"You are an AI assistant that extracts elements for the {search_strategy} research framework."},
            {"role": "user", "content": prompt_content}
        ],
        "temperature": 0.5
    }

    response = requests.post(
        "https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

    if response.status_code == 200:
        result = response.json()
        extracted_elements = result['choices'][0]['message']['content']

        try:
            # Ensure the response is valid JSON
            extracted_elements = re.search(
                r"\{.*\}", extracted_elements, re.DOTALL).group(0)
            # Convert JSON string to dictionary
            elements_dict = json.loads(extracted_elements)
            return elements_dict
        except (json.JSONDecodeError, AttributeError):
            print("❌ Failed to parse valid JSON from response.")
            # Debugging output
            print(f"Raw API Response:\n{extracted_elements}")
            return {"error": f"Invalid {search_strategy} response format"}
    else:
        print(f"❌ OpenAI API Error: {response.status_code}")
        print(response.text)
        return {"error": f"Failed to extract {search_strategy} elements"}


def generate_search_string_with_gpt(objective, research_questions, model, search_strategy):
    """
    Generates a search string based on the selected search strategy (PICO, SPIDER, etc.).
    """

    # Step 1: Extract relevant elements based on the search strategy
    extracted_elements = extract_elements_by_strategy(
        objective, research_questions, model, search_strategy)

    if "error" in extracted_elements:
        return f"Failed to extract {search_strategy} elements. Search query generation aborted."

    # Step 2: Construct search query based on extracted elements
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    keywords = extract_keywords(objective, research_questions, model)

    # Step 3: Build a dynamic prompt for query generation
    prompt_content = f"""
    Given the research objective: '{objective}',
    research questions: {', '.join(research_questions)},
    Given these keywords: {keywords}, 
    generate a compact, Scopus-compatible search string using the **{search_strategy}** framework.

    **Extracted {search_strategy} Elements:**
    {json.dumps(extracted_elements, indent=2)}

    **Search Query Instructions:**
    - Use only relevant **keywords**, not full phrases.
    - Each term should be **1–2 words** only (e.g., `"bias"`, `"media"`), no long phrases.
    - Use logical operators `AND`, `OR`, and grouping with `()`.
    - Use **double quotes** only around short phrases (not full sentences).
    - **Avoid:** stopwords (e.g., "the", "in", "on"), special characters, or sentence fragments.
    - Do **not exceed 200 characters** total.
    - Return only the query string in the format:

    Example:
    ("AI" OR "machine learning") AND ("bias" OR "media" OR "framing")
    """
    
    system_msg = {
    "role": "system",
    "content": f"""
        You are an expert in constructing Scopus-compatible search queries.
        Rules:
        - ALWAYS include critical keywords from the research objective, questions.
        - Each research question or purpose must contribute at least one keyword.
        - Allow multi-word technical terms up to 3–4 words if they represent standard concepts
        (e.g., "systematic literature review", "natural language processing").
        - Do not drop domain-specific terminology, even if it makes the query longer.
        - Use logical operators (AND/OR) and grouping properly.
        - Keep total query length under 100 characters.
        """
    }

    data = {
        "model": model,
        "messages": [
            system_msg,
            {"role": "user", "content": prompt_content}
        ],
        "temperature": 0.7
    }

    response = requests.post(
        "https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

    if response.status_code == 200:
        result = response.json()
        content = result['choices'][0]['message']['content']
        print(f"Generated Query ({search_strategy}): {content}")

        # Extract and clean the search query
        raw_search_string = extract_search_string(content)
        cleaned = clean_query_terms(raw_search_string)
        simplified = simplify_search_query(cleaned)

        print("Simplified Query:", simplified)
        return simplified.strip()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return f"An error occurred while generating the {search_strategy} search string."


def extract_search_string(response_text):
    lines = response_text.strip().split("\n")
    for line in lines:
        if line.startswith("(") and ")" in line:
            return line
    return response_text.strip()

def clean_query_terms(query, max_words=3):
    terms = re.findall(r'"(.*?)"', query)
    clean_terms = [t for t in terms if len(t.split()) <= max_words]
    for t in terms:
        if t not in clean_terms:
            query = query.replace(f'"{t}"', '')
    return query

def simplify_search_query(query, max_groups=3):
    """
    Keep up to max_groups OR groups joined with AND.
    """
    or_groups = re.findall(r'\(([^()]+ OR [^()]+)\)', query)
    if len(or_groups) >= max_groups:
        return " AND ".join(f'({grp})' for grp in or_groups[:max_groups])
    elif len(or_groups) > 0:
        return " AND ".join(f'({grp})' for grp in or_groups)
    else:
        return query

def refine_search_string_with_gpt(search_string, feedback, model):
    """
    Uses GPT to refine an existing search string based on user feedback.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    prompt_content = f"""
    You are an expert in refining literature search queries. Given the current search string:

    **Current Search String:**
    {search_string}

    And the following user feedback:
    "{feedback}"

    Please refine the search string while maintaining correct Boolean logic (`AND`, `OR`), logical grouping (parentheses), and academic search standards.

    **Guidelines:**
    - Modify terms based on user feedback.
    - Ensure the refined query remains properly structured for academic databases.
    - Use `OR` for synonyms and `AND` for must-have terms.
    - **Output ONLY the refined search string in parentheses** (no explanations).
    """

    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are an expert in search query formulation and refinement."},
            {"role": "user", "content": prompt_content}
        ],
        "temperature": 0.5
    }

    response = requests.post(
        "https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

    if response.status_code == 200:
        result = response.json()
        refined_query = extract_search_string(
            result['choices'][0]['message']['content'])
        return refined_query.strip()
    else:
        return "Error refining search string."

def extract_keywords(objective, research_questions, model):
    prompt = f"""
    Extract the MOST important keywords (1–4 words each) from the following text:

    Objective: {objective}

    Research Questions: {json.dumps(research_questions, indent=2)}

    Return ONLY a JSON list of keywords, like this:
    ["keyword1", "keyword2", "keyword phrase3"]
    """
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are an expert keyword extractor for academic search queries."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3
    }

    response = requests.post("https://api.openai.com/v1/chat/completions",
                             headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                             data=json.dumps(data))
    return response.json()["choices"][0]["message"]["content"]
