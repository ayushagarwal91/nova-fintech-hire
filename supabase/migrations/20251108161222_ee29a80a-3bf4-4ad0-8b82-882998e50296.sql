-- Update constraints to match new fintech evaluation rubric
-- accuracy_score now stores functional_correctness (0-30)
-- clarity_score now stores code_quality (0-20)
-- relevance_score now stores architecture_design (0-15)

ALTER TABLE assignments 
DROP CONSTRAINT IF EXISTS assignments_accuracy_score_check;

ALTER TABLE assignments 
DROP CONSTRAINT IF EXISTS assignments_clarity_score_check;

ALTER TABLE assignments 
DROP CONSTRAINT IF EXISTS assignments_relevance_score_check;

ALTER TABLE assignments 
ADD CONSTRAINT assignments_accuracy_score_check 
CHECK (accuracy_score >= 0 AND accuracy_score <= 30);

ALTER TABLE assignments 
ADD CONSTRAINT assignments_clarity_score_check 
CHECK (clarity_score >= 0 AND clarity_score <= 20);

ALTER TABLE assignments 
ADD CONSTRAINT assignments_relevance_score_check 
CHECK (relevance_score >= 0 AND relevance_score <= 15);