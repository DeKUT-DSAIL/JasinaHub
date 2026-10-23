-- ==============================================================================
-- JasinaHub - Complete Supabase Database Setup Script
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Project: https://supabase.com/dashboard
-- 2. Go to the "SQL Editor" tab in the left sidebar.
-- 3. Click "New query", paste the entire contents of this file, and click "Run".
-- 4. After running, your database schema, enums, triggers, RPC functions,
--    storage buckets, security policies (RLS), and starter seed data will be ready!
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS & CUSTOM TYPES (ENUMS)
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.response_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. CORE RELATIONAL TABLES
-- ------------------------------------------------------------------------------

-- Profiles: Extended user profile data with demographic metadata & consent flags
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone_number TEXT NOT NULL DEFAULT '',
  phone_number_updated BOOLEAN NOT NULL DEFAULT false,
  age INTEGER,
  gender TEXT,
  dialect TEXT,
  account_type TEXT NOT NULL DEFAULT 'recording_volunteer',
  verified BOOLEAN NOT NULL DEFAULT false,
  transcription_approved BOOLEAN NOT NULL DEFAULT false,
  transcription_guidelines_agreed BOOLEAN NOT NULL DEFAULT false,
  transcription_guidelines_agreed_at TIMESTAMPTZ,
  voice_recording_consent BOOLEAN,
  consent_timestamp TIMESTAMPTZ,
  pseudonym TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles: Dedicated table for role assignment (never stored directly on profile)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Categories: Health-related topic categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Questions: Structured prompts within categories
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  image_url TEXT,
  image_attribution TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Voice Responses: Submitted volunteer voice recordings
CREATE TABLE IF NOT EXISTS public.voice_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  audio_file_url TEXT,
  duration_seconds INTEGER,
  status public.response_status NOT NULL DEFAULT 'pending',
  response_type TEXT DEFAULT 'audio',
  text_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transcriptions: Text transcriptions of voice responses
CREATE TABLE IF NOT EXISTS public.transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_response_id UUID NOT NULL REFERENCES public.voice_responses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcription_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  edit_count INTEGER NOT NULL DEFAULT 0,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transcription Locks: Atomic locking mechanism for transcriber assignment
CREATE TABLE IF NOT EXISTS public.transcription_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_response_id UUID NOT NULL REFERENCES public.voice_responses(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

-- User Progress: Category completion tracking per volunteer
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  completed_questions INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  last_question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id)
);

-- User Activity Logs: Audit log of platform actions
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  page TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feedback System: Questions, Submissions & Answers
CREATE TABLE IF NOT EXISTS public.feedback_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  options JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.feedback_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.feedback_questions(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_bool BOOLEAN,
  value_choices JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Password Reset Codes (Edge function helper)
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Category Access Requests: Users request recording/transcription access per category
-- Admins review and approve/reject each request.
CREATE TABLE IF NOT EXISTS public.category_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  -- 'pending' | 'approved' | 'rejected'
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  admin_note TEXT,
  UNIQUE (user_id, category_id)
);

