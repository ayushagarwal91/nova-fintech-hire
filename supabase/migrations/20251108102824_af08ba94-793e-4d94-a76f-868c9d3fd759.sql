-- Fix security definer view by recreating without security definer
DROP VIEW IF EXISTS public.candidate_rankings;

CREATE VIEW public.candidate_rankings 
WITH (security_invoker=true)
AS
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

-- Fix function search path by recreating handle_updated_at with search_path set
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;