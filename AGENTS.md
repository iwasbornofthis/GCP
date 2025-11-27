# Repository Guidelines

This monorepo hosts a Laravel 12 API, a Vite/React web client, and a YOLO-based classifier.

## Project Structure & Module Organization
- `backend/`: Laravel service; HTTP controllers in `app/Http`, jobs/events in `app/Jobs`, business helpers in `app/Services`, migrations/seeds in `database/`, and feature/unit tests in `tests/`. Asset sources live in `resources/` and compile to `public/`.
- `foodscan/`: React client built with Vite/Tailwind; UI blocks live in `src/components`, shared logic in `src/lib`, and static assets in `public/`. Design tokens are controlled via `tailwind.config.js`.
- `food_classification/`: Python utilities for YOLO inference; scripts (`food_classifier_yolo.py`, `food_classifier_UI_v099.py`, `WebAPI.py`) use configs from `config/config.py`, Flask templates in `templates/`, and datasets/weights under `yolo/`.

## Build, Test, and Development Commands
- Backend: `composer install && npm install`, `php artisan serve`, `composer run dev` (API + queue + logs + Vite), `php artisan migrate:fresh --seed`, `php artisan test`, `npm run dev`, `npm run build`, `vendor/bin/pint`.
- Foodscan: `npm install`, `npm run dev`, `npm run build`, `npm run lint`.
- Classifier: `python -m venv .venv && .\.venv\Scripts\activate`, `python food_classifier_yolo.py`, `python WebAPI.py` (REST facade).

## Coding Style & Naming Conventions
`.editorconfig` enforces UTF-8, LF, and 4-space indents for PHP/YAML; stick to PSR-12 and format via `vendor/bin/pint`. React code uses 2-space indents, PascalCase components (e.g., `ScannerPanel.tsx`), camelCase hooks/utilities, and Tailwind classes grouped layout -> spacing -> effects. Python modules stay snake_case with constants pulled from `config/config.py` and type hints where practical.

## Testing Guidelines
Prioritize Laravel feature coverage in `backend/tests/Feature` and business-unit coverage in `backend/tests/Unit`; fake queues/external services and note any new seeds. Front-end work should include lint output plus Vitest/RTL specs under `src/__tests__` once introduced, otherwise document manual browser checks. Classifier changes must be validated against samples in `images_rec/`, attaching before/after JSON or screenshots so reviewers can compare detections.

## Commit & Pull Request Guidelines
Write single-line, imperative commits with a scoped prefix such as `feat(foodscan): add camera fallback` or `fix(backend): guard null nutrition facts`. PRs should outline the modules touched, schema/env impacts, and the exact commands or screenshots that justify the change, with linked issues or tickets when available and explicit follow-up notes when something is deferred.

## Configuration & Security Tips
Keep secrets out of Git: refresh `backend/.env.example`, `foodscan/.env.local`, and inline comments in `config/config.py` whenever new keys appear, and never upload populated `.env` files. Rotate queue/storage credentials before sharing logs, and store bulky artifacts (`app.log`, YOLO weights) in external storage, referencing download steps instead of committing binaries.
