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
    // For PDF and image files, go OCR-FIRST (most reliable for resumes)
    else if (isPdfFile || isImageFile) {
      console.log(`Processing ${isPdfFile ? 'PDF' : 'image'} with OCR-first approach...`);
      
      // Convert to base64 efficiently using chunked processing
      const arrayBuffer = await resumeData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Efficient base64 conversion in chunks to prevent memory issues
      const chunkSize = 8192;
      const chunks: string[] = [];
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        chunks.push(String.fromCharCode(...chunk));
      }
      
      const base64Resume = btoa(chunks.join(''));
      
      // Use Lovable AI with vision capabilities for OCR
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
      resumeText = ocrData.choices?.[0]?.message?.content || '';
      
      if (!resumeText || resumeText.trim().length < 50) {
        throw new Error('OCR extraction returned insufficient text. Document may be unreadable.');
      }
      
      console.log(`AI vision extracted ${resumeText.length} characters from ${isPdfFile ? 'PDF' : 'image'}`);
    } else {
      // Unsupported file type - throw error
      throw new Error(`Unsupported file type: ${mimeType}. Please upload PDF, image, or text files only.`);
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
    
    // Parse AI response with robust error handling
    let analysis;
    try {
      // Remove markdown code blocks if present
      let cleanedMessage = aiMessage.trim();
      if (cleanedMessage.startsWith('```json')) {
        cleanedMessage = cleanedMessage.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedMessage.startsWith('```')) {
        cleanedMessage = cleanedMessage.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Extract JSON object using regex as fallback
      const jsonMatch = cleanedMessage.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : cleanedMessage;
      
      analysis = JSON.parse(jsonString);
      
      // Validate required fields
      if (typeof analysis.total_score !== 'number' || 
          typeof analysis.skills_score !== 'number' ||
          typeof analysis.experience_score !== 'number' ||
          typeof analysis.overall_fit_score !== 'number') {
        throw new Error('Missing required score fields in AI response');
      }
      
      // Clamp scores to valid ranges
      analysis.total_score = Math.max(0, Math.min(10, analysis.total_score));
      analysis.skills_score = Math.max(0, Math.min(5, analysis.skills_score));
      analysis.experience_score = Math.max(0, Math.min(3, analysis.experience_score));
      analysis.overall_fit_score = Math.max(0, Math.min(2, analysis.overall_fit_score));
      
      console.log('Successfully parsed AI analysis:', JSON.stringify(analysis, null, 2));
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw AI message:', aiMessage);
      
      // Safe fallback with logged error
      analysis = {
        total_score: 0,
        skills_score: 0,
        experience_score: 0,
        overall_fit_score: 0,
        skills_analysis: 'Error parsing AI response',
        experience_analysis: 'Error parsing AI response',
        fit_analysis: 'Error parsing AI response',
        strengths: [],
        concerns: ['AI response parsing failed - manual review required'],
        recommendation: 'Unable to complete automated analysis. Please review manually.',
        raw_response: aiMessage.substring(0, 500) // Include truncated raw response for debugging
      };
    }

    // Ensure we have a valid total_score
    const finalScore = Math.max(0, Math.min(10, Math.round(analysis.total_score || 0)));
    
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
              content: `You are an AI hiring system for a fintech company generating unique coding assignments for shortlisted candidates.

CORE MISSION:
Generate UNIQUE assignment variants for each candidate where:
- ALL candidates are tested on the SAME core competency
- But EACH receives a DIFFERENT version of the challenge
- Randomize dataset, input source, constraints, business logic, or UX requirement
- NO single-copy solution should exist

ASSIGNMENT GENERATION RULES:

1. SAME SKILL, DIFFERENT VARIANTS
   - All candidates test the same competency
   - Each receives a DIFFERENT version
   - Randomize: dataset, API source, constraints, business logic, or UI requirements
   - Make solutions non-transferable between variants
   - Use different fintech verticals: payments, lending, KYC, fraud detection, trading, insurance, EMI calculation, credit risk

2. DIFFICULTY MUST MATCH EXPERIENCE LEVEL
   Junior (0-2 years):
   - Simpler logic, one core feature
   - Limited edge cases
   - Basic validation and error handling
   - Simple file structure
   
   Mid-Level (2-5 years):
   - Multi-step logic, multiple features
   - Error handling required
   - Modularity and code organization
   - Security considerations
   - Some optimization
   
   Senior (5+ years):
   - Production-grade design
   - Scalability and performance optimization
   - Advanced security and edge cases
   - Comprehensive tests and documentation
   - System design considerations
   - Deployment-ready code

3. MUST BE FINTECH RELEVANT
   Include real-world fintech domain context:
   - Payment processing, transaction logs
   - KYC verification, identity validation
   - Fraud detection, risk scoring
   - EMI calculator, loan management
   - Credit risk assessment
   - Trading algorithms, portfolio management
   - Compliance and audit trails

4. TIME-BOUND REQUIREMENTS
   - Junior: 24-48 hours
   - Mid-level: 48-72 hours (2-3 days)
   - Senior: 72-120 hours (3-5 days)
   
   MUST include in assignment:
   "⏰ TIME LIMIT: You have {{time_limit}} hours to submit your solution after receiving this assignment."

5. SUBMISSION FORMAT (NON-NEGOTIABLE)
   ✅ MUST submit as GitHub repository (public or private with evaluator access)
   ✅ Repository MUST contain:
      - Working code with clear file structure
      - README.md with setup steps and run instructions
      - Answers to reasoning questions (see template)
      - Test cases (if applicable)
   ✅ OPTIONAL but recommended: Deployed link or live API URL
   
   🚫 ANTI-CHEAT MEASURES:
   - NO boilerplate code from AI generators (ChatGPT, Copilot, etc.) without understanding
   - Code will be evaluated for originality and domain understanding
   - OPTIONAL: Git commit history may be reviewed (gradual development vs. single commit dump)
   - Must answer reasoning questions that prove understanding

6. EVALUATION CRITERIA (Built into Assignment)
   
   The AI evaluator will score based on:
   
   | Criterion | Weight | What AI Checks |
   |-----------|--------|----------------|
   | Functional Correctness | 40% | All requirements work, edge cases handled, no crashes |
   | Code Quality & Structure | 20% | Clean, maintainable, follows best practices, proper naming |
   | Security & Edge Cases | 15% | Input validation, error handling, security considerations |
   | Documentation | 10% | Clear README, setup steps, reasoning answers, comments |
   | Fintech Domain Reasoning | 10% | Understanding of business logic, domain-specific decisions |
   | Professionalism | 5% | Git commits, project structure, deployment (if provided) |
   
   ⚠️ PENALTIES:
   - Empty/unrelated repo: 0/100
   - Wrong tech stack: 0-10/100
   - Missing core requirements: max 15/100
   - AI-generated boilerplate without reasoning: max 30/100
   - Single commit dump (no development history): -10 points

OUTPUT FORMAT:
# 🎯 Coding Assignment: [Unique Problem Title]
**Variant ID:** [Anti-Cheat ID]

---

## 📋 Problem Statement
[Clear, unique fintech problem with specific business context]

**Fintech Domain:** [Payments/Lending/KYC/Fraud/Trading/Insurance/etc.]

---

## 🎓 Experience Level
**Target:** [Junior/Mid/Senior]

---

## 🔧 Core Skills Being Tested
- [Skill 1 - e.g., REST API Design]
- [Skill 2 - e.g., Data Validation]
- [Skill 3 - e.g., Business Logic Implementation]

---

## 📦 Technical Requirements

**Tech Stack Required:**
- [Specific languages/frameworks for this variant]

**Functional Requirements:**
1. [Requirement 1 with specific fintech context]
2. [Requirement 2 with unique constraints]
3. [Requirement 3 with edge cases to consider]
4. [Additional requirements based on seniority]

**Input Format:**
\`\`\`
[Sample input structure]
\`\`\`

**Expected Output:**
\`\`\`
[Sample output structure]
\`\`\`

---

## ⏰ TIME LIMIT
**You have {{TIME_HOURS}} hours to submit your solution after receiving this assignment.**

---

## 📤 SUBMISSION REQUIREMENTS

**MANDATORY:**
1. ✅ GitHub Repository Link (public or private with access to: hr@company.com)
2. ✅ README.md must include:
   - Setup instructions (how to install dependencies)
   - How to run the project
   - How to run tests (if applicable)
   - Answers to reasoning questions (see below)
3. ✅ Working code with proper file structure
4. ✅ No AI-generated boilerplate without understanding

**OPTIONAL (Bonus Points):**
- Deployed link or live API endpoint
- Gradual Git commit history showing development process
- Additional tests or edge case handling

🚫 **PROHIBITED:**
- Zip file uploads
- Copy-pasted boilerplate from AI tools without customization
- Code without understanding (will be caught in reasoning questions)

---

## 🤔 REASONING QUESTIONS (REQUIRED IN README)

Answer these questions in your README.md under a section called "## Reasoning & Design Decisions":

1. **Fintech Domain Question:** [Specific question about business logic choice, e.g., "Why did you choose to handle currency conversion in this specific way?"]

2. **Technical Decision Question:** [Question about implementation choice, e.g., "Explain your error handling strategy and why it's suitable for a production payment system."]

---

## 📊 EVALUATION CRITERIA

Your submission will be evaluated by an AI system using this rubric:

| **Criterion** | **Weight** | **What We're Looking For** |
|---------------|------------|----------------------------|
| **Functional Correctness** | 40% | All requirements implemented, edge cases handled, no crashes |
| **Code Quality & Structure** | 20% | Clean, maintainable code with proper organization and naming |
| **Security & Edge Cases** | 15% | Input validation, error handling, security best practices |
| **Documentation** | 10% | Clear README, setup steps, reasoning answers |
| **Fintech Domain Reasoning** | 10% | Understanding of business context and domain-specific logic |
| **Professionalism & Delivery** | 5% | Git commits, project structure, deployment |

---

## ⚖️ FAIRNESS CONFIRMATION

This assignment variant tests the same core competencies as all other candidates:
- **[Core Skill 1]:** Tested through [specific requirement in this variant]
- **[Core Skill 2]:** Tested through [specific requirement in this variant]  
- **[Core Skill 3]:** Tested through [specific requirement in this variant]

All variants maintain identical difficulty and evaluation criteria.

---

## 🚀 Good Luck!

We're excited to see your solution. Focus on clean, maintainable code that demonstrates your understanding of both the technical stack and the fintech domain.`
            },
            {
              role: 'user',
              content: `Generate a UNIQUE coding assignment for a fintech company.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CANDIDATE PROFILE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Job Role: ${candidate.role}
- Experience Level: ${candidate.experience} years (${difficultyLevel})
- Unique Variant ID: ${antiCheatId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JOB REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Position: ${candidate.role}
- Core Skills to Test: ${job.skills_required.slice(0, 5).join(', ')}
- Tech Stack Context: ${job.skills_required.join(', ')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASSIGNMENT PARAMETERS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Time Limit: ${timeLimitHours} hours
- Difficulty: ${difficultyLevel}

CRITICAL REQUIREMENTS FOR THIS ASSIGNMENT:

1. 🎯 UNIQUENESS:
   - Use a DIFFERENT fintech vertical than common ones (choose from: KYC verification, credit risk scoring, fraud detection, EMI calculator, transaction reconciliation, trading algorithm, insurance premium calculation, loan management, wallet system)
   - Make the solution NON-TRANSFERABLE to other candidates
   - Include variant-specific constraints or data formats

2. ⚖️ SAME SKILL, DIFFERENT PROBLEM:
   - Test the EXACT same core skills: ${job.skills_required.slice(0, 3).join(', ')}
   - Maintain identical difficulty level and time requirement
   - Use same evaluation rubric

3. 🔐 ANTI-CHEAT:
   - Include 2 reasoning questions that prove domain understanding
   - Cannot be solved by copying ChatGPT boilerplate
   - Require fintech-specific business logic decisions

4. ⏰ TIME-BOUND:
   - Must be completable in ${timeLimitHours} hours
   - State clearly: "You have ${timeLimitHours} hours to submit after receiving this assignment"

5. 📤 SUBMISSION FORMAT:
   - GitHub repository ONLY (no zip uploads)
   - Must include README with setup steps and reasoning answers
   - NO AI-generated boilerplate allowed without understanding
   - Optional: Git commit history review (gradual development vs single dump)

6. 📊 EVALUATION CRITERIA:
   - Functional Correctness: 40%
   - Code Quality & Structure: 20%
   - Security & Edge Cases: 15%
   - Documentation: 10%
   - Fintech Domain Reasoning: 10%
   - Professionalism: 5%

Generate the complete assignment following the OUTPUT FORMAT template specified in the system prompt. Replace {{TIME_HOURS}} with ${timeLimitHours}.`
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
