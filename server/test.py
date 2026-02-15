import requests
import json

OLLAMA_URL = "http://86.50.169.115:11434/api/chat"

def ask_deepseek(prompt):
    payload = {
        "model": "deepseek-r1:1.5b",  # Make sure this is the exact model name
        "messages": [{"role": "user", "content": prompt}],
        "stream": True  # <- important!
    }

    response = requests.post(OLLAMA_URL, json=payload, stream=True)
    
    if response.status_code != 200:
        raise Exception(f"Error: {response.status_code}\n{response.text}")

    # Read streamed chunks
    full_response = ""
    for line in response.iter_lines():
        if line:
            try:
                chunk = line.decode('utf-8')
                json_data = json.loads(chunk)
                full_response += json_data.get("message", {}).get("content", "")
            except Exception as e:
                print(f"Skipping line due to error: {e}\n{line}")

    return full_response

    
response = ask_deepseek("Tell me about llm. also give some paper reference")
print(response)