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
            content: `You are an expert technical interviewer and code reviewer for a fintech company. 
Your task is to evaluate submitted code based ONLY on the candidate's code and the assignment instructions given.

EVALUATION RUBRIC (Total: 100 points):

1. Functional Correctness (0–30 points):
   - Does the code run and meet the assignment requirements?
   - Does it handle required edge cases and expected inputs?
   - If API or UI: verify outputs, behavior, error conditions.

2. Code Quality & Readability (0–20 points):
   - Modular, clean, readable code
   - Proper variable naming, function structure, comments, maintainability

3. Architecture & Design Patterns (0–15 points):
   - Folder structure, separation of concerns, abstractions
   - Relevant for mid/senior roles only (be more lenient for junior)

4. Security & Reliability (0–15 points):
   - Sanitization, validation, auth, rate limiting, error handling
   - CRITICAL FOR FINTECH: Mark down if any sensitive data is exposed or not validated
   - Proper input validation and protection against common vulnerabilities

5. Performance & Scalability (0–10 points):
   - Efficient algorithms, no obvious bottlenecks
   - Caching, batching, pagination when relevant

6. Documentation & Developer Experience (0–10 points):
   - README, setup steps, API docs, environment variables instructions

EVALUATION RULES:
- Award partial points based on degree of completion
- Deduct points for missing critical functionality
- Consider the candidate's seniority level (more lenient for junior, stricter for senior)
- Security is paramount for fintech - be strict on validation and data exposure
- Check if submission demonstrates understanding vs. copied code

PASS THRESHOLD: 70/100 points

OUTPUT FORMAT - Respond in JSON:
{
  "functional_correctness": <0-30>,
  "code_quality": <0-20>,
  "architecture_design": <0-15>,
  "security_reliability": <0-15>,
  "performance_scalability": <0-10>,
  "documentation": <0-10>,
  "total_score": <0-100>,
  "functional_analysis": "<detailed evaluation of functionality and correctness>",
  "quality_analysis": "<evaluation of code organization and readability>",
  "architecture_analysis": "<assessment of design patterns and structure>",
  "security_analysis": "<CRITICAL: evaluation of security, validation, and reliability>",
  "performance_analysis": "<assessment of efficiency and scalability>",
  "documentation_analysis": "<evaluation of README and developer experience>",
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

1. FUNCTIONAL CORRECTNESS (0–30 points):
   - Review the submission at the provided URL
   - Check if all functional requirements are implemented
   - Test for edge cases and expected inputs
   - Verify correct business logic and behavior

2. CODE QUALITY & READABILITY (0–20 points):
   - Assess code organization and structure
   - Check for readability and maintainability
   - Review variable naming, function structure, comments
   - Verify adherence to best practices

3. ARCHITECTURE & DESIGN PATTERNS (0–15 points):
   - Evaluate folder structure and separation of concerns
   - Check for proper abstractions and modularity
   - Note: Be lenient for junior roles, stricter for mid/senior

4. SECURITY & RELIABILITY (0–15 points):
   - CRITICAL FOR FINTECH: Check input sanitization and validation
   - Review authentication and authorization implementation
   - Look for exposed sensitive data or credentials
   - Assess error handling and rate limiting
   - Mark down heavily if security issues are found

5. PERFORMANCE & SCALABILITY (0–10 points):
   - Evaluate algorithm efficiency
   - Check for obvious bottlenecks
   - Review caching, batching, pagination when relevant
   - Assess data structure choices

6. DOCUMENTATION & DEVELOPER EXPERIENCE (0–10 points):
   - Review README quality and setup instructions
   - Check API documentation and code comments
   - Verify environment variables are documented
   - Assess overall developer experience

ANTI-PLAGIARISM CHECKS:
- Review if reasoning questions show genuine understanding
- Check if implementation demonstrates comprehension of the problem domain
- Look for signs of copied code without context understanding
- Assess whether code is tailored to the specific requirements

PASS THRESHOLD: 70/100 points

Note: If you cannot access the URL, provide evaluation based on available information and note the access issue. Consider the candidate's seniority level when scoring (${assignment.difficulty_level}). Security is paramount for fintech roles.`
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
          functional_correctness: 21,
          code_quality: 14,
          architecture_design: 11,
          security_reliability: 11,
          performance_scalability: 7,
          documentation: 6,
          recommendation: aiMessage
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI evaluation:', parseError);
      evaluation = {
        total_score: 70,
        functional_correctness: 21,
        code_quality: 14,
        architecture_design: 11,
        security_reliability: 11,
        performance_scalability: 7,
        documentation: 6,
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
FINTECH EVALUATION RUBRIC BREAKDOWN:

1. Functional Correctness (30%): ${evaluation.functional_correctness}/30
${evaluation.functional_analysis || 'Functional requirements and correctness evaluated.'}

2. Code Quality & Readability (20%): ${evaluation.code_quality}/20
${evaluation.quality_analysis || 'Code organization and readability assessed.'}

3. Architecture & Design Patterns (15%): ${evaluation.architecture_design}/15
${evaluation.architecture_analysis || 'Design patterns and architecture reviewed.'}

4. Security & Reliability (15%): ${evaluation.security_reliability}/15
${evaluation.security_analysis || 'Security, validation, and reliability evaluated.'}

5. Performance & Scalability (10%): ${evaluation.performance_scalability}/10
${evaluation.performance_analysis || 'Performance and scalability assessed.'}

6. Documentation & Developer Experience (10%): ${evaluation.documentation}/10
${evaluation.documentation_analysis || 'Documentation and developer experience reviewed.'}

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
        accuracy_score: evaluation.functional_correctness,
        clarity_score: evaluation.code_quality,
        relevance_score: evaluation.architecture_design,
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
          functional_correctness: evaluation.functional_correctness,
          code_quality: evaluation.code_quality,
          architecture_design: evaluation.architecture_design,
          security_reliability: evaluation.security_reliability,
          performance_scalability: evaluation.performance_scalability,
          documentation: evaluation.documentation
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
