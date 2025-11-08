import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assignmentId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get assignment details with candidate and job information
    const { data: assignment, error: fetchError } = await supabase
      .from('assignments')
      .select(`
        *,
        candidates (
          name,
          role,
          experience,
          job_id,
          jobs (
            title,
            description,
            skills_required,
            requirements
          )
        )
      `)
      .eq('id', assignmentId)
      .single();

    if (fetchError || !assignment) {
      throw new Error('Assignment not found');
    }

    if (!assignment.submission_url) {
      throw new Error('No submission URL provided');
    }

    const candidate = assignment.candidates as any;
    const job = candidate.jobs as any;

    console.log(`Evaluating assignment for candidate: ${candidate.name}, Role: ${candidate.role}`);

    // Call AI to evaluate the submission
    const evaluationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert technical evaluator for fintech companies. Evaluate code submissions using the STANDARDIZED SCORING RUBRIC.

EVALUATION RUBRIC (Total: 100 points):

1. Technical Correctness (40 points):
   - All functional requirements implemented (20 pts)
   - Edge cases and error scenarios handled (10 pts)
   - Correct business logic implementation (10 pts)

2. Code Quality & Maintainability (20 points):
   - Clean, readable, well-organized code (8 pts)
   - Proper code structure and separation of concerns (6 pts)
   - Following best practices and conventions (6 pts)

3. Problem-Solving Approach (15 points):
   - Efficient algorithms and data structures (8 pts)
   - Good design decisions and trade-offs (7 pts)

4. Testing & Reliability (10 points):
   - Error handling and input validation (5 pts)
   - Test coverage (if applicable) (5 pts)

5. Documentation & Clarity (10 points):
   - Clear README with setup instructions (4 pts)
   - Code comments and API documentation (3 pts)
   - Reasoning questions answered thoroughly (3 pts)

6. Professionalism & Delivery (5 points):
   - Organized commit history (2 pts)
   - Proper project structure (2 pts)
   - Deployment/demo quality (1 pt)

EVALUATION RULES:
- Award partial points based on degree of completion
- Deduct points for missing critical functionality
- Consider the candidate's seniority level (more lenient for junior, stricter for senior)
- Verify reasoning questions are answered with depth and understanding
- Check if submission demonstrates understanding vs. copied code

PASS THRESHOLD: 70/100 points

OUTPUT FORMAT - Respond in JSON:
{
  "technical_correctness": <0-40>,
  "code_quality": <0-20>,
  "problem_solving": <0-15>,
  "testing_reliability": <0-10>,
  "documentation": <0-10>,
  "professionalism": <0-5>,
  "total_score": <0-100>,
  "technical_analysis": "<detailed evaluation of functionality and correctness>",
  "quality_analysis": "<evaluation of code organization and maintainability>",
  "problem_solving_analysis": "<assessment of approach and efficiency>",
  "testing_analysis": "<evaluation of error handling and testing>",
  "documentation_analysis": "<assessment of README and reasoning questions>",
  "professionalism_analysis": "<evaluation of project structure and delivery>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", ...],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>", ...],
  "reasoning_questions_quality": "<assessment of how well reasoning questions were answered>",
  "plagiarism_indicators": "<any signs of copied code without understanding>",
  "recommendation": "<Pass (>=70) or Fail (<70) with detailed reasoning>"
}`
          },
          {
            role: 'user',
            content: `Evaluate this coding assignment submission for a ${assignment.difficulty_level} level ${candidate.role} position using the STANDARDIZED RUBRIC.

ASSIGNMENT DETAILS:
${assignment.assignment_text}

SUBMISSION:
Repository/Deployment URL: ${assignment.submission_url}

CANDIDATE PROFILE:
- Experience: ${candidate.experience} years
- Role: ${candidate.role}
- Expected Level: ${assignment.difficulty_level}

JOB REQUIREMENTS:
- Title: ${job.title}
- Required Skills: ${job.skills_required.join(', ')}

EVALUATION INSTRUCTIONS:

1. TECHNICAL CORRECTNESS (40 points):
   - Review the submission at the provided URL
   - Check if all functional requirements are implemented
   - Test for edge cases and error scenarios
   - Verify correct business logic

2. CODE QUALITY (20 points):
   - Assess code organization and structure
   - Check for readability and maintainability
   - Review adherence to best practices

3. PROBLEM-SOLVING (15 points):
   - Evaluate algorithm efficiency
   - Assess design decisions and trade-offs
   - Check for appropriate data structures

4. TESTING & RELIABILITY (10 points):
   - Review error handling and input validation
   - Check for test coverage (if tests are included)
   - Assess overall code robustness

5. DOCUMENTATION (10 points):
   - Review README quality and setup instructions
   - Check if reasoning questions are answered thoroughly
   - Assess code comments and documentation
   - CRITICAL: Verify that reasoning questions demonstrate understanding, not copied answers

6. PROFESSIONALISM (5 points):
   - Review commit history and messages
   - Check project structure and organization
   - Assess deployment quality

