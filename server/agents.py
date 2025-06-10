# agents.py
import requests
import json
from flask import jsonify
import os
key = os.getenv("API-KEY")
api_key = key
import csv
import pandas as pd
import re  # Import the regular expressions library

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
        f"You are a helpful assistant capable of generating research questions along with their purposes "
        f"for a systematic literature review.\n"
        f"Given the research objective: '{objective}', generate a list of possible research questions, "
        f"each followed by its specific purpose using phrases like 'To examine' or 'To investigate'."
    )

    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant capable of generating research questions along with their purposes for a systematic literature review."},
            {"role": "user", "content": prompt_content}
        ],
        "temperature": 0.7
    }

    # Send the request to OpenAI API
    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

    if response.status_code == 200:
        result = response.json()
        messages = result['choices'][0]['message']['content']
        
        # Split response into lines, removing empty lines
        lines = [line.strip() for line in messages.strip().split("\n") if line.strip()]

        # List to hold the final formatted questions and purposes
        question_purpose_objects = []

        # Loop through the lines and pair questions and purposes
        for i in range(0, len(lines), 2):
            question_line = lines[i]
            purpose_line = lines[i + 1] if i + 1 < len(lines) else "Purpose not provided"
            
            # Extract the question by removing any number, "Research Question:" and leading spaces
            question = re.sub(r"^\d+\.\s*Research Question:\s*", "", question_line)
            
            # Extract the purpose by cleaning up the "Purpose:" prefix
            purpose = re.sub(r"^Purpose:\s*", "", purpose_line)

            # Add the cleaned-up question and purpose to the list
            question_purpose_objects.append({"question": question.strip(), "purpose": purpose.strip()})

        return {"research_questions": question_purpose_objects}  # Return all cleaned questions and purposes

    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return {"error": "Failed to generate research questions"}


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

def generate_research_report(project_id, research_questions, model="gpt-4"):
    """Generates a research report using OpenAI based on extracted abstracts and research questions."""
    
    project_path = os.path.join("data", project_id)

    if not os.path.exists(project_path):
        return {"error": "No extracted data found for this project"}

    # Load all abstracts from CSV files
    all_abstracts = []
    csv_files = [os.path.join(project_path, f) for f in os.listdir(project_path) if f.endswith(".csv")]

    if not csv_files:
        return {"error": "No CSV files found"}

    for csv_file in csv_files:
        df = pd.read_csv(csv_file)
        if "Abstract" in df.columns:
            all_abstracts.extend(df["Abstract"].dropna().tolist())

    if not all_abstracts:
        return {"error": "No abstracts found in CSV files"}

    # Prepare OpenAI API request
    abstracts_text = "\n\n".join(all_abstracts)
    questions_text = "\n".join([f"- {q}" for q in research_questions])

    prompt_text = f"""
    You are an expert in conducting systematic literature reviews (SLRs). Based on the following collection of paper abstracts, generate a well-structured academic report.

    ### Research Context:
    - These abstracts are from peer-reviewed research papers related to a common topic.

    ### Research Questions:
    {questions_text}

    ### Paper Abstracts:
    {abstracts_text}

    ---

    ### TASK:

    Generate a detailed, structured SLR report using the following format:

    1. **Introduction**
    - Briefly introduce the topic and its relevance.
    - Mention the motivation for conducting this review.

    2. **Research Objectives**
    - State the goals of this SLR based on the provided research questions.

    3. **Summary of Literature**
    - Summarize trends, common themes, and key findings from the abstracts.
    - Mention important techniques, datasets, or insights observed.

    4. **Discussion**
    - Discuss any notable gaps, contradictions, or opportunities identified.
    - Compare methods or results if mentioned.

    5. **Answers to Research Questions**
    - Provide clear, concise answers to each question, labeled as RQ1, RQ2, etc.

    6. **Conclusion**
    - Summarize the insights gained.
    - Suggest future directions or remaining challenges.

    Ensure that your output is academically styled, uses clear headings, and remains concise but comprehensive. Avoid quoting entire abstracts. Instead, synthesize the content to demonstrate insight.
    """

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are an AI research assistant, helping with systematic literature reviews."},
            {"role": "user", "content": prompt_text}
        ],
        "temperature": 0.7
    }

    try:
        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(data))

        if response.status_code == 200:
            result = response.json()
            ai_report = result["choices"][0]["message"]["content"].strip()
            return {"message": "AI-generated research report created successfully!", "report": ai_report}
        else:
            return {"error": f"OpenAI API error: {response.status_code}", "details": response.text}

    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}
    
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
