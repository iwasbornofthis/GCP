## FoodScan 기능 흐름 요약

FoodScan은 React 기반 프런트엔드, Laravel API, FastAPI로 구현한 Food Matcher, MySQL 데이터베이스를 중심으로 동작합니다. 아래는 실제로 구현/검증한 기능 목록입니다.

### 1. React 프런트엔드
- 카메라 촬영/갤러리 선택 UI, QR 스캔 모드 전환, 결과 카드 표시 등 사용자 인터페이스를 React 컴포넌트로 구성했습니다.
- `import.meta.env.VITE_API_BASE_URL` 환경변수로 Laravel API 주소를 주입하며, 프록시를 통해 `/api` 경로로 호출합니다.
- 사진 분석 버튼을 누르면 FormData로 이미지를 전송하고, 응답 JSON을 받아 영양 정보와 추천 메시지를 렌더링합니다.

### 2. Laravel API
- 인증: `POST /api/register`, `POST /api/login`, `GET /api/me`, `POST /api/logout`으로 토큰 기반 인증을 구현했습니다. 기본 시드 계정(`test@example.com / password`)으로 테스트할 수 있습니다.
- 분석: `POST /api/foods/analyze` 엔드포인트에서 이미지 업로드를 받고, OpenAI GPT-4o 모델과 Food Matcher 서비스를 호출하여 음식명·영양 정보를 반환합니다.
- CORS, Sanctum 인증, 이미지 업로드 검증 등 API 호출에 필요한 구성이 완료되어 있습니다.

### 3. OpenAI 연동
- `.env` 에 `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o-mini`, `OPENAI_TIMEOUT` 등을 설정해 GPT-4o 멀티모달 API를 호출합니다.
- 사용자가 업로드한 이미지를 OpenAI에 전달해 음식명/설명 텍스트를 생성하고, 이를 Food Matcher에 넘겨 매칭을 시작합니다.

### 4. Food Matcher 서비스
- FastAPI(`food_matcher/server.py`)가 SentenceTransformers 기반 임베딩을 이용해 `foods` 테이블과 유사도를 계산합니다.
- `python embed_foods.py` 로 `food_embeddings` 테이블을 사전 구축하고, `uvicorn server:app --port 9700` 으로 API를 제공합니다.
- Laravel `.env` 의 `FOOD_MATCHER_URL` 이 해당 서비스 주소를 가리키며, `/match` 호출 시 상위 K개 음식 코드와 점수를 반환합니다.

### 5. DB 정제·전처리
- `common_name` 그룹 평균을 이용해 지방(`fat_g`)과 탄수화물(`carbohydrate_g`)의 0/NULL 값을 보정했습니다. 대표 식품명 단위로 평균을 계산해 현실적인 수치를 채웠습니다.
- 영양 정보가 100g 단위로 저장돼 있던 문제를 해결하기 위해 `product_weight` 값을 활용해 실제 제품 중량 기준으로 스케일링했습니다.
- 정제 작업 이후에도 `common_name`이 비어 있는 일부 항목은 추후 조사가 필요하다는 점을 문서화했습니다.

### 6. 전체 분석 흐름
1. 사용자가 React 앱에서 사진을 촬영/업로드 → `POST /api/foods/analyze`.
2. Laravel API가 이미지를 검증하고 OpenAI GPT-4o에 전송 → 음식명/설명을 받음.
3. Food Matcher FastAPI 서비스에 음식 설명을 전달해 `foods` DB와의 임베딩 매칭을 수행.
4. 매칭된 `food_code` 의 영양 정보를 DB에서 조회(정제된 값 사용)하여 응답 JSON 구성.
5. React 앱이 응답을 받아 결과 카드(칼로리, 탄수화물, 지방 등)를 표시.

이 README는 PPT 등 외부 자료를 작성할 때 참고할 “구현 기능 목록”을 제공하기 위한 용도로 유지합니다. 필요시 새 기능이 추가되면 항목을 업데이트하세요.
