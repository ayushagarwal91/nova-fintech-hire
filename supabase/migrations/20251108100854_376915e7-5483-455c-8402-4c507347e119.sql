-- Create enum for candidate roles
CREATE TYPE app_role AS ENUM ('Backend', 'Frontend', 'Data Analyst', 'ML', 'DevOps');

-- Create enum for candidate status
CREATE TYPE candidate_status AS ENUM ('Applied', 'Shortlisted', 'Assignment', 'Interview', 'Ranked', 'Not Shortlisted');

-- Create candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL,
  experience INTEGER NOT NULL,
  resume_url TEXT,
  resume_score INTEGER DEFAULT 0 CHECK (resume_score >= 0 AND resume_score <= 10),
  resume_feedback TEXT,
  status candidate_status DEFAULT 'Applied',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  assignment_text TEXT NOT NULL,
  submission_url TEXT,
  accuracy_score INTEGER DEFAULT 0 CHECK (accuracy_score >= 0 AND accuracy_score <= 10),
  clarity_score INTEGER DEFAULT 0 CHECK (clarity_score >= 0 AND clarity_score <= 10),
  relevance_score INTEGER DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 10),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create interviews table
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  questions JSONB NOT NULL,
  answers JSONB,
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create composite scores view
CREATE OR REPLACE VIEW public.candidate_rankings AS
SELECT 
  c.id,
  c.name,
  c.email,
  c.role,
  c.status,
  c.resume_score,
  COALESCE(a.accuracy_score + a.clarity_score + a.relevance_score, 0) / 3.0 as assignment_score,
  COALESCE(i.score, 0) as interview_score,
  (c.resume_score * 0.2 + 
   COALESCE((a.accuracy_score + a.clarity_score + a.relevance_score) / 3.0, 0) * 0.4 + 
   COALESCE(i.score, 0) * 0.4) as composite_score,
  c.created_at
FROM public.candidates c
LEFT JOIN public.assignments a ON c.id = a.candidate_id
LEFT JOIN public.interviews i ON c.id = i.candidate_id
ORDER BY composite_score DESC;

-- Enable RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (candidates can apply without auth)
CREATE POLICY "Anyone can insert candidates" ON public.candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view candidates" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Anyone can update candidates" ON public.candidates FOR UPDATE USING (true);

CREATE POLICY "Anyone can view assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert assignments" ON public.assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update assignments" ON public.assignments FOR UPDATE USING (true);

CREATE POLICY "Anyone can view interviews" ON public.interviews FOR SELECT USING (true);
CREATE POLICY "Anyone can insert interviews" ON public.interviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update interviews" ON public.interviews FOR UPDATE USING (true);

-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', false);

-- Create storage policies
CREATE POLICY "Anyone can upload resumes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resumes');
CREATE POLICY "Anyone can view resumes" ON storage.objects FOR SELECT USING (bucket_id = 'resumes');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_candidates
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_assignments
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_interviews
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();