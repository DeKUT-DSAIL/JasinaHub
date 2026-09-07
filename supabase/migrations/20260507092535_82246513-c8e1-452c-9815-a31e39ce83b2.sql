-- Feedback system tables

CREATE TABLE public.feedback_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('rating','nps','choice_single','choice_multi','text','boolean')),
  options jsonb,
  required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.feedback_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.feedback_submissions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.feedback_questions(id) ON DELETE CASCADE,
  value_number numeric,
  value_text text,
  value_bool boolean,
  value_choices jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_answers_question ON public.feedback_answers(question_id);
CREATE INDEX idx_feedback_answers_submission ON public.feedback_answers(submission_id);
CREATE INDEX idx_feedback_submissions_created ON public.feedback_submissions(created_at DESC);

ALTER TABLE public.feedback_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_answers ENABLE ROW LEVEL SECURITY;

-- feedback_questions policies
CREATE POLICY "Authenticated users can view active questions"
  ON public.feedback_questions FOR SELECT
  TO authenticated
  USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert questions"
  ON public.feedback_questions FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update questions"
  ON public.feedback_questions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete questions"
  ON public.feedback_questions FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- feedback_submissions policies (anonymous)
CREATE POLICY "Authenticated users can submit"
  ON public.feedback_submissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view submissions"
  ON public.feedback_submissions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- feedback_answers policies
CREATE POLICY "Authenticated users can insert answers"
  ON public.feedback_answers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view answers"
  ON public.feedback_answers FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_feedback_questions_updated_at
  BEFORE UPDATE ON public.feedback_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();