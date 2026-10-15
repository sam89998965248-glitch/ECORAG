
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import json
from pathlib import Path
from datetime import datetime

app = FastAPI(title="EcoRAG API")

# Allow the React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths based on this file's location
BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "ecorag.db"
KNOWLEDGE_FILE = (
    BASE_DIR / "knowledge_base" / "environmental_sources.json"
)


def connect_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def create_table():
    conn = connect_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Submitted',
            created_at TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


create_table()


# Request models
class Complaint(BaseModel):
    name: str
    category: str
    location: str
    description: str


class AnalysisRequest(BaseModel):
    category: str
    location: str
    description: str


class RAGRequest(BaseModel):
    query: str


# Load the local environmental knowledge base
def load_knowledge():
    try:
        with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)

        if not isinstance(data, list):
            raise ValueError("Knowledge base must be a JSON list.")

        return data

    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Knowledge file not found. Check the knowledge_base folder."
        )

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Knowledge JSON is invalid. Check the file content."
        )


@app.get("/")
def home():
    return {
        "project": "EcoRAG",
        "message": "Environmental Complaint Assistant API is running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# Submit a complaint
@app.post("/complaints")
def create_complaint(complaint: Complaint):
    conn = connect_db()

    try:
        cursor = conn.execute("""
            INSERT INTO complaints
            (name, category, location, description, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            complaint.name,
            complaint.category,
            complaint.location,
            complaint.description,
            datetime.now().isoformat(timespec="seconds")
        ))

        complaint_id = cursor.lastrowid
        conn.commit()

        return {
            "message": "Complaint submitted successfully",
            "complaint_id": complaint_id,
            "status": "Submitted"
        }

    finally:
        conn.close()


# View all complaints
@app.get("/complaints")
def get_complaints():
    conn = connect_db()

    try:
        rows = conn.execute(
            "SELECT * FROM complaints ORDER BY id DESC"
        ).fetchall()

        return [dict(row) for row in rows]

    finally:
        conn.close()


# Free rule-based environmental analysis
@app.post("/analyze")
def analyze_environment(request: AnalysisRequest):
    category = request.category.lower()
    description = request.description.lower()

    if (
        "air" in category
        or any(word in description for word in [
            "smoke", "air pollution", "dust", "industrial emission"
        ])
    ):
        problem = "Possible Air Pollution"
        causes = (
            "Possible causes include vehicle emissions, industrial smoke, "
            "dust, or burning waste."
        )
        impact = (
            "Poor air quality may affect breathing and harm plants "
            "and other living organisms."
        )
        actions = (
            "Avoid exposure where possible, record the location, "
            "and report the issue to the relevant local authority."
        )
        authority = (
            "Local municipal body or relevant pollution control authority"
        )

    elif (
        "water" in category
        or any(word in description for word in [
            "dirty water", "water pollution", "sewage",
            "chemical discharge", "polluted river"
        ])
    ):
        problem = "Possible Water Pollution"
        causes = (
            "Possible causes include untreated wastewater, sewage, "
            "chemical discharge, or waste entering water."
        )
        impact = (
            "Polluted water may harm aquatic life and make water unsafe "
            "for some uses."
        )
        actions = (
            "Avoid contact with suspicious water and report the location "
            "to the appropriate authority."
        )
        authority = (
            "Local municipal water department or relevant pollution "
            "control authority"
        )

    elif (
        "waste" in category
        or any(word in description for word in [
            "garbage", "litter", "dumping", "overflowing bin",
            "plastic waste", "solid waste"
        ])
    ):
        problem = "Possible Waste Management Issue"
        causes = (
            "Possible causes include improper disposal, overflowing bins, "
            "or illegal dumping."
        )
        impact = (
            "Unmanaged waste may attract pests, create unpleasant smells, "
            "and pollute soil or water."
        )
        actions = (
            "Record the location and report the issue to the local "
            "municipal waste management department."
        )
        authority = "Local municipal body"

    elif (
        "noise" in category
        or any(word in description for word in [
            "loud sound", "loudspeaker", "construction noise",
            "excessive noise", "honking"
        ])
    ):
        problem = "Possible Noise Pollution"
        causes = (
            "Possible causes include traffic, construction, loudspeakers, "
            "or industrial machinery."
        )
        impact = (
            "Excessive noise may disturb sleep, concentration, "
            "and general wellbeing."
        )
        actions = (
            "Record the time and location and report persistent "
            "excessive noise to the appropriate local authority."
        )
        authority = (
            "Local municipal body or appropriate noise enforcement authority"
        )

    else:
        problem = "General Environmental Concern"
        causes = "More information is needed to identify the likely cause."
        impact = (
            "The impact depends on the type, location, and severity "
            "of the reported problem."
        )
        actions = (
            "Document the issue, avoid unsafe exposure, and contact "
            "the relevant local authority for guidance."
        )
        authority = "Relevant local municipal or environmental authority"

    return {
        "category": request.category,
        "location": request.location,
        "analysis": {
            "problem_summary": problem,
            "possible_causes": causes,
            "environmental_impact": impact,
            "recommended_actions": actions,
            "suggested_authority": authority,
            "notice": (
                "This is a preliminary rule-based assessment. "
                "The reported cause and impact have not been independently "
                "verified."
            )
        }
    }


# RAG search: retrieve relevant knowledge and source links
@app.post("/rag-search")
def rag_search(request: RAGRequest):
    query = request.query.strip().lower()

    if not query:
        raise HTTPException(
            status_code=400,
            detail="Please enter an environmental question or complaint."
        )

    documents = load_knowledge()
    query_words = set(query.split())
    results = []

    for document in documents:
        keywords = [
            str(keyword).lower()
            for keyword in document.get("keywords", [])
        ]

        topic = str(document.get("topic", "")).lower()
        content = str(document.get("content", "")).lower()

        score = 0

        # Match the query against topic and keywords
        for keyword in keywords:
            if keyword in query:
                score += 3
            elif any(
                len(word) > 2 and word in keyword
                for word in query_words
            ):
                score += 1

        if topic and topic in query:
            score += 4

        # Also match important words in the document content
        for word in query_words:
            if len(word) > 3 and word in content:
                score += 1

        if score > 0:
            results.append({
                "topic": document.get("topic", "Environmental topic"),
                "content": document.get("content", ""),
                "source_name": document.get("source_name", "Unknown source"),
                "source_url": document.get("source_url", ""),
                "relevance_score": score
            })

    # Highest-scoring documents first
    results.sort(
        key=lambda item: item["relevance_score"],
        reverse=True
    )

    return {
        "query": request.query,
        "results_found": len(results),
        "results": results[:3],
        "message": (
            "These are matching knowledge-base entries. "
            "Check the linked sources for full details."
            if results
            else
            "No matching entries found. Try different environmental "
            "keywords or add more documents to the knowledge base."
        ),
        "method": "Local keyword-based retrieval; no paid AI API used."
    }
