# agents2.py
import requests
import json
import os
import re
key = os.getenv("API-KEY")
api_key = key

# def extract_search_string(content):
#     possible_operators = ['AND', 'OR', 'NOT', '"']
#     for line in content.split('\n'):
#         if any(op in line for op in possible_operators):
#             return line
#     return content

# def generate_search_string_with_gpt(objective, research_questions, model):
#     """
#     Generates a search string using OpenAI's API based on a research objective and questions.
#     """
#     headers = {
#         "Authorization": f"Bearer {api_key}",
#         "Content-Type": "application/json"
#     }
    
#     # Updated prompt with explicit instructions for using logical operators
#     combined_prompt = f"""
#     Given the research objective: '{objective}', and the following research questions: {', '.join(research_questions)}, 
#     generate concise search strings for identifying relevant literature for a literature review. 
#     Use logical operators like AND, OR group terms meaningfully:
#     - Use `AND` to combine different concepts.
#     - Use `OR` to group synonyms or alternative terms in parentheses.
#     - Use only two words with one `OR`.
#     - Enclose terms in double quotes.
#     Ensure the output follows this format:
#     ("term1" OR "term2") AND ("term3" OR "term4")
#     """
    
#     data = {
#         "model": model,
#         "messages": [
#             {"role": "system", "content": "You are an expert in generating search strings for research purposes."},
#             {"role": "user", "content": combined_prompt}
#         ],
#         "temperature": 0.7
#     }
    
#     # Send request to OpenAI API
#     response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))
    
#     if response.status_code == 200:
#         # Parse the response and extract the generated search string
#         result = response.json()
#         content = result['choices'][0]['message']['content']
#         print(f"search content: {content}")
#         search_string = extract_search_string(content)
#         print(f"extract search content: {search_string}")
#         return search_string.strip()
#     else:
#         # Handle errors gracefully
#         print(f"Error: {response.status_code}")
#         print(response.text)
#         return "An error occurred while generating the search string."

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

    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

    if response.status_code == 200:
        result = response.json()
        extracted_pico = result['choices'][0]['message']['content']
        
        try:
            # Ensure the response is a valid JSON format
            extracted_pico = re.search(r"\{.*\}", extracted_pico, re.DOTALL).group(0)
            pico_dict = json.loads(extracted_pico)  # Convert JSON string to dictionary
            return pico_dict
        except (json.JSONDecodeError, AttributeError):
            print("❌ Failed to parse valid JSON from response.")
            print(f"Raw API Response:\n{extracted_pico}")  # Debugging output
            return {"error": "Invalid PICO response format"}
    else:
        print(f"❌ OpenAI API Error: {response.status_code}")
        print(response.text)
        return {"error": "Failed to extract PICO elements"}

