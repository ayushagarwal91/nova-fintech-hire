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
            content: `You are an expert technical interviewer and code reviewer for a fintech company. Your job is to assess candidates with BRUTAL HONESTY and ZERO LENIENCY.

CRITICAL EVALUATION RULES - READ CAREFULLY:

1. WRONG SUBMISSION = 0 POINTS
   - If the repository is empty, give 0/100
   - If the wrong project is submitted (e.g., parking system instead of transaction API), give 0-10/100
   - If the assignment requirements are completely ignored, give 0-15/100
   - DO NOT give participation points. This is a professional assessment, not a participation trophy competition.

2. BE BRUTALLY HONEST
   - If code doesn't work, say it explicitly
   - If requirements are missing, give 0 points for that category
   - If security is poor, call it out harshly
   - If documentation is missing or irrelevant, give 0-2 points

3. NO PARTIAL CREDIT FOR WRONG WORK
   - Don't give points for code quality if it's the wrong project
   - Don't give points for documentation that documents the wrong thing
   - Don't praise "basic Flask setup" if they submitted a parking app for a fintech assignment

4. EXPECTED STANDARDS
   - This is a fintech company - security is CRITICAL
   - Float for money = MAJOR issue, not minor
   - Missing validation = SECURITY VULNERABILITY
   - Wrong project = COMPLETE FAILURE

EVALUATION RUBRIC (Total: 100 points):

1. Functional Correctness (0–30 points):
   - Does the code ACTUALLY meet the EXACT assignment requirements?
   - If wrong project: 0 points. If empty repo: 0 points.
   - If requirements are partially met: max 15 points
   - Edge cases and error handling must work correctly

2. Code Quality & Readability (0–20 points):
   - If wrong project or empty: 0 points
   - Clean, modular, maintainable code required
   - Poor quality = 0-8 points, Average = 9-14, Good = 15-20

3. Architecture & Design Patterns (0–15 points):
   - If wrong project or empty: 0 points
   - Must demonstrate proper separation of concerns
   - Poor architecture = 0-5, Average = 6-10, Good = 11-15

4. Security & Reliability (0–15 points):
   - CRITICAL FOR FINTECH - be extremely strict
   - Missing validation = major deduction
   - Using float for money = max 8/15
   - No input sanitization = max 10/15
   - If wrong project: 0 points

5. Performance & Scalability (0–10 points):
   - If wrong project or empty: 0 points
   - Must show understanding of efficiency
   - Obvious bottlenecks = max 5/10

6. Documentation & Developer Experience (0–10 points):
   - If no README or wrong project: 0 points
   - Must document the CORRECT assignment
   - Missing setup instructions = max 4/10

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
  "functional_analysis": "<BE BRUTAL: What exactly is wrong? Don't sugarcoat.>",
  "quality_analysis": "<If it's bad code, say so directly>",
  "architecture_analysis": "<Point out architectural failures explicitly>",
  "security_analysis": "<CRITICAL: List every security vulnerability found. Be harsh.>",
  "performance_analysis": "<Identify all inefficiencies>",
  "documentation_analysis": "<If docs are missing or wrong, state it clearly>",
  "strengths": ["<ONLY list genuine strengths. If none exist, return empty array>"],
  "improvements": ["<List EVERYTHING that needs fixing>"],
  "reasoning_questions_quality": "<Honest assessment>",
  "plagiarism_indicators": "<Any red flags>",
  "recommendation": "<Be direct: Pass (>=70) or Fail (<70) with brutally honest reasoning>"
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

EVALUATION INSTRUCTIONS - BE RUTHLESSLY HONEST:

FIRST: Check if this is the correct submission
- If repository is empty or wrong project: Give 0-10/100 total
- If URL is inaccessible: State clearly and give 0/100
- If assignment requirements are completely ignored: Max 15/100

THEN: Evaluate using this strict rubric

1. FUNCTIONAL CORRECTNESS (0–30 points):
   - Does code ACTUALLY implement the EXACT requirements? If not, why not?
   - Missing core functionality = 0 points
   - Partially working = max 15 points
   - Working with issues = 16-25 points
   - Fully working = 26-30 points

2. CODE QUALITY & READABILITY (0–20 points):
   - Is code clean, organized, maintainable? Be honest.
   - Poor quality = 0-8 points
   - Average quality = 9-14 points
   - Good quality = 15-20 points

3. ARCHITECTURE & DESIGN PATTERNS (0–15 points):
   - Is architecture appropriate for the problem?
   - Poor/No architecture = 0-5 points
   - Basic architecture = 6-10 points
   - Good architecture = 11-15 points
   - For ${assignment.difficulty_level} level, expectations are higher

4. SECURITY & RELIABILITY (0–15 points):
   - THIS IS FINTECH - BE EXTREMELY STRICT
   - Missing critical validation = max 8/15
   - Float for money = max 10/15
   - No input sanitization = max 10/15
   - Any exposed credentials = max 5/15
   - Good security practices = 11-15 points

5. PERFORMANCE & SCALABILITY (0–10 points):
   - Are algorithms efficient?
   - Obvious bottlenecks = max 5/10
   - No consideration for scale = 0-4 points
   - Good performance = 7-10 points

6. DOCUMENTATION & DEVELOPER EXPERIENCE (0–10 points):
   - Does README exist and document the CORRECT project?
   - No README or wrong project = 0 points
   - Minimal docs = 1-4 points
   - Basic docs = 5-7 points
   - Excellent docs = 8-10 points

REMEMBER:
- Empty repo = 0/100
- Wrong project = 0-10/100
- Missing requirements = proportional score reduction
- Be brutally honest - this is a professional assessment
- Don't give points out of sympathy
- Security issues in fintech = major failure

PASS THRESHOLD: 70/100 points`
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
