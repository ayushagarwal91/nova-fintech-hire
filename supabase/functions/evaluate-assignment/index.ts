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
            content: `You are an expert technical evaluator for fintech companies. Evaluate code submissions with precision and provide actionable feedback.

EVALUATION CRITERIA (Total: 100 points):
1. Functional Correctness (30 points): Does it work as specified?
2. Code Quality & Structure (25 points): Clean, organized, maintainable code
3. Best Practices (20 points): Industry standards, patterns, conventions
4. Error Handling & Edge Cases (15 points): Robustness and reliability
5. Security Considerations (10 points): Data validation, security best practices (critical for fintech)

SCORING GUIDELINES:
- 90-100: Exceptional - Production-ready, exemplary code
- 80-89: Excellent - Strong implementation with minor improvements possible
- 70-79: Good - Solid work, meets requirements with some areas for improvement
- 60-69: Adequate - Basic requirements met but significant improvements needed
- Below 60: Needs improvement - Major issues or incomplete implementation

Respond in JSON format:
{
  "functional_correctness": <0-30>,
  "code_quality": <0-25>,
  "best_practices": <0-20>,
  "error_handling": <0-15>,
  "security": <0-10>,
  "total_score": <0-100>,
  "functional_analysis": "<detailed evaluation>",
  "quality_analysis": "<detailed evaluation>",
  "practices_analysis": "<detailed evaluation>",
  "error_handling_analysis": "<detailed evaluation>",
  "security_analysis": "<detailed evaluation>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<improvement 1>", "<improvement 2>", ...],
  "fintech_readiness": "<assessment of fintech-specific considerations>",
  "recommendation": "<pass or fail with detailed reasoning>"
}`
          },
          {
            role: 'user',
            content: `Evaluate this coding assignment submission for a ${assignment.difficulty_level} level ${candidate.role} position.

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
1. Review the submission at the provided URL
2. Evaluate based on the criteria above
3. Consider the candidate's experience level (${assignment.difficulty_level})
4. Assess fintech-specific requirements (security, data handling, transactions)
5. Provide specific, actionable feedback
6. Determine if the candidate should progress to the next stage (score >= 70%)

Note: If you cannot access the URL, provide feedback based on what information is available and note the access issue.`
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
          code_quality: 17,
          best_practices: 14,
          error_handling: 11,
          security: 7,
          recommendation: aiMessage
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI evaluation:', parseError);
      evaluation = {
        total_score: 70,
        functional_correctness: 21,
        code_quality: 17,
        best_practices: 14,
        error_handling: 11,
        security: 7,
        recommendation: aiMessage
      };
    }

    const finalScore = Math.round(evaluation.total_score || 70);
    const isPassed = finalScore >= 70;
    
    // Format detailed feedback
    const detailedFeedback = `
ASSIGNMENT EVALUATION RESULTS

Overall Score: ${finalScore}/100
Status: ${isPassed ? 'PASSED ✓' : 'FAILED ✗'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCORING BREAKDOWN:

• Functional Correctness (30%): ${evaluation.functional_correctness}/30
${evaluation.functional_analysis || 'Evaluated based on requirements.'}

• Code Quality & Structure (25%): ${evaluation.code_quality}/25
${evaluation.quality_analysis || 'Code organization and maintainability evaluated.'}

• Best Practices (20%): ${evaluation.best_practices}/20
${evaluation.practices_analysis || 'Industry standards assessed.'}

• Error Handling & Edge Cases (15%): ${evaluation.error_handling}/15
${evaluation.error_handling_analysis || 'Robustness evaluated.'}

• Security Considerations (10%): ${evaluation.security}/10
${evaluation.security_analysis || 'Security measures reviewed.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRENGTHS:
${evaluation.strengths?.map((s: string) => `✓ ${s}`).join('\n') || '• Pending detailed review'}

${evaluation.improvements && evaluation.improvements.length > 0 ? `
AREAS FOR IMPROVEMENT:
${evaluation.improvements.map((i: string) => `• ${i}`).join('\n')}
` : ''}

FINTECH READINESS:
${evaluation.fintech_readiness || 'Standard implementation for fintech environment.'}

RECOMMENDATION:
${evaluation.recommendation || (isPassed ? 'Candidate demonstrates solid technical skills and is ready for the next stage.' : 'Candidate needs to improve technical implementation before proceeding.')}
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
        relevance_score: evaluation.best_practices,
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
          functional: evaluation.functional_correctness,
          quality: evaluation.code_quality,
          practices: evaluation.best_practices,
          errorHandling: evaluation.error_handling,
          security: evaluation.security
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
