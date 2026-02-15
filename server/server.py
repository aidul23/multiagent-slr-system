from dotenv import load_dotenv
import os
from flask import Flask, render_template, send_file, send_from_directory, request, jsonify
import datetime
from agents import generate_research_questions_and_purpose_with_gpt, generate_abstract_with_openai, generate_summary_conclusion, generate_introduction_summary_with_openai, generate_research_objective_with_gpt, generate_research_report
import json
from agents2 import generate_search_string_with_gpt, refine_search_string_with_gpt
from agents3 import fetch_papers, save_papers_to_csv, search_elsevier, search_arxiv, search_ieee_xplore, search_semantic_scholar
from agents4 import filter_papers_with_gpt_turbo, generate_response_gpt4_turbo, extract_structured_data_from_ai
from flask_cors import CORS, cross_origin # type: ignore
from rag_engine import query_rag_system
from datetime import datetime
from flask_socketio import SocketIO, emit # type: ignore
from worlflow import research_workflow, ResearchState
from flask_pymongo import PyMongo
from bson import ObjectId
import fitz
import csv
import pandas as pd
import json
from pdf_utils import extract_text_from_pdf
from embedding_utils import generate_embeddings_from_text
import numpy as np
import faiss
from openai import OpenAI
import shutil
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from deep_researcher import run_deepresearch_fallback

load_dotenv()

openai_key = os.getenv("API-KEY")
api_key = openai_key

key = os.getenv("ELSEVIER_API_KEY")

client = OpenAI(api_key = api_key)

app = Flask(__name__, static_folder='dist')
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
db = SQLAlchemy(app)

# User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

# Initialize the database
with app.app_context():
    db.create_all()

# MongoDB configuration
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
mongo = PyMongo(app)

users_collection = mongo.db.users
projects_collection = mongo.db.projects

print("MongoDB connection established successfully!")

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'User already exists'}), 400

    hashed_pw = generate_password_hash(password)
    new_user = User(name=name, email=email, password=hashed_pw)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({
    'message': 'User registered successfully',
    'user': {
        'id': str(new_user.id),  # 👈 Add this and convert to string
        'name': name,
        'email': email
    }
})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({'error': 'Invalid credentials'}), 401

    return jsonify({
        'message': 'Login successful',
        'user': {
            'id': str(user.id),  # 👈 Add this
            'name': user.name,
            'email': user.email
        }
    })


UPLOAD_FOLDER = "uploads"
CSV_FILE = "extracted_data.csv"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Store uploaded files with record metadata
uploaded_files = {}
extracted_data_store = {}
EXTRACTED_DATA_FILE = "./extracted_data.json"
DATA_FILE = "extracted_data.json"

if os.path.exists(EXTRACTED_DATA_FILE):
    with open(EXTRACTED_DATA_FILE, "r", encoding="utf-8") as f:
        try:
            extracted_data_store = json.load(f)
            print(f"✅ Loaded extracted data for {len(extracted_data_store)} projects")
        except json.JSONDecodeError:
            print("⚠️ Failed to parse extracted_data.json")


