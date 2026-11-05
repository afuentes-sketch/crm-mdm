-- General tasks: a task no longer has to be about a contact, so Andrés can
-- give himself or the salesperson tasks from the dashboard.
alter table public.tasks alter column contact_id drop not null;
