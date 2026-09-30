-- Optional starter content for the Supabase database.
insert into public.courses (title, slug, description, category, published) values
  ('Password Security', 'password-security', 'Build passwords that resist guessing, stuffing and everyday mistakes.', 'Account safety', true),
  ('Personal Data Protection', 'personal-data', 'Understand what personal data reveals and share only what is necessary.', 'Privacy basics', true),
  ('Phishing & Social Engineering', 'phishing', 'Spot manipulation, fake urgency and malicious links before they become incidents.', 'Threat awareness', true),
  ('Device & Account Security', 'devices', 'Harden the devices and accounts that hold your most important information.', 'Everyday defense', true),
  ('Safe Browsing & Online Privacy', 'privacy', 'Make informed choices about browsers, permissions, tracking and public Wi-Fi.', 'Digital habits', true),
  ('Data Management Basics', 'data-management', 'Classify, retain, share and delete information with less risk.', 'Responsible handling', true)
on conflict (slug) do update set description = excluded.description, category = excluded.category, published = excluded.published, updated_at = now();

insert into public.achievements (slug, title, description) values
  ('first-lesson', 'First lesson', 'Complete your first learning lesson.'),
  ('security-explorer', 'Security explorer', 'Complete three learning lessons.'),
  ('course-finisher', 'Course finisher', 'Complete every lesson in a course.')
on conflict (slug) do update set title = excluded.title, description = excluded.description;
