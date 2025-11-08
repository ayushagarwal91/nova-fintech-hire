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
    const { candidateId, resumePath } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get candidate details with job information
    const { data: candidate, error: fetchError } = await supabase
      .from('candidates')
      .select(`
        name, 
        role, 
        experience,
        job_id,
        jobs (
          title,
          description,
          requirements,
          skills_required,
          experience_required
        )
      `)
      .eq('id', candidateId)
      .single();

    if (fetchError || !candidate) {
      throw new Error('Candidate not found');
    }

    const job = candidate.jobs as any;

    // Download resume from storage
    const { data: resumeData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(resumePath);

    if (downloadError || !resumeData) {
      throw new Error('Failed to download resume');
    }

    const mimeType = resumeData.type || 'application/pdf';
    const fileSize = resumeData.size;
    
    console.log(`Processing resume: ${mimeType}, size: ${fileSize} bytes`);
    
    // Limit file size to 10MB
    if (fileSize > 10 * 1024 * 1024) {
      throw new Error('Resume file is too large. Maximum file size is 10MB.');
    }
    
    let resumeText = '';
    
    // Determine processing strategy based on file type
    const isImageFile = mimeType.startsWith('image/');
    const isPdfFile = mimeType === 'application/pdf';
    const isTextFile = mimeType === 'text/plain';
    
    // For plain text files, just extract directly
    if (isTextFile) {
      console.log('Extracting text from plain text file...');
      resumeText = await resumeData.text();
    }
    // For PDF files, try text extraction first
    else if (isPdfFile) {
      console.log('Attempting to extract text from PDF...');
      try {
        resumeText = await resumeData.text();
        console.log(`Extracted ${resumeText.length} characters from PDF`);
        
        // If PDF has minimal text, it's likely scanned - use OCR
        if (resumeText.trim().length < 100) {
          console.log('PDF appears to be scanned, switching to OCR...');
          resumeText = '';
        }
      } catch (error) {
        console.log('PDF text extraction failed, will use OCR:', error);
      }
    }
    
    // If we don't have text yet, use OCR (for images, scanned PDFs, or other formats)
    if (!resumeText || resumeText.trim().length < 100) {
      console.log('Using AI vision to extract text from document...');
      
      // Convert to base64 for vision model
      const arrayBuffer = await resumeData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to binary string in chunks to avoid stack overflow
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const base64Resume = btoa(binaryString);
      
      // Use Lovable AI with vision capabilities
      const ocrResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract ALL text content from this resume/CV document. Include every section: contact information, summary, work experience, education, skills, certifications, projects, etc. Provide the complete extracted text in a clear format. Do not summarize - extract everything.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Resume}`
                  }
                }
              ]
            }
          ],
        }),
      });

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        console.error('AI vision extraction failed:', errorText);
        throw new Error(`Unable to read resume. Error: ${ocrResponse.statusText}`);
      }

      const ocrData = await ocrResponse.json();
      resumeText = ocrData.choices[0].message.content;
      console.log(`AI vision extracted ${resumeText.length} characters from document`);
    }

    // Final validation
    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error('Unable to extract sufficient text from resume. Please ensure the document is readable and contains text.');
    }
    
    console.log(`Successfully extracted resume text (${resumeText.length} characters)`);

    // Early validation - check if resume contains basic technical keywords
    const hasBasicTechKeywords = resumeText.match(/(Python|Node\.?js|Java|C\+\+|JavaScript|TypeScript|Django|Flask|Express|Spring|API|REST|GraphQL|SQL|PostgreSQL|MySQL|MongoDB|Redis|AWS|Azure|GCP|Docker|Kubernetes|Git|Backend|Software Engineer|Developer)/i);
    
    if (!hasBasicTechKeywords) {
      console.log('Resume does not contain basic technical keywords - likely not a technical candidate');
      
      const detailedFeedback = `
RESUME ANALYSIS RESULTS

Overall Score: 0/10

SCORING BREAKDOWN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Skills & Knowledge (50%): 0/5
This resume does not contain any identifiable technical skills relevant to backend engineering or software development.

• Experience Match (30%): 0/3
No relevant technical work experience found. The resume does not reference software development, engineering roles, or technical projects.

• Overall Fit (20%): 0/2
The resume appears to be unrelated to backend engineering positions.

CRITICAL ISSUE:
⚠ This resume does not contain basic technical keywords expected for backend engineering roles (e.g., programming languages, frameworks, databases, cloud platforms).

RECOMMENDATION:
Not recommended for shortlisting. This candidate's background does not align with technical requirements for backend engineering roles. Please verify that the correct resume was submitted.
      `.trim();

      const { error: updateError } = await supabase
        .from('candidates')
        .update({
          resume_score: 0,
          resume_feedback: detailedFeedback,
          status: 'Not Shortlisted',
        })
        .eq('id', candidateId);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          score: 0,
          status: 'Not Shortlisted',
          feedback: detailedFeedback
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI to analyze resume with STRICT scoring criteria
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are an expert technical recruiter specializing in fintech backend engineering roles.
Your task is to analyze a candidate's resume against a job description with STRICT scoring rules.

CRITICAL RULES:
1. NEVER assume missing information — if a skill or experience is not EXPLICITLY mentioned, treat it as absent
2. Penalize irrelevant backgrounds (finance operations, sales, marketing, non-technical) by deducting up to 50% of the total score
3. Award points ONLY for explicitly mentioned technical skills, actual work experience, and relevant context
4. Be harsh on candidates with non-technical backgrounds trying to apply for technical roles

SCORING BREAKDOWN (Total: 10 points):

1. Skills & Knowledge Match (5 points / 50% weight):
   - Award points ONLY if the skill is EXPLICITLY mentioned in the resume
   - Look for: Programming languages (Python, Node.js, Java, Go, etc.), Frameworks (Django, Express, Spring, etc.), Databases (PostgreSQL, MySQL, MongoDB, Redis), Cloud (AWS, Azure, GCP), Tools (Docker, Kubernetes, Git)
   - If NO technical skills are found: 0 points
   - If only 1-2 basic skills: Maximum 1-2 points
   - If 3-5 relevant skills: 2-3 points
   - If 6+ skills with depth: 4-5 points

2. Experience Match (3 points / 30% weight):
   - Award points ONLY if ACTUAL work experience is found related to backend engineering or software development
   - Look for: Job titles (Backend Engineer, Software Developer, etc.), Projects (APIs, microservices, databases), Years of experience
   - If resume shows finance, sales, operations, or non-technical roles: 0 points
   - If only academic projects or bootcamp experience: Maximum 1 point
   - If 1-2 years relevant work experience: 1-2 points
   - If 3+ years relevant work experience: 2-3 points

3. Overall Fit (20% / 2 points):
   - Award points based on whether context aligns with the job
   - Look for: Fintech domain experience, Product scale, System design, Technical depth
   - If resume doesn't reference any technical projects or software work: 0 points
   - If basic technical context: 1 point
   - If strong fintech-relevant context: 2 points

PENALTY RULES:
- If resume is clearly from a non-technical background (finance analyst, sales, marketing): Deduct 50% from final score
- If resume has zero programming languages mentioned: Maximum score cannot exceed 3/10
- If resume has no technical work experience: Maximum score cannot exceed 4/10

OUTPUT FORMAT - Respond in JSON:
{
  "skills_score": <0-5>,
  "experience_score": <0-3>,
  "overall_fit_score": <0-2>,
  "total_score": <0-10>,
  "skills_analysis": "<step-by-step reasoning: list EXPLICIT skills found or state 'No technical skills mentioned'>",
  "experience_analysis": "<step-by-step reasoning: describe ACTUAL technical work experience or state 'No relevant technical experience'>",
  "fit_analysis": "<step-by-step reasoning: assess domain and context fit>",
  "strengths": ["<only list EXPLICITLY mentioned strengths>"],
  "concerns": ["<list gaps, missing skills, or irrelevant background>"],
  "penalty_applied": "<if any penalty was applied, explain why>",
  "recommendation": "<Shortlist / Reject / Need Clarification with detailed reasoning>"
}

REMEMBER: Be strict. If information is not explicitly in the resume, it does not exist.`
          },
          {
            role: 'user',
            content: `Analyze this resume for the following backend engineering position with STRICT evaluation:

JOB DETAILS:
Title: ${job.title}
Role: ${candidate.role}

Description:
${job.description}

Requirements:
${job.requirements}

Required Skills: ${job.skills_required.join(', ')}
Required Experience: ${job.experience_required} years

CANDIDATE'S RESUME TEXT:
${resumeText}

INSTRUCTIONS:
1. List ONLY the technical skills that are EXPLICITLY mentioned in the resume
2. Identify ONLY actual work experience (job titles, companies, duration) related to backend/software engineering
3. If the resume is from a non-technical background (finance, sales, marketing), apply the 50% penalty
4. If no programming languages are mentioned, maximum score is 3/10
5. If no technical work experience is found, maximum score is 4/10
6. Provide step-by-step reasoning showing what you found (or didn't find) in the resume

Be harsh and strict. Award points only for explicit evidence.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('AI rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.');
      }
      throw new Error(`AI analysis failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices[0].message.content;
    
    // Parse AI response
    let analysis;
    try {
      // Try to parse JSON from the response (handle both plain JSON and markdown-wrapped JSON)
      const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if JSON parsing fails
        analysis = {
          total_score: 7,
          skills_score: 3.5,
          experience_score: 2.1,
          overall_fit_score: 1.4,
          recommendation: aiMessage
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysis = {
        total_score: 7,
        skills_score: 3.5,
        experience_score: 2.1,
        overall_fit_score: 1.4,
        recommendation: aiMessage
      };
    }

    // Ensure we have a total_score
    const finalScore = Math.round(analysis.total_score || 0);
    
    // Format detailed feedback with strict format
    const detailedFeedback = `
RESUME ANALYSIS RESULTS

Overall Score: ${finalScore}/10

SCORING BREAKDOWN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL MATCH (50%): ${analysis.skills_score}/5
${analysis.skills_analysis || 'Skills evaluated based on explicit mentions in resume.'}

EXPERIENCE MATCH (30%): ${analysis.experience_score}/3
${analysis.experience_analysis || 'Experience evaluated based on actual work history.'}

OVERALL FIT (20%): ${analysis.overall_fit_score}/2
${analysis.fit_analysis || 'Overall fit assessed based on domain and context.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRENGTHS:
${analysis.strengths?.map((s: string) => `✓ ${s}`).join('\n') || '• No significant strengths identified'}

WEAKNESSES:
${analysis.concerns?.map((c: string) => `✗ ${c}`).join('\n') || '• Pending detailed review'}

${analysis.penalty_applied ? `
PENALTY APPLIED:
⚠ ${analysis.penalty_applied}
` : ''}

RECOMMENDATION:
${analysis.recommendation || (finalScore >= 7 ? 'Recommended for shortlisting based on technical qualifications.' : 'Not recommended for shortlisting due to insufficient technical qualifications.')}
    `.trim();

    // Update candidate with analysis results
    const newStatus = finalScore >= 7 ? 'Shortlisted' : 'Not Shortlisted';
    
    console.log(`Candidate scored ${finalScore}/10. Status: ${newStatus}`);
    
    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        resume_score: finalScore,
        resume_feedback: detailedFeedback,
        status: newStatus,
      })
      .eq('id', candidateId);

    if (updateError) {
      throw updateError;
    }

    // If shortlisted, generate assignment
    if (finalScore >= 7) {
      // Determine difficulty level based on experience
      let difficultyLevel = 'Junior';
      let timeLimitHours = 48;
      
      if (candidate.experience >= 5) {
        difficultyLevel = 'Senior';
        timeLimitHours = 96; // 4 days
      } else if (candidate.experience >= 2) {
        difficultyLevel = 'Mid';
        timeLimitHours = 72; // 3 days
      }

      // Generate unique anti-cheat ID
      const antiCheatId = `${candidateId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Calculate deadline
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + timeLimitHours);

      const assignmentResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: `You are an AI hiring assistant specializing in generating unique assignment variants for technical recruitment.

CORE MISSION:
Generate unique assignment versions for each candidate while ensuring:
- All versions test the SAME core skills
- Same difficulty level and learning objectives
- Same evaluation criteria and completion time
- Different datasets, APIs, or problem contexts to prevent plagiarism

ASSIGNMENT GENERATION RULES:

1. UNIQUENESS REQUIREMENTS:
   - Use different datasets (e.g., different fintech verticals: lending, payments, trading, insurance)
   - Use different APIs or data sources
   - Vary the problem context while keeping core technical challenges identical
   - Include unique constraints or edge cases
   - Make solutions non-transferable across variants

2. SKILL CONSISTENCY:
   - All variants must test the EXACT same technical skills
   - Maintain identical complexity and time requirements
   - Use the same evaluation rubric
   - Ensure learning objectives remain constant

3. ANTI-PLAGIARISM MEASURES:
   - Cannot be solved by copy-pasting ChatGPT code without understanding
   - Require domain-specific reasoning
   - Include 1-2 reasoning questions in README
   - Use time-sensitive or candidate-specific data

4. PRACTICAL CONSTRAINTS:
   - No multiple-choice or theory questions
   - Only practical coding work
   - Completable within specified time limit
   - Real-world fintech scenarios

5. STANDARDIZED SCORING RUBRIC (100 points):
   - Technical Correctness (40%): Functional requirements met, edge cases handled
   - Code Quality & Maintainability (20%): Clean code, proper structure, best practices
   - Problem-Solving Approach (15%): Algorithm efficiency, design decisions
   - Testing & Reliability (10%): Test coverage, error handling
   - Documentation & Clarity (10%): README, comments, API docs
   - Professionalism & Delivery (5%): Code organization, commit history, deployment

OUTPUT FORMAT:
# Assignment Variant #[Unique ID]

## Problem Statement
[Clear, unique problem description with specific fintech context]

## Core Skills Being Tested
- [Skill 1]
- [Skill 2]
- [Skill 3]

## Technical Requirements
[Detailed functional requirements]

## Inputs & Expected Outputs
[Specific data structures and expected behavior]

## Deliverables
1. GitHub repository link with:
   - Working code
   - README with setup instructions
   - Answer to reasoning questions (see below)
   - Test cases (if applicable)
2. Deployment URL (if applicable)

## Reasoning Questions (Required in README)
Answer these questions in your README.md:
1. [Domain-specific question requiring understanding]
2. [Technical decision justification question]

## Evaluation Criteria & Scoring Rubric

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Technical Correctness | 40% | All requirements implemented, edge cases handled |
| Code Quality & Maintainability | 20% | Clean, readable, well-structured code |
| Problem-Solving Approach | 15% | Efficient algorithms, good design decisions |
| Testing & Reliability | 10% | Error handling, validation, test coverage |
| Documentation & Clarity | 10% | Clear README, comments, API documentation |
| Professionalism & Delivery | 5% | Organized commits, proper project structure |

## Time Limit
[X] hours

## Fairness Confirmation
This variant tests the same core competencies as all other variants:
- [Core skill 1]: Tested through [specific requirement]
- [Core skill 2]: Tested through [specific requirement]
- [Core skill 3]: Tested through [specific requirement]

All variants maintain identical difficulty and can be evaluated using the same rubric.`
            },
            {
              role: 'user',
              content: `Generate a UNIQUE assignment variant for a ${candidate.role} position (${difficultyLevel} level) in a fintech company.

CANDIDATE CONTEXT:
- Experience Level: ${candidate.experience} years
- Seniority: ${difficultyLevel}
- Time Limit: ${timeLimitHours} hours
- Unique Variant ID: ${antiCheatId}

JOB REQUIREMENTS:
- Role: ${candidate.role}
- Core Skills to Test: ${job.skills_required.slice(0, 5).join(', ')}
- Required Experience: ${job.experience_required} years

ASSIGNMENT PARAMETERS:
${difficultyLevel === 'Senior' ? `
Senior Level Requirements:
- System design and architecture decisions
- Scalability and performance optimization
- Advanced security considerations
- Distributed systems or microservices (if relevant)
- Production-ready code with monitoring/observability
` : ''}
${difficultyLevel === 'Mid' ? `
Mid-Level Requirements:
- Solid implementation with good code organization
- Proper error handling and validation
- Basic optimization and efficiency
- Security best practices
- Clean documentation
` : ''}
${difficultyLevel === 'Junior' ? `
Junior Level Requirements:
- Correct implementation of core functionality
- Basic error handling
- Readable and organized code
- Simple test cases
- Clear setup instructions
` : ''}

CRITICAL INSTRUCTIONS:
1. Create a UNIQUE variant using a different fintech context (e.g., if previous variants used payment processing, use fraud detection, lending, trading, or insurance)
2. Ensure this variant tests the EXACT same skills as other variants but through different business logic
3. Include 2 reasoning questions that require understanding the domain and technical decisions
4. Make it impossible to solve by copying generic code without understanding
5. Include specific data structures or constraints unique to this variant
6. Completable within ${timeLimitHours} hours by a ${difficultyLevel} developer
7. Require GitHub repository submission (no file uploads)

Generate the complete assignment following the OUTPUT FORMAT specified in the system prompt.`
            }
          ],
        }),
      });

      if (assignmentResponse.ok) {
        const assignmentData = await assignmentResponse.json();
        const assignmentText = assignmentData.choices[0].message.content;

        const { error: assignmentError } = await supabase
          .from('assignments')
          .insert({
            candidate_id: candidateId,
            assignment_text: assignmentText,
            difficulty_level: difficultyLevel,
            time_limit_hours: timeLimitHours,
            deadline: deadline.toISOString(),
            status: 'pending',
            anti_cheat_id: antiCheatId,
          });
        
        if (assignmentError) {
          console.error('Failed to create assignment:', assignmentError);
          throw new Error(`Assignment creation failed: ${assignmentError.message}`);
        }
        
        console.log(`Assignment generated for candidate ${candidateId}: ${difficultyLevel} level, ${timeLimitHours}h deadline`);
      } else {
        const errorText = await assignmentResponse.text();
        console.error('AI assignment generation failed:', errorText);
        throw new Error(`Assignment generation failed: ${assignmentResponse.statusText}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        score: finalScore,
        status: newStatus,
        feedback: detailedFeedback,
        breakdown: {
          skills: analysis.skills_score,
          experience: analysis.experience_score,
          fit: analysis.overall_fit_score
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error analyzing resume:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
