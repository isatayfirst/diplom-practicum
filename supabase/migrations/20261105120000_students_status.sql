-- Статус ученика: активен или исключён из анализа. Данные исключённого не удаляются.
alter table public.students
  add column status text not null default 'active'
    constraint students_status_check check (status in ('active', 'excluded')),
  add column excluded_reason text
    constraint students_excluded_reason_check
    check (excluded_reason in ('moved', 'class_changed', 'other')),
  add constraint students_status_reason_consistent
    check ((status = 'excluded') = (excluded_reason is not null));
