# agent4.py
import requests
import os
api_key = os.getenv("API-KEY")
import re
import fitz 
import json

def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file."""
    text = ""
    try:
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text += page.get_text("text") + "\n"
    except Exception as e:
        print(f"Error extracting text: {e}")
    return text

def extract_structured_data_from_ai(pdf_path, model="gpt-4o"):
    """Uses GPT-4 to extract structured fields from a PDF file."""
    pdf_text = extract_text_from_pdf(pdf_path)
    
    if not pdf_text.strip():
        return {"error": "No text extracted from PDF."}

    prompt = f"""
    Extract the following structured fields from the given research paper:
    - Title
    - Abstract
    - Year
    - Publisher
    - Authors
    - DOI

    Output the response in JSON format like:
    {{
        "title": "Extracted Title",
        "abstract": "Extracted Abstract",
        "year": "2024",
        "publisher": "Springer",
        "authors": "John Doe, Jane Smith",
        "doi": "10.1234/example-doi"
    }}

    Here is the research paper text:
    {pdf_text[:3000]}  # Limit text length to avoid token overflow
    """

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are an AI assistant that extracts structured data from research papers."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.5,
        "max_tokens": 512
    }
    
    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=data)

    if response.status_code == 200:
        try:
            result = response.json()

            # Clean the response content (remove backticks and newlines)
            raw_content = result['choices'][0]['message']['content']
            clean_content = raw_content.strip('```json\n').strip()  # Remove the backticks and newlines
            
            # Parse the cleaned JSON content
            structured_data = json.loads(clean_content)  # Now it should be a valid dictionary
            
            return structured_data
        except json.JSONDecodeError:
            print("Error parsing AI response:", response.text)
            return {"error": "Failed to parse AI response."}
    else:
        print(f"OpenAI API error: {response.status_code}, Details: {response.text}")
        return {"error": f"OpenAI API error: {response.status_code}", "details": response.text}

def check_paper_relevance_and_keywords(title, search_string, model):
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    # Adjust the prompt to ask for relevance and keywords
    prompt = (f"Determine if the paper titled '{title}' is relevant to the topic '{search_string}'. "
              "and in return just informed paper is relevant or paper is not relevant, to the point.")

    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a knowledgeable assistant."},
            {"role": "user", "content": prompt}
        ]
    }

    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=data)
    if response.status_code == 200:
        result = response.json()
        response_text = result['choices'][0]['message']['content'].strip().lower()
        print(response_text)
        # Check for explicit confirmation of relevance
        if "not relevant" in response_text:
            return False
        else:
            # Assuming the model lists keywords after confirming relevance
            # Extracting keywords from the response assuming they are listed after "key words:" phrase
            return True
    else:
        print(f"Error: {response.status_code}, Detail: {response.text}")
    
    return (False, [])

def filter_papers_with_gpt_turbo(search_string, papers, model):
    filtered_titles = []

    # Check if there are at least two arrays in papers
    if len(papers) >= 2:
        first_array = papers[0]
        second_array = papers[1]

        # Extract titles from the first array
        for paper in first_array:
            title = paper.get('title', '')
            if title and check_paper_relevance_and_keywords(title, search_string, model):
                filtered_titles.append(paper)
        
        # Extract titles from the second array
        for paper in second_array:
            title = paper.get('title', '')
            if title and check_paper_relevance_and_keywords(title, search_string, model):
                filtered_titles.append(paper)
    
    return filtered_titles

def is_response_relevant(response):
    # Define a pattern that matches sentences indicating irrelevance
    irrelevance_pattern = re.compile(r"does not appear to be directly relevant", re.IGNORECASE)
    
    # Define a pattern that matches sentences indicating relevance
    relevance_pattern = re.compile(r"topics related", re.IGNORECASE)
    
    # Check for irrelevance
    if irrelevance_pattern.search(response):
        return False  # Irrelevant based on the matched pattern
    
    # Check for relevance
    if relevance_pattern.search(response):
        return True  # Relevant based on the matched pattern
    
    # If neither pattern is matched, you might decide based on other criteria or default assumption
    return None  # Or False/True based on your default assumption

def generate_response_gpt4_turbo(question, papers_info, model, source_type):
    messages = [{
        "role": "system",
        "content": f'You are a knowledgeable assistant who can answer research questions based on provided {source_type} papers information.'
    }]

    papers_context = "\n".join([f"- Title: '{paper['title']}', Author: {paper['creator']}, Year: {paper['year']}'." for paper in papers_info])
    messages.append({
        "role": "system",
        "content": f"Research Question: {question}\n\nPapers Information:\n{papers_context}"
    })
    
    messages.append({
        "role": "user",
        "content": "Based on the provided papers information, please answer the research question and cite relevant references for cross-verification."
    })
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    data = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 512
    }
    
    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=data, timeout=800)
    
    if response.status_code == 200:
        result = response.json()
        latest_response = result['choices'][0]['message']['content']
        return latest_response
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return "An error occurred while generating the response."