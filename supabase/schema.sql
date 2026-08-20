-- ==============================================================================
-- PHASE 1: SUPABASE DATABASE SCHEMA & RLS POLICIES (თომთემატიკა)
-- ==============================================================================

-- 1. Enable pgcrypto for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Parent Profile)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can select their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. CHILDREN (Child Profiles owned by Parent)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_id TEXT NOT NULL DEFAULT 'avatar_1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT children_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Enable RLS for children
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

-- Children Policies
CREATE POLICY "Parents can select their children"
  ON public.children
  FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can insert children"
  ON public.children
  FOR INSERT
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can update their children"
  ON public.children
  FOR UPDATE
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can delete their children"
  ON public.children
  FOR DELETE
  USING (parent_id = auth.uid());

-- Index for parent lookup
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON public.children(parent_id);

-- ------------------------------------------------------------------------------
-- 3. GAME_SESSIONS (Session records per game mode)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  game_mode TEXT NOT NULL,
  total_questions INT NOT NULL DEFAULT 0,
  total_correct INT NOT NULL DEFAULT 0,
  perfect_blocks_count INT NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_session_counts CHECK (total_correct <= total_questions AND total_questions >= 0 AND total_correct >= 0),
  CONSTRAINT check_session_status CHECK (status IN ('active', 'completed', 'abandoned'))
);

-- Enable RLS for game_sessions
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Game Sessions Policies
CREATE POLICY "Parents can select child game sessions"
  ON public.game_sessions
  FOR SELECT
  USING (
    child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents can insert child game sessions"
  ON public.game_sessions
  FOR INSERT
  WITH CHECK (
    child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents can update child game sessions"
  ON public.game_sessions
  FOR UPDATE
  USING (
    child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid())
  )
  WITH CHECK (
    child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents can delete child game sessions"
  ON public.game_sessions
  FOR DELETE
  USING (
    child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_child_id ON public.game_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_child_started ON public.game_sessions(child_id, started_at DESC);

-- ------------------------------------------------------------------------------
-- 4. WISHES (39/40 and 40/40 Qualified Wishes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  wish_text TEXT NOT NULL,
  correct_count INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_wish_correct_count CHECK (correct_count IN (39, 40)),
  CONSTRAINT check_wish_status CHECK (status IN ('pending', 'fulfilled')),
  CONSTRAINT check_wish_text_not_empty CHECK (LENGTH(TRIM(wish_text)) > 0)
);

-- Enable RLS for wishes
ALTER TABLE public.wishes ENABLE ROW LEVEL SECURITY;

-- Wishes Policies
CREATE POLICY "Parents can select child wishes"
  ON public.wishes
  FOR SELECT
  USING (
    child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents can insert child wishes"
  ON public.wishes
  FOR INSERT
  WITH CHECK (
    child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents can update child wishes"
  ON public.wishes
  FOR UPDATE
  USING (
    child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid())
  )
  WITH CHECK (
    child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents can delete child wishes"
  ON public.wishes
  FOR DELETE
  USING (
    child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_wishes_child_id ON public.wishes(child_id);

-- ------------------------------------------------------------------------------
-- 5. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
