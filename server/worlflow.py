from langgraph.graph import StateGraph
from typing import Dict, List, TypedDict
from agents import (
    generate_research_questions_and_purpose_with_gpt,
    generate_abstract_with_openai,
    generate_summary_conclusion,
    generate_introduction_summary_with_openai,
    generate_research_objective_with_gpt
)
from agents2 import generate_search_string_with_gpt
from agents3 import fetch_papers
from agents4 import filter_papers_with_gpt_turbo


# Use TypedDict to define the structure of the state
class ResearchState(TypedDict):
    prompt: str
    model: str
    objective: str
    research_questions: List[str]
    search_string: str
    fetched_papers: List[str]
    filtered_papers: List[str]
    abstract: str
    conclusion: str
    introduction: str

# Define steps (returning dictionaries)
def generate_objective(state: ResearchState) -> ResearchState:
    objective = generate_research_objective_with_gpt(state["prompt"], state["model"])
    print(f"objective: {objective}")
    return {**state, "objective": objective}

def generate_questions(state: ResearchState) -> ResearchState:
    research_questions = generate_research_questions_and_purpose_with_gpt(state["objective"], 3, state["model"])
    print(f"questions: {research_questions}")
    return {**state, "research_questions": research_questions}

def generate_search_string(state: ResearchState) -> ResearchState:
    search_string = generate_search_string_with_gpt(state["objective"], state["research_questions"], state["model"])
    print(f"search string: {search_string}")
    return {**state, "search_string": search_string}

def fetch_papers_step(state: ResearchState) -> ResearchState:
    fetched_papers = fetch_papers(state["search_string"])
    return {**state, "fetched_papers": fetched_papers}

def filter_papers_step(state: ResearchState) -> ResearchState:
    filtered_papers = filter_papers_with_gpt_turbo(state["search_string"], state["fetched_papers"], state["model"])
    return {**state, "filtered_papers": filtered_papers}

def generate_abstract_step(state: ResearchState) -> ResearchState:
    prompt = f"Generate an abstract based on research questions {state['research_questions']}, objective {state['objective']}, and search string {state['search_string']}."
    abstract = generate_abstract_with_openai(prompt, state["model"])
    return {**state, "abstract": abstract}

def generate_conclusion_step(state: ResearchState) -> ResearchState:
    conclusion = generate_summary_conclusion(state["filtered_papers"])
    return {**state, "conclusion": conclusion}

def generate_introduction_step(state: ResearchState) -> ResearchState:
    prompt = f"This document synthesizes {len(state['filtered_papers'])} papers. Objective: {state['objective']}. Findings: {state['abstract']}"
    introduction = generate_introduction_summary_with_openai(prompt, state["model"])
    return {**state, "introduction": introduction}

# Create the graph
graph = StateGraph(ResearchState)

# Add nodes
graph.add_node("generate_objective", generate_objective)
graph.add_node("generate_questions", generate_questions)
graph.add_node("generate_search_string", generate_search_string)
graph.add_node("fetch_papers", fetch_papers_step)
graph.add_node("filter_papers", filter_papers_step)
graph.add_node("generate_abstract", generate_abstract_step)
graph.add_node("generate_conclusion", generate_conclusion_step)
graph.add_node("generate_introduction", generate_introduction_step)

# Set the entry point
graph.set_entry_point("generate_objective")

# Define edges
graph.add_edge("generate_objective", "generate_questions")
graph.add_edge("generate_questions", "generate_search_string")
graph.add_edge("generate_search_string", "fetch_papers")
graph.add_edge("fetch_papers", "filter_papers")
graph.add_edge("filter_papers", "generate_abstract")
graph.add_edge("generate_abstract", "generate_conclusion")
graph.add_edge("generate_conclusion", "generate_introduction")

# Compile the graph
research_workflow = graph.compile()
