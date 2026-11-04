alter table public.students
  add column personal_code text not null
    constraint students_personal_code_format check (personal_code ~ '^[A-Z0-9]{5}$');

alter table public.students
  add constraint students_class_id_personal_code_key unique (class_id, personal_code);