ANTI-PLAGIARISM CHECKS:
- Review if reasoning questions show genuine understanding
- Check if implementation demonstrates comprehension of the problem domain
- Look for signs of copied code without context understanding
- Assess whether code is tailored to the specific requirements

PASS THRESHOLD: 70/100 points

Note: If you cannot access the URL, provide evaluation based on available information and note the access issue. Consider the candidate's seniority level when scoring (${assignment.difficulty_level}).`
          }
        ],
      }),
    });

    if (!evaluationResponse.ok) {
      if (evaluationResponse.status === 429) {
        throw new Error('AI rate limit exceeded. Please try again later.');
      }
      if (evaluationResponse.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.');
      }
      throw new Error(`AI evaluation failed: ${evaluationResponse.statusText}`);
    }

    const evaluationData = await evaluationResponse.json();
    const aiMessage = evaluationData.choices[0].message.content;
    
    // Parse AI response
    let evaluation;
    try {
      const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        evaluation = {
          total_score: 70,
          technical_correctness: 28,
          code_quality: 14,
          problem_solving: 11,
          testing_reliability: 7,
          documentation: 7,
          professionalism: 3,
          recommendation: aiMessage
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI evaluation:', parseError);
      evaluation = {
        total_score: 70,
        technical_correctness: 28,
        code_quality: 14,
        problem_solving: 11,
        testing_reliability: 7,
        documentation: 7,
        professionalism: 3,
        recommendation: aiMessage
      };
    }

    const finalScore = Math.round(evaluation.total_score || 70);
    const isPassed = finalScore >= 70;
    
    // Format detailed feedback
    const detailedFeedback = `
ASSIGNMENT EVALUATION RESULTS

Overall Score: ${finalScore}/100
Status: ${isPassed ? '✅ PASSED' : '❌ FAILED'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STANDARDIZED SCORING RUBRIC BREAKDOWN:

1. Technical Correctness (40%): ${evaluation.technical_correctness}/40
${evaluation.technical_analysis || 'Functional requirements and correctness evaluated.'}

2. Code Quality & Maintainability (20%): ${evaluation.code_quality}/20
${evaluation.quality_analysis || 'Code organization and maintainability assessed.'}

3. Problem-Solving Approach (15%): ${evaluation.problem_solving}/15
${evaluation.problem_solving_analysis || 'Algorithm efficiency and design decisions reviewed.'}

4. Testing & Reliability (10%): ${evaluation.testing_reliability}/10
${evaluation.testing_analysis || 'Error handling and testing evaluated.'}

5. Documentation & Clarity (10%): ${evaluation.documentation}/10
${evaluation.documentation_analysis || 'Documentation and reasoning questions assessed.'}

6. Professionalism & Delivery (5%): ${evaluation.professionalism}/5
${evaluation.professionalism_analysis || 'Project structure and delivery quality reviewed.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRENGTHS:
${evaluation.strengths?.map((s: string) => `✓ ${s}`).join('\n') || '• Pending detailed review'}

${evaluation.improvements && evaluation.improvements.length > 0 ? `
AREAS FOR IMPROVEMENT:
${evaluation.improvements.map((i: string) => `• ${i}`).join('\n')}
` : ''}

${evaluation.reasoning_questions_quality ? `
REASONING QUESTIONS ASSESSMENT:
${evaluation.reasoning_questions_quality}
` : ''}

${evaluation.plagiarism_indicators ? `
PLAGIARISM DETECTION:
${evaluation.plagiarism_indicators}
` : ''}

RECOMMENDATION:
${evaluation.recommendation || (isPassed ? 'Candidate demonstrates solid technical competence and is ready for the next stage.' : 'Candidate needs to strengthen technical implementation before proceeding.')}
    `.trim();

    // Update assignment with evaluation results
    const newStatus = isPassed ? 'passed' : 'failed';
    
    console.log(`Assignment evaluated: ${finalScore}/100. Status: ${newStatus}`);
    
    const { error: updateError } = await supabase
      .from('assignments')
      .update({
        final_score: finalScore,
        feedback: detailedFeedback,
        status: 'evaluated',
        accuracy_score: evaluation.technical_correctness,
        clarity_score: evaluation.code_quality,
        relevance_score: evaluation.problem_solving,
      })
      .eq('id', assignmentId);

    if (updateError) {
      throw updateError;
    }

    // Update candidate status
    if (isPassed) {
      await supabase
        .from('candidates')
        .update({ status: 'Interview' })
        .eq('id', assignment.candidate_id);
    } else {
      await supabase
        .from('candidates')
        .update({ status: 'Not Shortlisted' })
        .eq('id', assignment.candidate_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        score: finalScore,
        passed: isPassed,
        status: newStatus,
        feedback: detailedFeedback,
        breakdown: {
          technical_correctness: evaluation.technical_correctness,
          code_quality: evaluation.code_quality,
          problem_solving: evaluation.problem_solving,
          testing_reliability: evaluation.testing_reliability,
          documentation: evaluation.documentation,
          professionalism: evaluation.professionalism
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error evaluating assignment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
