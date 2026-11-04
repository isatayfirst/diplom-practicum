# AGENTS.md

Правила работы для Claude Code: читать в начале каждой сессии.

## Контекст
- Строим веб-практикум по анализу данных на финансовых задачах.
- Для учеников 8 класса; учитель — автор проекта (он же ставит цели и проверяет результат).
- Часть дипломной работы; пилот в классах (экспериментальный и контрольный).
- Срок готового MVP: 31.12.2026.
- Стек: Next.js (App Router, TypeScript) + Supabase + Vercel. Подробности: BACKEND.md, ARCHITECTURE.md.
- Дизайн: DESIGN.md.

## Разрешения
- Действуй самостоятельно, всё разрешено: файлы, команды, установка пакетов, git, миграции.
- Запускать проект (`npm run dev`, `npm run build`, `npm run lint`) можно без отдельного разрешения автора.
- Коммитить и пушить только после слова автора: сначала работа и отчёт, потом автор сам говорит, что можно коммитить.
- ЕДИНСТВЕННЫЙ запрет: вводить пароли и секретные ключи, а также печатать их значения в чате, коммитах и логах.
- Секреты только в `.env.local`, он не коммитится. Если нужен секрет, остановись и попроси положить его в `.env.local`.

## Порядок работы
- Проект делается ШАГАМИ из ROADMAP.md, каждый шаг в новой сессии.
- В начале сессии читай AGENTS.md, SESSIONS.md, ROADMAP.md. Бери ровно один следующий шаг со статусом «Не начат» или «В работе».
- Не берись за следующий шаг и не добавляй функций вне шага.
- В конце сессии: проверь критерии приёмки шага, обнови статус в ROADMAP.md, допиши запись в SESSIONS.md, отчитайся автору. Коммит с понятным сообщением — только после его разрешения.

## Правила проекта
- Эталонные ответы задач никогда не уходят клиенту: проверка только на сервере.
- Имён учеников нигде нет, личных данных не собирать.
- Все тексты интерфейса только в `messages/kk.json` и `messages/ru.json`. Казахский по умолчанию, русский запасной. Казахские фразы — черновик, язык проверяет автор.

## Не добавлять
- Админку редактора задач.
- Регистрацию и пароли учеников.
- Валюту, аватарки, ачивки, рейтинги.
- Лекции и видео.
- Третий язык.

## Приоритет при расхождениях
Сообщения автора в чате > AGENTS.md > остальные файлы. Расхождение, которое нельзя разрешить, запиши в «Открытые вопросы» ROADMAP.md и задай автору один короткий вопрос.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
