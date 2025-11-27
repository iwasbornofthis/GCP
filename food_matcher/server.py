import json
import os
from typing import Dict, List, Optional

import numpy as np
import pymysql
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "foodscan"),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}

MODEL_NAME = os.getenv("MATCHER_MODEL_NAME", "BM-K/KoSimCSE-roberta-multitask")
MODEL_DEVICE = os.getenv("MATCHER_DEVICE", "cpu")
DEFAULT_TOP_K = int(os.getenv("MATCHER_TOP_K", "5"))
DEFAULT_THRESHOLD = float(os.getenv("MATCHER_THRESHOLD", "0.4"))

app = FastAPI(title="Food Matcher Service", version="0.1.0")


class MatchRequest(BaseModel):
    query: str = Field(..., description="GPT 멀티모달이 반환한 음식명/설명")
    limit: int = Field(DEFAULT_TOP_K, ge=1, le=10)
    threshold: float = Field(DEFAULT_THRESHOLD, ge=0.0, le=1.0)


class FoodRecord(BaseModel):
    id: int
    food_code: str
    food_name: str
    common_name: Optional[str] = None
    serving_size: Optional[str] = None
    nutrients: Dict[str, float] = {}


class MatchResponse(BaseModel):
    score: float
    food: FoodRecord


class MatchPayload(BaseModel):
    matches: List[MatchResponse]


class VectorStore:
    def __init__(self):
        self.vectors = None
        self.records: List[Dict] = []
        self.model = SentenceTransformer(MODEL_NAME, device=MODEL_DEVICE)

    def load(self):
        connection = pymysql.connect(**DB_CONFIG)
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT f.id,
                           f.food_code,
                           f.food_name,
                           f.common_name,
                           f.serving_size,
                           f.energy_kcal,
                           f.protein_g,
                           f.fat_g,
                           f.carbohydrate_g,
                           f.sugars_g,
                           f.dietary_fiber_g,
                           f.sodium_mg,
                           fe.embedding
                    FROM food_embeddings fe
                    JOIN foods f ON f.id = fe.food_id
                    ORDER BY f.id
                    """
                )
                rows = cursor.fetchall()

            if not rows:
                raise RuntimeError("food_embeddings 테이블이 비어 있습니다. embed_foods.py를 먼저 실행하세요.")

            embeddings = []
            records = []

            for row in rows:
                vector = json.loads(row["embedding"])
                embeddings.append(np.array(vector, dtype=np.float32))
                nutrients = {
                    "energy_kcal": row["energy_kcal"],
                    "protein_g": row["protein_g"],
                    "fat_g": row["fat_g"],
                    "carbohydrate_g": row["carbohydrate_g"],
                    "sugars_g": row["sugars_g"],
                    "dietary_fiber_g": row["dietary_fiber_g"],
                    "sodium_mg": row["sodium_mg"],
                }
                # drop nulls
                nutrients = {k: float(v) for k, v in nutrients.items() if v is not None}

                records.append(
                    {
                        "id": row["id"],
                        "food_code": row["food_code"],
                        "food_name": row["food_name"],
                        "common_name": row["common_name"],
                        "serving_size": row["serving_size"],
                        "nutrients": nutrients,
                    }
                )

            self.vectors = np.vstack(embeddings)
            self.records = records
        finally:
            connection.close()

    def embed_query(self, text: str) -> np.ndarray:
        embedding = self.model.encode(
            text,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        return embedding.astype(np.float32)

    def search(self, query_vector: np.ndarray, limit: int, threshold: float) -> List[MatchResponse]:
        if self.vectors is None or not self.records:
            raise RuntimeError("임베딩 데이터가 로드되지 않았습니다.")

        scores = np.dot(self.vectors, query_vector)
        ranked_indices = np.argsort(-scores)[: limit * 2]

        matches: List[MatchResponse] = []
        for index in ranked_indices:
            score = float(scores[index])
            if score < threshold:
                continue

            record = self.records[index]
            matches.append(
                MatchResponse(
                    score=score,
                    food=FoodRecord(**record),
                )
            )

            if len(matches) >= limit:
                break

        return matches


store = VectorStore()


@app.on_event("startup")
def startup_event():
    store.load()


@app.get("/health")
def health():
    status = store.vectors is not None
    return {"status": "ok" if status else "loading", "records": len(store.records)}


@app.post("/match", response_model=MatchPayload)
def match(req: MatchRequest):
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="query가 비어 있습니다.")

    try:
        vector = store.embed_query(query)
        matches = store.search(vector, req.limit, req.threshold)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return MatchPayload(matches=matches)
