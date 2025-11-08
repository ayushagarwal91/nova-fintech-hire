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

    // Convert PDF to text (simplified - in production use a proper PDF parser)
    const resumeText = await resumeData.text();

    // Call Lovable AI to analyze resume
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
            content: `You are an expert technical recruiter specializing in fintech roles. 
            Analyze resumes and provide a job-fit score from 0-10 by comparing the candidate against the specific job requirements.
            
            Evaluate based on:
            - Match with required skills and technologies
            - Relevant industry experience (especially fintech)
            - Years of experience vs job requirements
            - Alignment with job description and responsibilities
            - Overall suitability for the specific role
            
            Respond in JSON format: {"score": <number>, "feedback": "<detailed feedback on how they match the job requirements>"}`
          },
          {
            role: 'user',
            content: `Analyze this resume for the following position:
            
            Job Title: ${job.title}
            Role: ${candidate.role}
            
            Job Description:
            ${job.description}
            
            Requirements:
            ${job.requirements}
            
            Required Skills: ${job.skills_required.join(', ')}
            Required Experience: ${job.experience_required} years
            
            Candidate's Resume:
            ${resumeText}
            
            Provide a detailed score (0-10) and feedback on how well this candidate matches the specific job requirements. Be specific about skills matches and gaps.`
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
      // Try to parse JSON from the response
      const jsonMatch = aiMessage.match(/\{[^}]+\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if JSON parsing fails
        analysis = {
          score: 7,
          feedback: aiMessage
        };
      }
    } catch {
      analysis = {
        score: 7,
        feedback: aiMessage
      };
    }

    // Update candidate with analysis results
    const newStatus = analysis.score >= 7 ? 'Shortlisted' : 'Not Shortlisted';
    
    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        resume_score: analysis.score,
        resume_feedback: analysis.feedback,
        status: newStatus,
      })
      .eq('id', candidateId);

    if (updateError) {
      throw updateError;
    }

    // If shortlisted, generate assignment
    if (analysis.score >= 7) {
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
        score: analysis.score,
        status: newStatus,
        feedback: analysis.feedback 
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
