import json
import math
import os
from datetime import datetime

import numpy as np
import pymysql
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "foodscan"),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit": False,
}

MODEL_NAME = os.getenv("MATCHER_MODEL_NAME", "BM-K/KoSimCSE-roberta-multitask")
BATCH_SIZE = int(os.getenv("MATCHER_BATCH_SIZE", "128"))


def connect():
    return pymysql.connect(**DB_CONFIG)


def fetch_foods(conn):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, food_name, common_name, serving_size
            FROM foods
            ORDER BY id
            """
        )
        return cursor.fetchall()


def normalize_component(value: str | None) -> str:
    if not value:
        return ""

    text = value.replace("_", " ").replace("/", " ")
    return " ".join(text.split())


def build_text(row: dict) -> str:
    parts: list[str] = []

    for key in ("food_name", "common_name"):
        cleaned = normalize_component(row.get(key))
        if cleaned:
            parts.append(cleaned)

    serving = normalize_component(row.get("serving_size"))
    if serving:
        parts.append(f"기준량 {serving}")

    return " ".join(parts)


def normalize_vector(vector: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vector)
    if norm == 0:
        return vector
    return vector / norm


def upsert_embeddings(conn, payloads):
    if not payloads:
        return

    sql = """
        INSERT INTO food_embeddings (food_id, dimension, embedding, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            dimension = VALUES(dimension),
            embedding = VALUES(embedding),
            updated_at = VALUES(updated_at)
    """
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    data = [
        (
            row["food_id"],
            row["dimension"],
            row["embedding"],
            now,
            now,
        )
        for row in payloads
    ]

    with conn.cursor() as cursor:
        cursor.executemany(sql, data)
    conn.commit()


def main():
    conn = connect()
    foods = fetch_foods(conn)

    if not foods:
        print("foods 테이블에 데이터가 없습니다.")
        return

    print(f"{len(foods)}개의 음식 레코드를 불러왔습니다. 모델을 준비합니다...")
    model = SentenceTransformer(MODEL_NAME)

    texts = [build_text(row) for row in foods]
    total_batches = math.ceil(len(texts) / BATCH_SIZE)
    payloads = []

    for batch_index in tqdm(range(total_batches), desc="Embedding"):
        start = batch_index * BATCH_SIZE
        end = start + BATCH_SIZE
        chunk_texts = texts[start:end]
        chunk_foods = foods[start:end]

        embeddings = model.encode(
            chunk_texts,
            normalize_embeddings=True,
            batch_size=min(BATCH_SIZE, 64),
            convert_to_numpy=True,
        )

        for food_row, vector in zip(chunk_foods, embeddings):
            payloads.append(
                {
                    "food_id": food_row["id"],
                    "dimension": len(vector),
                    "embedding": json.dumps(vector.tolist(), ensure_ascii=False),
                }
            )

        if len(payloads) >= 1000:
            upsert_embeddings(conn, payloads)
            payloads = []

    if payloads:
        upsert_embeddings(conn, payloads)

    conn.close()
    print("food_embeddings 테이블 갱신이 완료되었습니다.")


if __name__ == "__main__":
    main()
