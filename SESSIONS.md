# SESSIONS.md

История сессий. Формат: дата · номер шага · что сделано · что проверено · что осталось/проблемы · следующий шаг. Новые записи сверху.

---

**2026-11-04 · Шаг 1**
- Сделано: осмотр базы `practicum-mvp` только чтением (list_tables, SELECT, get_advisors); схема записана в BACKEND.md, раздел «Модель данных». Каркас Next.js 16 (App Router, TypeScript) в корне репозитория; главная страница читает 10 задач из `tasks_public` на сервере; вёрстка по DESIGN.md на обычном CSS; тексты в `messages/kk.json` и `messages/ru.json`.
- Зависимости: `next`, `react`, `react-dom` — основа приложения; `@supabase/supabase-js` — чтение базы; `typescript`, `@types/node`, `@types/react`, `@types/react-dom` — типизация; `eslint`, `eslint-config-next` — нужны для `npm run lint`. Tailwind, next-intl и UI-библиотеки не добавлены: хватает обычного CSS и простого словаря. Шрифт Inter подключён через встроенный `next/font`.
- Тексты: все казахские фразы в `messages/kk.json` — черновик, язык проверяет автор.
- Решение автора (вопрос 8): задачи читаются серверным `SUPABASE_SERVICE_ROLE_KEY`, схема не менялась.
- Задач в базе 10, как ожидалось. Названия и сцены в `tasks_public` нет, поэтому карточка показывает номер, навык и `statement_kk`.
- Приёмка: `npm run lint` и `npm run build` — код выхода 0. `npm run dev`: в браузере 10 задач по порядку на 360 px и 1280 px, горизонтальной прокрутки нет, `lang="kk"`, текст 16 px, ссылка перехода высотой 44 px, ошибок в консоли нет, запросов к Supabase из браузера нет. Контур фокуса задан как 3 px; браузер показал 2,4 px из-за округления при масштабе 1,25.
- Поиск по продакшен-сборке (`.next/static`, HTML, ответ RSC, ресурсы страницы): значения обоих ключей, имя `SUPABASE_SERVICE_ROLE_KEY`, `correct_value`, `correct_option`, `rubric`, `tolerance`, `supabase.co` — 0 совпадений. Сами значения эталонов с выдачей не сравнивались: запрос берёт только `id, order_no, skill, statement_kk` из представления без этих колонок.
- `npm audit`: 0 уязвимостей в рабочих зависимостях, 8 умеренных в инструментах разработки (цепочка ESLint).
- Осмотр базы: 6 таблиц (`classes`, `students`, `datasets`, `tasks`, `attempts`, `text_scores`) и представление `tasks_public`. В `tasks` 10 строк, в `datasets` 4, остальные пусты. RLS включён везде, политик нет, функций в `public` нет. `tasks_public` отдаёт `id`, `order_no`, `skill`, `dataset_id`, `statement_kk`, `answer_type`, `options`; `options` есть только у задачи 1 (массив из 4 строк). Названия и сцены в `tasks_public` нет.
- Проверка утечки (REST API, анонимный ключ): утечки нет. `tasks` → 401 `42501`, в том числе при запросе `correct_value, correct_option, rubric, tolerance`. `tasks_public` → 401 `42501`; `tasks_public?select=correct_value` → 400 `42703` (колонки нет). `datasets`, `attempts`, `students`, `classes`, `text_scores` → 401 `42501`.
- Советники: security — 6 × INFO `rls_enabled_no_policy` (запрет для всех, это не утечка); performance — 2 × INFO `unindexed_foreign_keys`, 1 × INFO `unused_index`.
- Проблемы:
  - анонимный ключ не читает и `tasks_public`; решено серверным ключом (вопрос 8 в ROADMAP.md);
  - `NEXT_PUBLIC_SUPABASE_URL` в `.env.local` содержит путь `/rest/v1/`; код берёт только origin адреса, поэтому работает и так;
  - `SUPABASE_SERVICE_ROLE_KEY` был разорван переносом строки, автор исправил `.env.local`; при проверке имён переменных фрагмент разорванной строки попал в лог сессии, рекомендован перевыпуск ключа;
  - в `.env.local` нет `TEACHER_SECRET_CODE` и `SESSION_SECRET` (для шага 1 не нужны);
  - в базе нет части полей и таблиц из плана: группа класса, личный код и статус ученика, вердикт попытки, тесты (см. BACKEND.md). Это затронет шаги 3, 6 и 7.
- Следующий шаг: Шаг 2 — страница задачи.

**2026-11-04 · Шаг 0**
- Сделано: проверена среда (Node v22.19.0, npm 10.9.3, git 2.45.1); `git init` (main); созданы AGENTS.md, DESIGN.md, BACKEND.md, ARCHITECTURE.md, ROADMAP.md, SESSIONS.md, .gitignore, .env.example.
- Проверено: `git status` и `git ls-files` — значений секретов нет.
- Осталось: открытые вопросы в ROADMAP.md.
- Следующий шаг: Шаг 1 — каркас Next.js и список задач.
