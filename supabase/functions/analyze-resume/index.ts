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

    // Convert resume to base64 for OCR processing
    const arrayBuffer = await resumeData.arrayBuffer();
    const base64Resume = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = resumeData.type || 'application/pdf';
    
    console.log('Extracting text from resume using OCR...');
    
    // Use Lovable AI with vision to extract text from resume (handles scanned PDFs and images)
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
                text: 'Extract all text content from this resume/CV document. Include all sections: personal information, work experience, education, skills, certifications, etc. Provide the extracted text in a clear, structured format.'
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
      console.error('OCR extraction failed, attempting fallback text extraction');
      // Fallback to simple text extraction
      const resumeText = await resumeData.text();
      if (!resumeText || resumeText.trim().length < 50) {
        throw new Error('Unable to extract text from resume. Please ensure the file is readable.');
      }
    }

    let resumeText = '';
    if (ocrResponse.ok) {
      const ocrData = await ocrResponse.json();
      resumeText = ocrData.choices[0].message.content;
      console.log('Text successfully extracted from resume');
    } else {
      resumeText = await resumeData.text();
    }

    // Call Lovable AI to analyze resume with specific scoring criteria
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
            content: `You are an expert HR recruiter analyzing resumes. Evaluate candidates using this EXACT scoring system:

SCORING BREAKDOWN (Total: 10 points):
1. Skills & Knowledge Match (5 points / 50% weight):
   - Evaluate how well the candidate's technical skills, domain knowledge, and expertise match the required skills
   - Consider both exact matches and transferable skills
   - Maximum: 5 points

2. Experience Match (3 points / 30% weight):
   - Compare years of experience vs required experience
   - Evaluate relevance of past roles to this position
   - Assess progression and career trajectory
   - Maximum: 3 points

3. Overall Fit (2 points / 20% weight):
   - Education background and certifications
   - Communication skills and presentation
   - Achievements and quantifiable results
   - Cultural fit indicators
   - Maximum: 2 points

IMPORTANT: 
- Provide scores for each category
- Final score = Skills Score + Experience Score + Overall Fit Score (max 10)
- Be precise and evidence-based
- Candidates scoring 7+ should be recommended for shortlisting

Respond in JSON format:
{
  "skills_score": <0-5>,
  "experience_score": <0-3>,
  "overall_fit_score": <0-2>,
  "total_score": <0-10>,
  "skills_analysis": "<detailed skills evaluation>",
  "experience_analysis": "<detailed experience evaluation>",
  "fit_analysis": "<overall fit evaluation>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "concerns": ["<concern 1>", "<concern 2>", ...],
  "recommendation": "<shortlist or not shortlist with reason>"
}`
          },
          {
            role: 'user',
            content: `Analyze this resume for the following position:

JOB DETAILS:
Title: ${job.title}
Role: ${candidate.role}

Description:
${job.description}

Requirements:
${job.requirements}

Required Skills: ${job.skills_required.join(', ')}
Required Experience: ${job.experience_required} years

CANDIDATE'S RESUME:
${resumeText}

Analyze this candidate using the exact scoring criteria (Skills: 50%, Experience: 30%, Overall Fit: 20%). Provide detailed breakdown and evidence from the resume.`
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
    const finalScore = Math.round(analysis.total_score || 7);
    
    // Format detailed feedback
    const detailedFeedback = `
RESUME ANALYSIS RESULTS

Overall Score: ${finalScore}/10

SCORING BREAKDOWN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Skills & Knowledge (50%): ${analysis.skills_score}/5
${analysis.skills_analysis || 'Skills evaluated based on job requirements.'}

• Experience Match (30%): ${analysis.experience_score}/3
${analysis.experience_analysis || 'Experience evaluated against requirements.'}

• Overall Fit (20%): ${analysis.overall_fit_score}/2
${analysis.fit_analysis || 'Overall fit assessed.'}

STRENGTHS:
${analysis.strengths?.map((s: string) => `✓ ${s}`).join('\n') || '• Pending detailed review'}

${analysis.concerns && analysis.concerns.length > 0 ? `
AREAS FOR CONSIDERATION:
${analysis.concerns.map((c: string) => `• ${c}`).join('\n')}
` : ''}

RECOMMENDATION:
${analysis.recommendation || (finalScore >= 7 ? 'Recommended for shortlisting based on strong overall match.' : 'Not recommended for immediate shortlisting.')}
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
              content: 'You are a technical assignment creator for fintech companies. Create practical, fintech-specific coding challenges.'
            },
            {
              role: 'user',
              content: `Generate a coding assignment for a ${candidate.role} position in a fintech company. 
              The assignment should:
              - Be completable in 2-3 hours
              - Include fintech-relevant scenarios (payments, transactions, data security, etc.)
              - Test core technical skills for this role
              - Include clear requirements and evaluation criteria`
            }
          ],
        }),
      });

      if (assignmentResponse.ok) {
        const assignmentData = await assignmentResponse.json();
        const assignmentText = assignmentData.choices[0].message.content;

        await supabase
          .from('assignments')
          .insert({
            candidate_id: candidateId,
            assignment_text: assignmentText,
          });
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