def extract_elements_by_strategy(objective, research_questions, model, search_strategy):
    """
    Extracts key elements based on the selected search strategy (PICO, SPIDER, etc.).
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    prompt_content = f"""
    Given the research objective: '{objective}' and the research questions: {', '.join(research_questions)}, 
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

    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

    if response.status_code == 200:
        result = response.json()
        extracted_elements = result['choices'][0]['message']['content']
        
        try:
            # Ensure the response is valid JSON
            extracted_elements = re.search(r"\{.*\}", extracted_elements, re.DOTALL).group(0)
            elements_dict = json.loads(extracted_elements)  # Convert JSON string to dictionary
            return elements_dict
        except (json.JSONDecodeError, AttributeError):
            print("❌ Failed to parse valid JSON from response.")
            print(f"Raw API Response:\n{extracted_elements}")  # Debugging output
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
    extracted_elements = extract_elements_by_strategy(objective, research_questions, model, search_strategy)

    if "error" in extracted_elements:
        return f"Failed to extract {search_strategy} elements. Search query generation aborted."

    # Step 2: Construct search query based on extracted elements
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Step 3: Build a dynamic prompt for query generation
    prompt_content = f"""
    Given the research objective: '{objective}' and the following research questions: {', '.join(research_questions)}, 
    generate a structured search string using the **{search_strategy}** framework.

    **Extracted {search_strategy} Elements:**
    {json.dumps(extracted_elements, indent=2)}

    **Search Query Requirements:**
    - Use logical operators: `AND`, `OR`, and parentheses for grouping.
    - Use `"double quotes"` for exact phrases.
    - Ensure the query is structured according to the {search_strategy} methodology.
    - The search string should be clear, concise, and suitable for academic literature databases.

    **Example Output Format:**
    ("Term1" OR "Term2") AND ("Term3" OR "Term4") AND ("Term5" OR "Term6")
    """

    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": f"You are an expert in formulating precise literature search queries using the {search_strategy} method."},
            {"role": "user", "content": prompt_content}
        ],
        "temperature": 0.7
    }

    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

    if response.status_code == 200:
        result = response.json()
        content = result['choices'][0]['message']['content']
        print(f"Generated Query ({search_strategy}): {content}")

        # Extract and clean the search query
        search_string = extract_search_string(content)
        print(f"Formatted Query: {search_string}")

        return search_string.strip()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return f"An error occurred while generating the {search_strategy} search string."
    
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

    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

    if response.status_code == 200:
        result = response.json()
        refined_query = extract_search_string(result['choices'][0]['message']['content'])
        return refined_query.strip()
    else:
        return "Error refining search string."

# def generate_search_string_with_gpt(objective, research_questions, model, search_strategy):
#     """
#     Generates a structured PICO-based search string by first extracting PICO elements and then generating a search query.
#     """
#     # First, extract PICO elements from the objective and research questions
#     pico_elements = extract_pico_elements(objective, research_questions, model)

#     if "error" in pico_elements:
#         return "Failed to extract PICO elements. Search query generation aborted."

#     # Extract PICO components
#     population = pico_elements.get("Population", [])
#     intervention = pico_elements.get("Intervention", [])
#     comparison = pico_elements.get("Comparison", [])
#     outcome = pico_elements.get("Outcome", [])

#     headers = {
#         "Authorization": f"Bearer {api_key}",
#         "Content-Type": "application/json"
#     }

#     # Construct the prompt with extracted PICO elements
#     prompt_content = f"""
#     Given the research objective: '{objective}' and the following research questions: {', '.join(research_questions)}, 
#     generate a structured search string using the PICO method.

#     **PICO Breakdown:**
#     - **Population (P):** {', '.join(population)}
#     - **Intervention (I):** {', '.join(intervention)}
#     - **Comparison (C):** {', '.join(comparison)}
#     - **Outcome (O):** {', '.join(outcome)}

#     **Search Query Requirements:**
#     - Use logical operators: `AND`, `OR`, and parentheses for grouping.
#     - Use `"double quotes"` for exact phrases.
#     - Include `OR` for synonyms or alternative terms inside parentheses.
#     - Ensure the search query is no to big or complex.
#     - Ensure all four PICO components are integrated into the query.

#     **Example Output Format:**
#     ("Population1" OR "Population2") AND ("Intervention1" OR "Intervention2") AND 
#     ("Comparison1" OR "Comparison2") AND ("Outcome1" OR "Outcome2")
#     """

#     data = {
#         "model": model,
#         "messages": [
#             {"role": "system", "content": "You are an expert in formulating precise literature search queries using the PICO method."},
#             {"role": "user", "content": prompt_content}
#         ],
#         "temperature": 0.7
#     }

#     response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

#     if response.status_code == 200:
#         result = response.json()
#         content = result['choices'][0]['message']['content']
#         print(f"Generated Query: {content}")

#         # Extract and clean the search query
#         search_string = extract_search_string(content)
#         print(f"Formatted Query: {search_string}")

#         return search_string.strip()
#     else:
#         print(f"Error: {response.status_code}")
#         print(response.text)
#         return "An error occurred while generating the PICO search string."

def extract_search_string(response_text):
    """
    Extracts the structured search string from the response text.
    """
    match = re.search(r'\(.*\)', response_text, re.DOTALL)
    return match.group(0) if match else response_text