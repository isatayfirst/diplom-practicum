-- Тесты: предтест и итоговый тест, состояние по классу, ответы и завершение.
-- RLS включён, политик нет, права только у service_role (как в остальных таблицах).

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  kind text not null unique check (kind in ('pretest', 'posttest')),
  created_at timestamptz not null default now()
);

insert into public.tests (kind) values ('pretest'), ('posttest');

create table public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  position integer not null check (position > 0),
  statement_kk text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  unique (test_id, position)
);

-- Эталон отдельно от вопроса: страница теста читает только test_questions.
create table public.test_question_keys (
  question_id uuid primary key references public.test_questions (id) on delete cascade,
  correct_option text not null
);

-- Нет строки = тест закрыт. Переключатель в кабинете учителя появится на шаге 7.
create table public.class_tests (
  class_id uuid not null references public.classes (id) on delete cascade,
  test_id uuid not null references public.tests (id) on delete cascade,
  open boolean not null default false,
  primary key (class_id, test_id)
);

create table public.test_answers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  question_id uuid not null references public.test_questions (id) on delete cascade,
  answer_raw text not null,
  time_spent_ms integer check (time_spent_ms is null or time_spent_ms >= 0),
  created_at timestamptz not null default now(),
  unique (student_id, question_id)
);

-- Есть строка = ученик завершил тест, повторно пройти нельзя.
create table public.test_sessions (
  student_id uuid not null references public.students (id) on delete cascade,
  test_id uuid not null references public.tests (id) on delete cascade,
  finished_at timestamptz not null default now(),
  primary key (student_id, test_id)
);

create index test_answers_question_id_idx on public.test_answers (question_id);
create index class_tests_test_id_idx on public.class_tests (test_id);
create index test_sessions_test_id_idx on public.test_sessions (test_id);

alter table public.tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_question_keys enable row level security;
alter table public.class_tests enable row level security;
alter table public.test_answers enable row level security;
alter table public.test_sessions enable row level security;

revoke all on public.tests, public.test_questions, public.test_question_keys,
  public.class_tests, public.test_answers, public.test_sessions
  from anon, authenticated;
