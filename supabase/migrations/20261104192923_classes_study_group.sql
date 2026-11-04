alter table public.classes
  add column study_group text not null
    constraint classes_study_group_check
    check (study_group in ('experimental', 'control'));
