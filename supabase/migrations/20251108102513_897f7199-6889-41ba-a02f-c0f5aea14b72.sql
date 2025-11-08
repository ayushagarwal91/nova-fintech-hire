-- Create jobs table for hirers to post positions
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  role app_role NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  skills_required TEXT[] NOT NULL DEFAULT '{}',
  experience_required INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add job_id to candidates table
ALTER TABLE public.candidates 
ADD COLUMN job_id UUID REFERENCES public.jobs(id);

-- Enable RLS for jobs table
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Anyone can view open jobs
CREATE POLICY "Anyone can view open jobs"
ON public.jobs
FOR SELECT
USING (status = 'open');

-- Anyone can insert jobs (in production, restrict to authenticated hirers)
CREATE POLICY "Anyone can insert jobs"
ON public.jobs
FOR INSERT
WITH CHECK (true);

-- Anyone can update jobs
CREATE POLICY "Anyone can update jobs"
ON public.jobs
FOR UPDATE
USING (true);

-- Add trigger for updated_at on jobs
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Update candidate_rankings view to include job information
DROP VIEW IF EXISTS public.candidate_rankings;

CREATE VIEW public.candidate_rankings AS
SELECT 
  c.id,
  c.name,
  c.email,
  c.role,
  c.status,
  c.resume_score,
  c.created_at,
  c.job_id,
  j.title as job_title,
  COALESCE(
    (SELECT AVG((a.clarity_score + a.relevance_score + a.accuracy_score) / 3.0)
     FROM assignments a
     WHERE a.candidate_id = c.id), 0
  ) as assignment_score,
  COALESCE(
    (SELECT AVG(i.score)
     FROM interviews i
     WHERE i.candidate_id = c.id), 0
  ) as interview_score,
  (
    COALESCE(c.resume_score, 0) * 0.2 +
    COALESCE(
      (SELECT AVG((a.clarity_score + a.relevance_score + a.accuracy_score) / 3.0)
       FROM assignments a
       WHERE a.candidate_id = c.id), 0
    ) * 0.4 +
    COALESCE(
      (SELECT AVG(i.score)
       FROM interviews i
       WHERE i.candidate_id = c.id), 0
    ) * 0.4
  ) as composite_score
FROM candidates c
LEFT JOIN jobs j ON c.job_id = j.id;