@app.route("/api/create_project", methods=["POST"])
def create_project():
    try:
        data = request.json
        user_id = str(data.get("user_id"))  # force conversion to string
        project_name = data.get("project_name")
        description = data.get("description")
        review_type = data.get("review_type")

        if not user_id or not project_name or not review_type:
            return jsonify({"error": "Missing required fields"}), 400

        project = {
            "user_id": user_id,
            "project_name": project_name,
            "description": description,
            "review_type": review_type,
            "created_at": mongo.db.command("serverStatus")["localTime"]  # Auto timestamp
        }

        result = projects_collection.insert_one(project)

        project_id = str(result.inserted_id)

        return jsonify({
        "project_id": project_id,
        "project_name": project_name,
        "description": description,
        "review_type": review_type,
        "user_id": user_id,
        "created_at": project["created_at"]
    }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/delete_project/<project_id>", methods=["DELETE"])
def delete_project(project_id):
    try:
        # Delete from MongoDB
        result = projects_collection.delete_one({"_id": ObjectId(project_id)})

        if result.deleted_count == 0:
            return jsonify({"error": "Project not found"}), 404

        # Optionally remove local folders related to the project
        local_folders = ["uploads", "data", "dataembedding"]
        for folder in local_folders:
            project_path = os.path.join(folder, project_id)
            if os.path.exists(project_path):
                shutil.rmtree(project_path)

        return jsonify({"message": "Project deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/api/confirm_questions", methods=["POST"])
def confirm_questions():
    try:
        # Get data from the request
        data = request.json
        project_id = data.get("project_id")
        questions = data.get("questions")
        objective = data.get("objective")

        # Validate input
        if not project_id or not questions or not objective:
            return jsonify({"error": "Missing required fields"}), 400

        # Ensure each question has a corresponding purpose
        #for item in questions:
            #if "question" not in item or "purpose" not in item:
                #return jsonify({"error": "Each item must have both a question and a purpose"}), 400

        # Find the project by ID and update the confirmed_questions field
        result = projects_collection.update_one(
            {"_id": ObjectId(project_id)},  # Use ObjectId to query the project
            {"$set": {"questions": questions, "objective": objective}}  # Set the array of question and purpose objects
        )

        # Check if the project was found and updated
        if result.matched_count == 0:
            return jsonify({"error": "Project not found"}), 404

        return jsonify({
            "message": "Questions confirmed successfully",
            "project_id": project_id,
            "questions": questions,
            "objective": objective

        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/get_projects", methods=["GET"])
def get_projects():
    try:
        user_id = request.args.get("user_id")  # Get user_id from query params

        if not user_id:
            return jsonify({"error": "Missing user_id parameter"}), 400

        # Find all projects associated with the given user_id
        projects = list(projects_collection.find({"user_id": user_id}))

        for project in projects:
            project['project_id'] = str(project['_id'])  # Add project_id field
            del project['_id']  # Optionally remove _id field

        return jsonify({"projects": projects}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/get_project/<project_id>", methods=["GET"])
def get_project(project_id):
    try:
        # Find the project by ID
        project = projects_collection.find_one({"_id": ObjectId(project_id)})

        if not project:
            return jsonify({"error": "Project not found"}), 404

        # Convert ObjectId to string
        project['project_id'] = str(project['_id'])
        del project['_id']  # Remove MongoDB ObjectId field

        return jsonify({"project": project}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def save_data_to_json():
    """Saves extracted_data_store to a JSON file."""
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(extracted_data_store, f, indent=4)

def load_data_from_json():
    """Loads extracted_data_store from a JSON file if it exists."""
    global extracted_data_store
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            extracted_data_store = json.load(f)
    else:
        extracted_data_store = {}

@app.route("/api/get_csv", methods=["GET"])
def get_csv():
    """Returns a list of CSV files for a given projectId."""
    project_id = request.args.get("project_id")

    if not project_id:
        return jsonify({"error": "Project ID is required"}), 400

    project_path = os.path.join("data", project_id)

    if not os.path.exists(project_path):
        return jsonify({"error": "No data found for this project"}), 404

    files = [f for f in os.listdir(project_path) if f.endswith(".csv")]
    return jsonify({"files": files})

@app.route("/api/download_csv", methods=["GET"])
def download_csv():
    """Allows users to download a CSV file."""
    project_id = request.args.get("project_id")
    file_name = request.args.get("file_name")

    if not project_id or not file_name:
        return jsonify({"error": "Project ID and File Name are required"}), 400

    project_path = os.path.join("data", project_id)

    if not os.path.exists(os.path.join(project_path, file_name)):
        return jsonify({"error": "File not found"}), 404

    return send_from_directory(project_path, file_name, as_attachment=True)

def generate_embedding(text, model="text-embedding-ada-002"):
    response = client.embeddings.create(input=text,
    model=model)
    return response.data[0].embedding

@app.route("/api/upload_pdf", methods=["POST"])
def upload_pdf():
    if "pdf" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["pdf"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Metadata
    project_id = request.form.get("project_id", "default_project")

    # Save file
    project_folder = os.path.join(UPLOAD_FOLDER, project_id)
    os.makedirs(project_folder, exist_ok=True)
    file_path = os.path.join(project_folder, file.filename)
    file.save(file_path)

    # Step 1: Extract structured data using your existing logic
    structured_data = extract_structured_data_from_ai(file_path)

    # Step 2: Extract raw text (OCR or PyMuPDF)
    raw_text = extract_text_from_pdf(file_path)

    # Step 3: Generate embeddings
    all_embeddings, chunk_names, chunk_texts = generate_embeddings_from_text(raw_text, prefix=file.filename)

    if not all_embeddings:
        return jsonify({"error": "Failed to generate embeddings"}), 500

    # Step 4: Save embeddings (can be enhanced to append to FAISS index)
    embed_dir = os.path.join("dataembedding", project_id)
    os.makedirs(embed_dir, exist_ok=True)

    embeddings_np = np.array(all_embeddings).astype('float32')
    chunk_names_np = np.array(chunk_names)

    np.save(os.path.join(embed_dir, f"{file.filename}_embeddings.npy"), embeddings_np)
    np.save(os.path.join(embed_dir, f"{file.filename}_chunks.npy"), chunk_names_np)

    index = faiss.IndexFlatL2(embeddings_np.shape[1])
    index.add(embeddings_np)
    faiss.write_index(index, os.path.join(embed_dir, f"{file.filename}_faiss.index"))

    # Save to in-memory store if needed
    if project_id not in extracted_data_store:
        extracted_data_store[project_id] = []
    extracted_data_store[project_id].append(structured_data)
    save_data_to_json()

    return jsonify({
        "message": "File uploaded, processed, and embedded successfully!",
        "data": structured_data,
        "filename": file.filename,
        "project_id": project_id
    })

@app.route('/api/uploads/<project_id>/<filename>')
def uploaded_file(project_id, filename):
    return send_from_directory(os.path.join(UPLOAD_FOLDER, project_id), filename)

@app.route("/api/list_uploaded_pdfs/<project_id>", methods=["GET"])
def list_uploaded_pdfs(project_id):
    folder_path = os.path.join(UPLOAD_FOLDER, project_id)
    if not os.path.exists(folder_path):
        return jsonify([])  # No files yet

    pdfs = [
        f for f in os.listdir(folder_path)
        if f.lower().endswith(".pdf") and os.path.isfile(os.path.join(folder_path, f))
    ]
    return jsonify(pdfs)

def save_to_csv(data_list, project_id):
    """Saves extracted data to a CSV file."""
    folder_path = os.path.join("data", project_id)
    os.makedirs(folder_path, exist_ok=True)  # Ensure folder exists
    csv_file = os.path.join(folder_path, f"extracted_data.csv")

    # Open the CSV file in append mode ('a') so that new rows are added without overwriting
    with open(csv_file, "a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)

        # If file is empty (no header written), write the header first
        if file.tell() == 0:
            writer.writerow(["Title", "Abstract", "Year", "Publisher", "Authors", "DOI"])

        # Convert list elements to strings if they are lists
        formatted_data = [str(item) if isinstance(item, list) else item for item in data_list]

        # Write extracted data as a new row
        writer.writerow(formatted_data)

@app.route("/api/extract_data", methods=["POST"])
def extract_data():
    data = request.get_json()
    project_id = data.get("project_id", "default_project")
    print(f"Extracting for project: {project_id}")

    if project_id not in extracted_data_store:
        return jsonify({"error": "No extracted data found for the given project ID"}), 404

    structured_data_list = extracted_data_store[project_id]

    if not structured_data_list:
        return jsonify({"error": "No extracted data available in the list"}), 400

    for structured_data in structured_data_list:
        save_to_csv([
            structured_data.get("title", "Unknown Title"),
            structured_data.get("abstract", ""),
            structured_data.get("year", "Unknown Year"),
            structured_data.get("publisher", "Unknown Publisher"),
            structured_data.get("authors", "Unknown Author"),
            structured_data.get("doi", "N/A"),
        ], project_id)

    return jsonify({
        "message": "Data extracted and saved to CSV successfully!",
        "data": structured_data_list,
        "project_id": project_id
    })

# deprecated
@app.route("/api/list_pdfs", methods=["GET"])
def list_pdfs():
    """Lists existing PDFs for a given projectId."""
    project_id = request.args.get("project_id")  # Get project_id from query params

    if not project_id:
        return jsonify({"error": "Project ID is required"}), 400

    project_folder = os.path.join(UPLOAD_FOLDER, project_id)

    if not os.path.exists(project_folder):
        return jsonify({"files": []})  # No files if folder doesn't exist

    # Get list of PDF files
    pdf_files = [f for f in os.listdir(project_folder) if f.endswith(".pdf")]

    return jsonify({"files": pdf_files})

@app.route("/api/delete_pdf", methods=["DELETE"])
def delete_pdf():
    """Deletes a specific PDF file for a given projectId."""
    project_id = request.args.get("project_id")
    file_name = request.args.get("file_name")

    if not project_id or not file_name:
        return jsonify({"error": "Project ID and File Name are required"}), 400

    file_path = os.path.join(UPLOAD_FOLDER, project_id, file_name)

    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    try:
        os.remove(file_path)

        # Remove document entry from MongoDB
        # result = projects_collection.update_one(
        #     {"_id": ObjectId(project_id)},
        #     {"$pull": {"documents": {"file_name": file_name}}}
        # )

        # if result.modified_count == 0:
        #     return jsonify({
        #         "message": f"File deleted locally, but no matching document found in DB for '{file_name}'"
        #     })

        return jsonify({"message": f"{file_name} deleted successfully from both local and database!"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/generate_report", methods=["POST"])
def generate_ai_report():
    """API endpoint to generate a research report based on extracted data."""
    data = request.json
    project_id = data.get("project_id")
    research_questions = data.get("research_questions", [])
    objective = data.get("objective", "")
    model="gpt-4o"

    if not project_id:
        return jsonify({"error": "Project ID is required"}), 400
    if not research_questions or not isinstance(research_questions, list):
        return jsonify({"error": "Valid research questions are required"}), 400

    # Call function from agents.py
    report_result = generate_research_report(project_id, research_questions, objective, model)

    return jsonify(report_result)

@app.route("/api/refine_report", methods=["POST"])
def refine_report():
    data = request.json
    existing_report = data.get("existing_report")
    user_feedback = data.get("refinement_prompt")

    if not existing_report or not user_feedback:
        return jsonify({"error": "Existing report and feedback are required"}), 400

    from agents import refine_research_report
    result = refine_research_report(existing_report, user_feedback)

    return jsonify({ "report": result })

# Compile the graph

@app.route('/api/run_workflow', methods=['POST'])
def run_workflow():
    data = request.json
    prompt = data.get('prompt', '')
    model = data.get('model', 'gpt-3.5-turbo')

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    # Initialize the state as a dictionary
    initial_state = {
        "prompt": prompt,
        "model": model,
        "objective": None,
        "research_questions": [],
        "search_string": None,
        "fetched_papers": [],
        "filtered_papers": [],
        "abstract": None,
        "conclusion": None,
        "introduction": None
    }

    # Run the workflow
    try:
        final_state = research_workflow.invoke(initial_state)
    except Exception as e:
        # Log the error message for debugging
        print(f"Error occurred during workflow: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

    # Return the results
    return jsonify({
        "objective": final_state.get("objective"),
        "research_questions": final_state.get("research_questions"),
        "search_string": final_state.get("search_string"),
        "fetched_papers": final_state.get("fetched_papers"),
        "filtered_papers": final_state.get("filtered_papers"),
        "abstract": final_state.get("abstract"),
        "conclusion": final_state.get("conclusion"),
        "introduction": final_state.get("introduction")
    })

@app.route('/api/generate_objective', methods=['POST'])
def generate_objective_route():
    """
    Flask route to generate a research objective based on user instructions.
    """
    data = request.json
    user_prompt = data.get('prompt')  # User-provided input
    model = data.get('model', 'gpt-3.5-turbo')  # Default model

    if not user_prompt:
        return jsonify({"error": "User prompt is required"}), 400
    if not model:
        return jsonify({"error": "Model is required"}), 400

    objective_response = generate_research_objective_with_gpt(user_prompt, model)
    print(f"{objective_response}")
    return jsonify(objective_response)

@app.route('/api/generate_search_string', methods=['POST'])
def generate_search_string_route():
    try:
        data = request.json
        project_id = data.get("project_id")
        objective = data.get('objective')
        research_questions = data.get('research_questions', [])  # Default to an empty list if not provided
        model = data.get('model')
        search_strategy = data.get('search_strategy')

        # Validate input
        if not project_id or not objective or not research_questions:
            return jsonify({"error": "Project ID, objective, and research questions are required."}), 400
        if not model:
            return jsonify({"error": "Model is required"}), 400
        if not search_strategy:
            return jsonify({"error": "Search strategy is required."}), 400

        print(f"{research_questions}")
        
        # Generate search string using AI function
        search_string = generate_search_string_with_gpt(objective, research_questions, model, search_strategy)

        return jsonify({
            "message": "Search string generated successfully",
            "project_id": project_id,
            "search_string": search_string,
            "search_strategy": search_strategy
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/refine_search_string', methods=['POST'])
def refine_search_string_route():
    """
    API to refine an existing search string based on user feedback and update it in the database.
    """
    try:
        data = request.json
        project_id = data.get("project_id")
        current_search_string = data.get("search_string")
        feedback = data.get("feedback")
        model = data.get("model", "gpt-4")  # Default to GPT-4 if not specified

        # Validate input
        if not project_id or not current_search_string or not feedback:
            return jsonify({"error": "Project ID, search string, and feedback are required."}), 400

        # Refine the search string using AI function
        refined_search = refine_search_string_with_gpt(current_search_string, feedback, model)

        # Update the search string in the database
        result = projects_collection.update_one(
            {"_id": ObjectId(project_id)},  # Find project by ID
            {"$set": {"search_string": refined_search}}
        )

        # Check if project was updated
        if result.matched_count == 0:
            return jsonify({"error": "Project not found"}), 404

        return jsonify({
            "message": "Search string refined and updated successfully",
            "project_id": project_id,
            "refined_search_string": refined_search
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate_research_questions_and_purpose', methods=['POST'])
def generate_research_questions_and_purpose():
    print("request:", request.method)
    data = request.json
    objective = data.get('objective')
    #num_questions = int(data.get('num_questions', 1))  # Ensure num_questions is treated as an integer
    model = data.get('model')  # Retrieve the model from the frontend

    # Validate input
    if not objective:
        return jsonify({"error": "Objective is required"}), 400
    #if num_questions < 1:
        #return jsonify({"error": "Number of questions must be at least 1"}), 400
    if not model:
        return jsonify({"error": "Model is required"}), 400

    questions_and_purposes = generate_research_questions_and_purpose_with_gpt(objective, model)
    print(questions_and_purposes)
    return jsonify({"research_questions": questions_and_purposes})

@app.route('/api/filter_papers', methods=['POST'])
def filter_papers_route():
    data = request.json
    search_string = data.get('search_string', '')
    papers = data.get('papers', [])  # Expecting only titles in papers
    model = data.get('model')

    filtered_papers = filter_papers_with_gpt_turbo(search_string, papers, model)
    return jsonify(filtered_papers)


@socketio.on('answer_question')
def handle_answer_question(data):
    questions = data.get('questions')
    papers_info = data.get('papers_info', [])
    model = data.get('model')

    if not questions or not papers_info:
        emit('error', {"error": "Both questions and papers information are required."})
        return

    # Separate papers based on type
    elsevier_papers = [paper for paper in papers_info if paper['type'] == "elsevier"]
    arxiv_papers = [paper for paper in papers_info if paper['type'] == "arxiv"]

    answers = []
    for question in questions:
        # Generate response for Elsevier papers
        if elsevier_papers:
            elsevier_answer = generate_elsevier_gpt4_response(question, elsevier_papers, model)
            answers.append({"question": question, "answer": elsevier_answer, "source": "Elsevier"})

        # Generate response for arXiv papers
        if arxiv_papers:
            arxiv_answer = generate_arxiv_gpt4_response(question, arxiv_papers, model)
            answers.append({"question": question, "answer": arxiv_answer, "source": "arXiv"})

    emit('answers', {"answers": answers})

def generate_elsevier_gpt4_response(question, papers_info, model):
    return generate_response_gpt4_turbo(question, papers_info, model, "Elsevier")

def generate_arxiv_gpt4_response(question, papers_info, model):
    return generate_response_gpt4_turbo(question, papers_info, model, "arXiv")

@app.route("/api/rag_chat", methods=["POST"])
def rag_chat():
    data = request.json
    project_id = data.get("project_id")
    query = data.get("query")

    if not project_id or not query:
        return jsonify({"error": "project_id and query are required"}), 400

    result = query_rag_system(project_id, query)
    return jsonify(result)


@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve(path):
    print("filename:", app.static_folder + "/" + path)
    if path != "" and os.path.exists(app.static_folder + "/" + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/search_papers', methods=['POST', "GET"])
def search_papers():
    data = request.json
    project_id = data.get("project_id")
    search_string = data.get('search_string', '')
    search_strategy = data.get('search_strategy')
    start_year = data.get('start_year', '')
    end_year = data.get('end_year', '')
    limit = data.get('limit', None)  # Default limit to 10 papers if not specified
    is_english = data.get('isEnglish', False)
    is_peer_reviewed = data.get('isPeerReviewed', False)
    is_cited = data.get('isMostCited', False)
    selected_data_sources = data.get('selectedDataSources', [])
    keywords = data.get('keywords', [])

    elsevier_results = []
    semantic_results = []
    arxiv_results = []

    if not search_string or not start_year:
        return jsonify({'error': 'Search string and start year are required.'}), 400
    try:
        limit = int(limit) if limit else 500  # Set max limit if None
    except ValueError:
        limit = 500

    if "Elsevier" in selected_data_sources:
        elsevier_results = search_elsevier(search_string, start_year, end_year, limit, is_english, is_peer_reviewed, keywords, is_cited)
    if "Semantic Scholar" in selected_data_sources:
        semantic_results = search_semantic_scholar(search_string, start_year, end_year, limit, is_english, is_peer_reviewed, keywords)
    if "arXiv" in selected_data_sources:
        arxiv_results = search_arxiv(search_string, start_year, end_year, limit)
    # ieee_xplore_results = search_ieee_xplore(search_string, start_year, end_year, limit)
    
    print(f"elsevier_results: {len(elsevier_results)}")
    print(f"arxiv_results: {len(arxiv_results)}")

    combined_results = [elsevier_results, arxiv_results]
    
    # ✅ Save search string and strategy
    if project_id:
            projects_collection.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": {
                    "search_string": search_string,
                    "search_strategy": search_strategy,
                    "search_confirmed": True
                }}
        )


    return jsonify(combined_results)


@app.route("/api/deep_research", methods=["POST"])
def deep_research():
    try:
        data = request.get_json(force=True)
        objective = data.get("objective","").strip()
        questions = data.get("research_questions", [])
        search_string = data.get("search_string","").strip()
        criteria = data.get("criteria", {})

        if not objective or not questions:
            return jsonify({"error":"objective and research_questions are required"}), 400

        # Prefer MCP if configured, else fallback
        try:
            result = run_deepresearch_fallback(objective, questions, search_string, criteria)
            print(result)
        except Exception as ex:
            # If MCP not available, auto fallback
            result = run_deepresearch_fallback(objective, questions, search_string, criteria)
            print(result)

        # Optional: persist in Mongo under the project
        project_id = data.get("project_id")
        if project_id:
            projects_collection.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": {
                    "deep_research": {
                        #"ran_at": time.time(),
                        "objective": objective,
                        "questions": questions,
                        "search_string": search_string,
                        "criteria": criteria,
                        "report": result.get("report",""),
                        "sources": result.get("sources", []),
                        "subquestions": result.get("subquestions", [])
                    }
                }},
                upsert=False
            )

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Running app
if __name__ == '__main__':
    socketio.run(app,host='0.0.0.0', port=50005, debug=True,allow_unsafe_werkzeug=True)
