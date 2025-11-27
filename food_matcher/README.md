# Food Matcher Service

이 폴더는 GPT 멀티모달이 반환한 음식 이름을 **로컬 임베딩 + 최근접 검색**으로 실제 영양 DB와 매칭하는 FastAPI 기반 추론 서버입니다.  
Laravel API는 이 서버의 `/match` 엔드포인트를 호출해 최종 음식/영양 정보를 결합합니다.

## 1. 요구 사항

- Python 3.10 이상
- 가상환경 권장 (`python -m venv .venv`)
- MySQL 접속 정보 (`foods`, `food_embeddings` 테이블을 보유한 동일 DB)

## 2. 환경 변수

`food_matcher/.env` 파일을 만들고 아래 값을 채워 주세요.

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=foodscan
DB_USER=root
DB_PASSWORD=

MATCHER_MODEL_NAME=intfloat/multilingual-e5-base
MATCHER_DEVICE=cpu           # GPU가 있다면 cuda
MATCHER_PORT=9700
MATCHER_TOP_K=5
```

## 3. 의존성 설치

```powershell
cd C:\AI\food_matcher
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 4. 음식 임베딩 생성

SentenceTransformers 모델로 `foods` 테이블을 벡터화해 `food_embeddings` 테이블에 저장합니다.

```powershell
python embed_foods.py
```

- 기본 모델은 `intfloat/multilingual-e5-base`이며 한국어/영어 모두 잘 동작합니다.
- 이미 임베딩이 존재하면 덮어쓰기 합니다. 1.5만 건 기준으로 수 분이 소요될 수 있습니다.

## 5. 서버 실행

```powershell
uvicorn server:app --host 0.0.0.0 --port 9700 --reload
```

엔드포인트

- `GET /health` : 서비스 준비 상태 확인
- `POST /match` :

```json
{
  "query": "프라이드 치킨",
  "limit": 3,
  "threshold": 0.45
}
```

응답

```json
{
  "matches": [
    {
      "score": 0.87,
      "food": {
        "id": 123,
        "food_code": "D101-...",
        "food_name": "닭튀김_리얼후라이드 치킨",
        "common_name": "후라이드 치킨",
        "serving_size": "100g",
        "nutrients": {
          "energy_kcal": 248.5,
          "protein_g": 22.1,
          "fat_g": 13.0,
          "carbohydrate_g": 8.7,
          "sodium_mg": 540
        }
      }
    }
  ]
}
```

## 6. Laravel 연동

1. `.env`에 `FOOD_MATCHER_URL=http://127.0.0.1:9700` 추가
2. `php artisan serve`로 API 기동 → React 앱에서 이미지를 업로드 → GPT가 음식 이름을 판별
3. Laravel `FoodAnalysisService`가 `/match`를 호출해 가장 가까운 음식과 영양 정보를 받아 UI에 노출

## 7. 문제 해결

- 임베딩 테이블이 비어 있는 경우 `/match` 호출 전 `python embed_foods.py`로 갱신하세요.
- 모델 변경 시 `.env`의 `MATCHER_MODEL_NAME`을 바꾼 후 `embed_foods.py`를 다시 실행해야 합니다.
- 대량 베치 후 메모리 사용량을 줄이고 싶다면 `MATCHER_TOP_K`를 조정하거나 벡터를 디스크 캐시에 저장하도록 확장할 수 있습니다.

이 서비스만 교체하면 다른 임베딩 모델이나 검색 알고리즘(FAISS, HNSW 등)으로도 쉽게 마이그레이션할 수 있습니다.
