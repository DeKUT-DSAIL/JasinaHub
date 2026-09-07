-- Seed data for local development. Runs automatically after `supabase db reset`.
-- Safe to re-run: uses ON CONFLICT DO NOTHING.

-- Categories -----------------------------------------------------------------
INSERT INTO public.categories (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'General Health', 'Everyday health and wellbeing prompts.'),
  ('22222222-2222-2222-2222-222222222222', 'Nutrition', 'Food, diet, and nutrition prompts.'),
  ('33333333-3333-3333-3333-333333333333', 'Maternal Health', 'Pregnancy, childbirth, and infant care prompts.')
ON CONFLICT (id) DO NOTHING;

-- Questions ------------------------------------------------------------------
INSERT INTO public.questions (id, category_id, question_text, order_index) VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'How do you describe a common cold in your language?', 1),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'What advice do you give someone with a headache?', 2),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'What are traditional foods eaten during illness?', 1),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'How do you talk about balanced diet with children?', 2),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'What advice is given to new mothers?', 1),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'How is prenatal care described locally?', 2)
ON CONFLICT DO NOTHING;

-- Feedback question ----------------------------------------------------------
INSERT INTO public.feedback_questions (question_text, question_type, required, is_active, order_index) VALUES
  ('How would you rate your recording experience?', 'rating', true, true, 1)
ON CONFLICT DO NOTHING;