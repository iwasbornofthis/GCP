# FoodScan 프런트엔드 실행 가이드

React + Vite 기반 FoodScan 클라이언트는 이제 별도의 FastAPI 추론 서버 대신 **Laravel API → OpenAI GPT-4o** 경로로 이미지를 전송해 음식 정보를 받아옵니다. 아래 절차에 따라 백엔드와 프런트엔드를 준비하세요.

## 0. 요구 사항
- Node.js 18 이상, npm
- PHP 8.2+, Composer
- OpenAI API 키 (GPT-4o 멀티모달 사용 권한)
- Windows 기준 루트 경로 예시: `C:\AI`

## 1. Laravel API (OpenAI 프록시) 준비
1. **의존성 설치 & 환경 구성**
   ```powershell
   cd C:\AI\backend
   composer install
   cp .env.example .env
   ```
2. **.env 설정**  
   OpenAI 관련 키를 채우고, 필요한 경우 DB 드라이버/도메인 등을 조정합니다.
   ```
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o
   OPENAI_API_URL=https://api.openai.com/v1/chat/completions
   OPENAI_TIMEOUT=60
   ```
3. **데이터베이스 및 키 준비**
   ```powershell
   php artisan key:generate
   php artisan migrate
   ```
4. **서버 실행**
   ```powershell
   php artisan serve --host 127.0.0.1 --port 8000
   ```
5. **테스트 토큰 발급**  
   `POST /api/register` 또는 `POST /api/login`으로 토큰을 발급받습니다.  
   응답의 `token` 값을 프런트에서 Authorization 헤더로 사용합니다.

## 2. React 프런트엔드 실행
1. **환경 변수**  
   `foodscan/.env.local` 파일을 생성하거나 수정해 Laravel API 주소를 지정합니다.
   ```
   VITE_API_BASE_URL=http://127.0.0.1:8000/api
   ```
2. **의존성 설치**
   ```powershell
   cd C:\AI\foodscan
   npm install
   ```
3. **개발 서버 실행**
   ```powershell
   npm run dev -- --host 127.0.0.1 --port 5173
   ```
4. **브라우저 접속**  
   `http://127.0.0.1:5173` 에 접속 후 로그인/회원가입을 완료하면 홈 화면에서 이미지를 업로드하고 GPT-4o 기반 음식 인식을 이용할 수 있습니다.

## 3. API 빠른 확인
인증 토큰이 있을 경우 아래와 같이 바로 점검할 수 있습니다.
```powershell
curl -X POST ^
  -H "Authorization: Bearer <YOUR_TOKEN>" ^
  -F "photo=@C:/AI/11111.jpg;type=image/jpeg" ^
  http://127.0.0.1:8000/api/foods/analyze
```

## 4. 트러블슈팅
- **401/403 응답**: 토큰이 없거나 만료된 경우입니다. `/api/login`으로 새 토큰을 발급받아 `Authorization: Bearer ...` 헤더에 전달하세요.
- **429/5xx 응답**: OpenAI 측 에러일 수 있습니다. 잠시 후 재시도하거나 `.env`의 `OPENAI_TIMEOUT` 값을 늘려보세요.
- **이미지 업로드 실패**: 파일 크기는 4MB 이하, `jpg/png/webp` 등 브라우저가 보내는 표준 이미지 포맷을 사용해야 합니다.

이제 별도 FastAPI 추론 서버 없이도 Laravel API를 통해 직접 GPT-4o 멀티모달 인식을 사용할 수 있습니다.