-- ------------------------------------------------------------------------------
-- 3. INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_voice_responses_user_id ON public.voice_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_responses_question_id ON public.voice_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_voice_responses_status ON public.voice_responses(status);
CREATE INDEX IF NOT EXISTS idx_transcriptions_voice_response_id ON public.transcriptions(voice_response_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON public.transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcription_locks_user_id ON public.transcription_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_transcription_locks_expires_at ON public.transcription_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_lookup ON public.password_reset_codes(email, code, used);
CREATE INDEX IF NOT EXISTS idx_cat_access_requests_status    ON public.category_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_cat_access_requests_user_id   ON public.category_access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cat_access_requests_category  ON public.category_access_requests(category_id);

-- Partial unique index for transcriptions
CREATE UNIQUE INDEX IF NOT EXISTS transcriptions_voice_response_id_unique
  ON public.transcriptions(voice_response_id)
  WHERE created_at > '2026-05-06'::timestamptz;

-- ------------------------------------------------------------------------------
-- 4. DATABASE FUNCTIONS & TRIGGERS
-- ------------------------------------------------------------------------------

-- 4.1 Pseudonym Generator for Profiles (JSN-XXXXXXX)
CREATE OR REPLACE FUNCTION public.set_profile_pseudonym()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.pseudonym IS NULL OR NEW.pseudonym = '' THEN
    NEW.pseudonym := 'JSN-' || upper(substr(md5(NEW.id::text || 'jasinahub'), 1, 7));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profile_pseudonym_trigger ON public.profiles;
CREATE TRIGGER set_profile_pseudonym_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_pseudonym();

-- 4.2 Auth Signup Hook: Automatically creates a public.profiles entry on new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    email,
    phone_number,
    age,
    gender,
    dialect,
    account_type
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'given_name',
      SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 1),
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'family_name',
      NULLIF(SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 2), ''),
      ''
    ),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    NULLIF(NEW.raw_user_meta_data->>'age', '')::integer,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'dialect',
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'recording_volunteer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 5. RPC STORED PROCEDURES
-- ------------------------------------------------------------------------------

