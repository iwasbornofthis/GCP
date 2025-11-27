<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework. You can also check out [Laravel Learn](https://laravel.com/learn), where you will be guided through building a modern Laravel application.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## Food Nutrition Dataset Import

이 프로젝트는 `DB.csv`(식약처 영양 DB) 파일을 기반으로 음식 영양 정보를 로컬 DBMS(MySQL)에 적재합니다. CSV는 EUC-KR(cp949)로 인코딩되어 있으므로 제공된 artisan 커맨드를 사용해야 안전하게 변환됩니다.

1. CSV 파일 위치 확인  
   루트(`C:\AI\DB.csv`)에 있는 원본을 그대로 사용하거나 경로를 인자로 넘길 수 있습니다.

2. 가져오기 실행  
   ```powershell
   cd C:\AI\backend
   php artisan foods:import --truncate            # 필요 시 --truncate 생략 가능
   php artisan foods:import storage/foods.csv     # 다른 경로를 지정하고 싶은 경우
   ```
   - `--truncate` 옵션을 주면 기존 `foods` 테이블을 비우고 다시 채웁니다.
   - 총 14,584건 정도가 들어오며, 500건 단위로 진행 상황이 출력됩니다.

3. 활용  
   `App\Models\Food` 모델을 통해 `food_code`, `food_name`, `energy_kcal` 등 모든 영양 필드를 바로 조회하거나, 나중에 임베딩/근접 검색용 소스로 사용할 수 있습니다.

## Food Matcher Python Service

이미지 → GPT 멀티모달 → 텍스트 음식명까지 얻은 뒤, 실제 DB의 음식 리스트와 매칭하는 역할은 루트의 `food_matcher` FastAPI 서버가 담당합니다.

1. `C:\AI\food_matcher`에서 `.env` 작성 (DB 접속 정보, 로컬 임베딩 모델 등)
2. `pip install -r requirements.txt`
3. `python embed_foods.py`로 `foods` 테이블을 SentenceTransformers 임베딩으로 변환해 `food_embeddings`에 저장
4. `uvicorn server:app --port 9700` 로 서버 기동
5. Laravel `.env`에 `FOOD_MATCHER_URL=http://127.0.0.1:9700` 를 지정하면 `FoodAnalysisService`가 `/match` 엔드포인트에서 음식/영양 정보를 받아 UI에 전달합니다.

모델을 바꾸고 싶다면 `food_matcher/.env`의 `MATCHER_MODEL_NAME`을 수정하고 `embed_foods.py`만 다시 실행하면 됩니다.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
