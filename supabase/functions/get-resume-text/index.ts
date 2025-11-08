import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { candidateId } = await req.json();
    
    console.log('Fetching resume text for candidate:', candidateId);

    // Fetch candidate with resume URL
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, name, resume_url')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      throw new Error('Candidate not found');
    }

    if (!candidate.resume_url) {
      throw new Error('No resume file found for this candidate');
    }

    console.log('Downloading resume:', candidate.resume_url);

    // Download resume from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(candidate.resume_url);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download resume: ${downloadError?.message}`);
    }

    console.log('Resume downloaded, size:', fileData.size);

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Try to extract text directly if it's a text file
    let resumeText = '';
    const textDecoder = new TextDecoder('utf-8');
    
    try {
      resumeText = textDecoder.decode(uint8Array);
      
      // Check if it looks like valid text
      if (resumeText.length < 50 || !/[a-zA-Z]/.test(resumeText.substring(0, 100))) {
        throw new Error('Not a text file, will use OCR');
      }
      
      console.log('Successfully extracted text directly');
    } catch {
      console.log('Not a plain text file, using AI vision for OCR');
      
      // Use AI vision to extract text from PDF/image
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableApiKey) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

      // Convert to base64
      const base64 = btoa(String.fromCharCode(...uint8Array));
      const mimeType = candidate.resume_url.toLowerCase().endsWith('.pdf') 
        ? 'application/pdf' 
        : 'image/jpeg';

      const visionResponse = await fetch('https://api.lovable.app/v1/ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract ALL text from this document/image. Return only the extracted text, no commentary.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 4000,
        }),
      });

      if (!visionResponse.ok) {
        throw new Error(`AI vision failed: ${visionResponse.statusText}`);
      }

      const visionData = await visionResponse.json();
      resumeText = visionData.choices[0]?.message?.content || '';
      
      console.log('Successfully extracted text using AI vision');
    }

    return new Response(
      JSON.stringify({
        success: true,
        candidateName: candidate.name,
        resumeText: resumeText,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