-- 5.1 Role-checker function (Security Definer to prevent RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 5.2 Unique user counts per question (Used for retiring questions after 3 responses)
CREATE OR REPLACE FUNCTION public.get_question_counts()
RETURNS TABLE(question_id uuid, unique_user_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT question_id, COUNT(DISTINCT user_id) as unique_user_count
  FROM public.voice_responses
  GROUP BY question_id;
$$;

CREATE OR REPLACE FUNCTION public.get_question_unique_user_counts()
RETURNS TABLE(question_id uuid, unique_user_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT question_id, COUNT(DISTINCT user_id) as unique_user_count
  FROM public.voice_responses
  GROUP BY question_id;
$$;

-- 5.3 Atomic transcription claiming with pessimistic locking
CREATE OR REPLACE FUNCTION public.claim_random_transcription(_user_id uuid)
RETURNS TABLE(id uuid, audio_file_url text, question_id uuid, duration_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _record RECORD;
BEGIN
  -- Clean up expired locks first
  DELETE FROM public.transcription_locks WHERE expires_at < now();

  -- Pick an accepted recording that has not been claimed or completed
  SELECT vr.id, vr.audio_file_url, vr.question_id, vr.duration_seconds
  INTO _record
  FROM public.voice_responses vr
  WHERE vr.status = 'accepted'
    AND vr.user_id != _user_id
    AND vr.audio_file_url IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.transcriptions t
      WHERE t.voice_response_id = vr.id
        AND t.status <> 'rejected'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.transcription_locks tl
      WHERE tl.voice_response_id = vr.id
    )
  ORDER BY random()
  LIMIT 1;

  IF _record IS NULL THEN
    RETURN;
  END IF;

  -- Delete existing active lock held by this transcriber
  DELETE FROM public.transcription_locks WHERE user_id = _user_id;

  -- Insert new lock (15 min TTL)
  INSERT INTO public.transcription_locks (voice_response_id, user_id)
  VALUES (_record.id, _user_id);

  id := _record.id;
  audio_file_url := _record.audio_file_url;
  question_id := _record.question_id;
  duration_seconds := _record.duration_seconds;
  RETURN NEXT;
END;
$$;

-- 5.4 Release caller's transcription lock
CREATE OR REPLACE FUNCTION public.release_transcription_lock(_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.transcription_locks
  WHERE user_id = _user_id;
$$;

-- 5.5 Admin Dashboard Analytics RPC
CREATE OR REPLACE FUNCTION public.get_admin_chart_data()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  min_date date;
  max_date date;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(MIN(created_at)::date, CURRENT_DATE), CURRENT_DATE
  INTO min_date, max_date
  FROM voice_responses;

  SELECT json_build_object(
    'responses_over_time', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT date_trunc('day', created_at)::date AS day, count(*) AS count
        FROM voice_responses
        GROUP BY 1
        ORDER BY 1
      ) t
    ),
    'transcriptions_over_time', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT date_trunc('day', created_at)::date AS day, count(*) AS count
        FROM transcriptions
        GROUP BY 1
        ORDER BY 1
      ) t
    ),
    'status_distribution', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT status::text, count(*) AS count
        FROM voice_responses
        GROUP BY status
      ) t
    ),
    'transcription_status_distribution', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT status::text, count(*) AS count
        FROM transcriptions
        GROUP BY status
      ) t
    ),
    'top_contributors', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT p.first_name || ' ' || LEFT(p.last_name, 1) || '.' AS name, count(*) AS count
        FROM voice_responses vr
        JOIN profiles p ON p.id = vr.user_id
        GROUP BY p.first_name, p.last_name
        ORDER BY count DESC
        LIMIT 10
      ) t
    ),
    'top_transcription_contributors', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT p.first_name || ' ' || LEFT(p.last_name, 1) || '.' AS name, count(*) AS count
        FROM transcriptions tr
        JOIN profiles p ON p.id = tr.user_id
        GROUP BY p.first_name, p.last_name
        ORDER BY count DESC
        LIMIT 10
      ) t
    ),
    'category_breakdown', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT c.name AS category, count(*) AS count
        FROM voice_responses vr
        JOIN questions q ON q.id = vr.question_id
        JOIN categories c ON c.id = q.category_id
        GROUP BY c.name
        ORDER BY count DESC
      ) t
    ),
    'duration_distribution', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT bucket, sum(cnt)::bigint AS count FROM (
          SELECT 
            CASE 
              WHEN duration_seconds IS NULL OR duration_seconds <= 30 THEN '0-30s'
              WHEN duration_seconds <= 60 THEN '30-60s'
              WHEN duration_seconds <= 120 THEN '1-2m'
              WHEN duration_seconds <= 300 THEN '2-5m'
              ELSE '5m+'
            END AS bucket,
            count(*) AS cnt
          FROM voice_responses
          GROUP BY 1
        ) sub
        GROUP BY bucket
        ORDER BY 
          CASE bucket
            WHEN '0-30s' THEN 1
            WHEN '30-60s' THEN 2
            WHEN '1-2m' THEN 3
            WHEN '2-5m' THEN 4
            WHEN '5m+' THEN 5
          END
      ) t
    ),
    'daily_activity_30d', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT date_trunc('day', created_at)::date AS day, count(*) AS count
        FROM voice_responses
        WHERE created_at >= now() - interval '30 days'
        GROUP BY 1
        ORDER BY 1
      ) t
    ),
    'sparklines', json_build_object(
      'responses', (
        SELECT json_agg(cnt ORDER BY day) FROM (
          SELECT d::date AS day, COALESCE(c.count, 0) AS cnt
          FROM generate_series(min_date::timestamp, max_date::timestamp, '1 day') d
          LEFT JOIN (
            SELECT date_trunc('day', created_at)::date AS day, count(*) AS count
            FROM voice_responses
            GROUP BY 1
          ) c ON c.day = d::date
        ) t
      ),
      'accepted', (
        SELECT json_agg(cnt ORDER BY day) FROM (
          SELECT d::date AS day, COALESCE(c.count, 0) AS cnt
          FROM generate_series(min_date::timestamp, max_date::timestamp, '1 day') d
          LEFT JOIN (
            SELECT date_trunc('day', created_at)::date AS day, count(*) AS count
            FROM voice_responses WHERE status = 'accepted'
            GROUP BY 1
          ) c ON c.day = d::date
        ) t
      ),
      'rejected', (
        SELECT json_agg(cnt ORDER BY day) FROM (
          SELECT d::date AS day, COALESCE(c.count, 0) AS cnt
          FROM generate_series(min_date::timestamp, max_date::timestamp, '1 day') d
          LEFT JOIN (
            SELECT date_trunc('day', created_at)::date AS day, count(*) AS count
            FROM voice_responses WHERE status = 'rejected'
            GROUP BY 1
          ) c ON c.day = d::date
        ) t
      ),
      'users', (
        SELECT json_agg(cnt ORDER BY day) FROM (
          SELECT d::date AS day, COALESCE(c.count, 0) AS cnt
          FROM generate_series(min_date::timestamp, max_date::timestamp, '1 day') d
          LEFT JOIN (
            SELECT date_trunc('day', created_at)::date AS day, count(*) AS count
            FROM profiles
            GROUP BY 1
          ) c ON c.day = d::date
        ) t
      ),
      'duration', (
        SELECT json_agg(dur ORDER BY day) FROM (
          SELECT d::date AS day, COALESCE(sum(duration_seconds), 0) AS dur
          FROM generate_series(min_date::timestamp, max_date::timestamp, '1 day') d
          LEFT JOIN voice_responses vr ON date_trunc('day', vr.created_at)::date = d::date
          GROUP BY d::date
        ) t
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- 5.6 Admin Transcription Stats RPC
CREATE OR REPLACE FUNCTION public.get_transcription_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'unique_transcribed', (
      SELECT COUNT(DISTINCT voice_response_id)
      FROM public.transcriptions
      WHERE status <> 'rejected'
    ),
    'verified_unique', (
      SELECT COUNT(DISTINCT voice_response_id)
      FROM public.transcriptions
      WHERE status = 'accepted'
    ),
    'pending_unique', (
      SELECT COUNT(DISTINCT t.voice_response_id)
      FROM public.transcriptions t
      WHERE t.status = 'pending'
        AND NOT EXISTS (
          SELECT 1 FROM public.transcriptions t2
          WHERE t2.voice_response_id = t.voice_response_id
            AND t2.status = 'accepted'
        )
    ),
    'accepted_migrated', (
      SELECT COUNT(*) FROM public.voice_responses
      WHERE status = 'accepted'
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcription_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_access_requests ENABLE ROW LEVEL SECURITY;

-- 6.1 profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 6.2 user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage user_roles" ON public.user_roles
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 6.3 categories
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 6.4 questions
DROP POLICY IF EXISTS "Authenticated users can view questions" ON public.questions;
CREATE POLICY "Authenticated users can view questions" ON public.questions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 6.5 voice_responses
DROP POLICY IF EXISTS "Users can view their own voice responses or admins" ON public.voice_responses;
CREATE POLICY "Users can view their own voice responses or admins" ON public.voice_responses
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert own voice responses" ON public.voice_responses;
CREATE POLICY "Users can insert own voice responses" ON public.voice_responses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update voice responses" ON public.voice_responses;
CREATE POLICY "Admins can update voice responses" ON public.voice_responses
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 6.6 transcriptions
DROP POLICY IF EXISTS "Users can view own transcriptions or admins" ON public.transcriptions;
CREATE POLICY "Users can view own transcriptions or admins" ON public.transcriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can insert transcriptions" ON public.transcriptions;
CREATE POLICY "Authenticated users can insert transcriptions" ON public.transcriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Transcribers can edit pending transcriptions" ON public.transcriptions;
CREATE POLICY "Transcribers can edit pending transcriptions" ON public.transcriptions
  FOR UPDATE TO authenticated USING (
    (auth.uid() = user_id AND status = 'pending') OR has_role(auth.uid(), 'admin')
  );

-- 6.7 transcription_locks
DROP POLICY IF EXISTS "Users can view own locks or admins" ON public.transcription_locks;
CREATE POLICY "Users can view own locks or admins" ON public.transcription_locks
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can manage own locks" ON public.transcription_locks;
CREATE POLICY "Users can manage own locks" ON public.transcription_locks
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 6.8 user_progress
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can upsert own progress" ON public.user_progress;
CREATE POLICY "Users can upsert own progress" ON public.user_progress
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 6.9 user_activity_logs
DROP POLICY IF EXISTS "Admins can view logs" ON public.user_activity_logs;
CREATE POLICY "Admins can view logs" ON public.user_activity_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert activity logs" ON public.user_activity_logs;
CREATE POLICY "Users can insert activity logs" ON public.user_activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 6.10 feedback
DROP POLICY IF EXISTS "Authenticated users can view active questions" ON public.feedback_questions;
CREATE POLICY "Authenticated users can view active questions" ON public.feedback_questions
  FOR SELECT TO authenticated USING (is_active = true OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage feedback questions" ON public.feedback_questions;
CREATE POLICY "Admins can manage feedback questions" ON public.feedback_questions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert feedback submissions" ON public.feedback_submissions;
CREATE POLICY "Users can insert feedback submissions" ON public.feedback_submissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view feedback submissions" ON public.feedback_submissions;
CREATE POLICY "Admins can view feedback submissions" ON public.feedback_submissions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert feedback answers" ON public.feedback_answers;
CREATE POLICY "Users can insert feedback answers" ON public.feedback_answers
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view feedback answers" ON public.feedback_answers;
CREATE POLICY "Admins can view feedback answers" ON public.feedback_answers
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 6.11 password_reset_codes (Restricted to service_role)
DROP POLICY IF EXISTS "Service role full access to password_reset_codes" ON public.password_reset_codes;
CREATE POLICY "Service role full access to password_reset_codes"
  ON public.password_reset_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.12 category_access_requests
DROP POLICY IF EXISTS "Users can view own category access requests" ON public.category_access_requests;
CREATE POLICY "Users can view own category access requests"
  ON public.category_access_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can create own category access requests" ON public.category_access_requests;
CREATE POLICY "Users can create own category access requests"
  ON public.category_access_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update category access requests" ON public.category_access_requests;
CREATE POLICY "Admins can update category access requests"
  ON public.category_access_requests
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete category access requests" ON public.category_access_requests;
CREATE POLICY "Admins can delete category access requests"
  ON public.category_access_requests
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------------------------
-- 7. GRANTS TO ROLES
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.categories, public.feedback_questions TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_question_counts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_question_unique_user_counts() TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 8. STORAGE BUCKETS & STORAGE POLICIES
-- ------------------------------------------------------------------------------

-- Ensure 'voice-recordings' bucket exists (public for direct audio playback)
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-recordings', 'voice-recordings', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure 'images' bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Storage Policies for voice-recordings
DROP POLICY IF EXISTS "Public read access for voice recordings" ON storage.objects;
CREATE POLICY "Public read access for voice recordings" ON storage.objects
  FOR SELECT USING (bucket_id = 'voice-recordings');

DROP POLICY IF EXISTS "Authenticated users can upload recordings" ON storage.objects;
CREATE POLICY "Authenticated users can upload recordings" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'voice-recordings');

DROP POLICY IF EXISTS "Users can delete their own recordings" ON storage.objects;
CREATE POLICY "Users can delete their own recordings" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'voice-recordings' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage Policies for images
DROP POLICY IF EXISTS "Anyone can view question images" ON storage.objects;
CREATE POLICY "Anyone can view question images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Admins can upload question images" ON storage.objects;
CREATE POLICY "Admins can upload question images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'images' AND public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update question images" ON storage.objects;
CREATE POLICY "Admins can update question images" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'images' AND public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can delete question images" ON storage.objects;
CREATE POLICY "Admins can delete question images" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'images' AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- ------------------------------------------------------------------------------
-- 9. SEED DATA (Categories & Starter Questions)
-- ------------------------------------------------------------------------------
INSERT INTO public.categories (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'General Health', 'Everyday health and wellbeing prompts.'),
  ('22222222-2222-2222-2222-222222222222', 'Nutrition', 'Food, diet, and nutrition prompts.'),
  ('33333333-3333-3333-3333-333333333333', 'Maternal Health', 'Pregnancy, childbirth, and infant care prompts.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.questions (id, category_id, question_text, order_index) VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'How do you describe a common cold in your language?', 1),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'What advice do you give someone with a headache?', 2),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'What are traditional foods eaten during illness?', 1),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'How do you talk about balanced diet with children?', 2),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'What advice is given to new mothers?', 1),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'How is prenatal care described locally?', 2)
ON CONFLICT DO NOTHING;

INSERT INTO public.feedback_questions (question_text, question_type, required, is_active, order_index) VALUES
  ('How would you rate your recording experience?', 'rating', true, true, 1)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- SETUP COMPLETE!
-- ==============================================================================
--
-- STEP 1 — Disable Email Confirmation (immediate login without confirmation links):
--   In your Supabase Dashboard:
--   1. Go to: Authentication → Providers → Email
--   2. Toggle OFF "Confirm email"
--   3. Click "Save"
--   Now users can sign up and immediately log in or access the platform without
--   having to click a confirmation link in their inbox.
--
-- STEP 2 — Grant Yourself Admin Access:
--   After registering your first account on the platform, run this in the SQL Editor:
--
--   UPDATE public.profiles SET verified = true WHERE email = 'your-email@example.com';
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE email = 'your-email@example.com'
--   ON CONFLICT (user_id, role) DO NOTHING;
--
-- STEP 3 — Category Access Requests Setup & Management:
--   The table `public.category_access_requests` is already created and secured above.
--   Workflow:
--     1. Users log into the Dashboard and see available categories in the Category Browser.
--     2. They click "Request Access" for any category they wish to record or transcribe for.
--     3. Admins visit the Admin Panel → "Category Access" tab:
--        - View all pending, approved, and rejected access requests.
--        - Click "Approve" to grant recording/transcription access.
--        - Click "Reject" or "Revoke" with optional administrative feedback notes.
--
--   Optional SQL Shortcuts for Admins:
--     -- Grant access to a specific user for a specific category:
--     INSERT INTO public.category_access_requests (user_id, category_id, status, reviewed_at)
--     VALUES ('<USER_UUID>', '<CATEGORY_UUID>', 'approved', now())
--     ON CONFLICT (user_id, category_id) DO UPDATE SET status = 'approved', reviewed_at = now();
--
--     -- Grant access to all categories for all verified users (bulk grant):
--     INSERT INTO public.category_access_requests (user_id, category_id, status, reviewed_at)
--     SELECT p.id, c.id, 'approved', now()
--     FROM public.profiles p
--     CROSS JOIN public.categories c
--     WHERE p.verified = true
--     ON CONFLICT (user_id, category_id) DO UPDATE SET status = 'approved', reviewed_at = now();
--
-- STEP 4 — Configure Password Reset & Auth Redirect URLs:
--   To allow users to reset their passwords smoothly in your specific Supabase project:
--   1. In your Supabase Dashboard, go to:
--      Authentication → URL Configuration
--   2. Set "Site URL" to your application's domain:
--      - Local Development:  http://localhost:8080
--      - Production:         https://your-domain.com
--   3. Add your callback paths to "Redirect URLs":
--      - http://localhost:8080/update-password
--      - http://localhost:5173/update-password
--      - https://your-domain.com/update-password
--      - (Optional wildcards for preview deploys: https://*.vercel.app/update-password)
--   4. Check the Email Template in:
--      Authentication → Email Templates → Reset Password
--      Ensure the link uses the Confirmation URL:
--      <a href="{{ .ConfirmationURL }}">Reset Password</a>
--      (Supabase generates a secure recovery token and routes users directly to /update-password).
-- ==============================================================================
