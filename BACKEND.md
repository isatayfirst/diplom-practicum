# BACKEND.md

Бэкенд: стек, модель данных, API, вход, экспорт.

## Стек
Next.js (App Router, TypeScript) + Supabase + деплой на Vercel.
Проект Supabase `practicum-mvp` уже существует: схема, RLS, `tasks_public` без ответов.

**ВАЖНО:** перед любой работой с базой в будущих шагах сначала осмотри существующие таблицы и RLS (только чтение). Ничего не пересоздавай. Изменения схемы только миграциями в `supabase/migrations`.

## Модель данных
Фактическая схема по осмотру базы 2026-11-04 (миграции `practicum_schema_v1`, `replace_sort_filter_with_functions`).

| Таблица | Строк | Колонки |
|---|---|---|
| `classes` | 0 | `id`, `code` (unique), `label`, `active`, `created_at` |
| `students` | 0 | `id`, `class_id`, `number` (> 0), `created_at` |
| `datasets` | 4 | `id`, `key` (unique), `label`, `name`, `source_url`, `snapshot_date`, `data` (jsonb) |
| `tasks` | 10 | `id`, `order_no` (unique), `skill` (read / calc / functions / conclude), `dataset_id`, `statement_kk`, `answer_type` (number / choice / text), `correct_value`, `tolerance`, `options`, `correct_option`, `rubric` |
| `attempts` | 0 | `id`, `student_id`, `task_id`, `answer_raw`, `is_correct`, `time_spent_ms`, `created_at` |
| `text_scores` | 0 | `attempt_id` (PK), `score` (0–2), `scored_at` |

Представление `tasks_public` (`security_invoker=true`): `id`, `order_no`, `skill`, `dataset_id`, `statement_kk`, `answer_type`, `options`. Колонок с эталонами в нём нет.

Доступ: RLS включён на всех таблицах, политик нет. У `anon` и `authenticated` нет прав ни на одну таблицу и ни на `tasks_public`; права есть только у `service_role`. Функций в схеме `public` нет. Поэтому приложение читает базу только на сервере ключом `SUPABASE_SERVICE_ROLE_KEY`.

Чего нет в базе, хотя планировалось в черновике:
- **Классы**: группа (экспериментальная / контрольная).
- **Ученики**: личный код, статус (активен / исключён), причина; есть только `number`.
- **Задачи**: отдельные поля названия и сцены, текст на русском; есть только `statement_kk`.
- **Попытки**: класс, группа, номер попытки, вердикт; есть `is_correct`, время в миллисекундах.
- **Тесты** и **ответы на тесты**: таблиц нет.

## API
- `POST /api/answer` — серверная проверка ответа.
  - Вердикты: `correct`, `incorrect`, `invalid_format`, `teacher`.
  - `invalid_format` не считается неверной попыткой.
  - Лимит: 30 попыток в минуту.

## Вход
- Ученик: класс + личный код, подписанный httpOnly cookie.
- Личные коды генерирует сайт, учитель печатает лист.
- Учитель: `/teacher`, один секретный код из `TEACHER_SECRET_CODE`, без учётных записей.

## Экспорт CSV
С подписью класса и периода; UTF-8 с BOM (чтобы Excel не ломал кодировку).

## Секреты
Только через переменные окружения (список в `.env.example`). Не коммитить, не печатать.
