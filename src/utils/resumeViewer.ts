import { supabase } from "@/integrations/supabase/client";

export const printResumeToConsole = async (candidateId: string) => {
  try {
    console.log('🔍 Fetching resume for candidate:', candidateId);
    
    const { data, error } = await supabase.functions.invoke('get-resume-text', {
      body: { candidateId },
    });

    if (error) {
      console.error('❌ Error fetching resume:', error);
      return;
    }

    if (!data.success) {
      console.error('❌ Failed to fetch resume:', data.error);
      return;
    }

    console.log('\n📄 ========================================');
    console.log(`📄 RESUME: ${data.candidateName}`);
    console.log('📄 ========================================\n');
    console.log(data.resumeText);
    console.log('\n📄 ======================================== END OF RESUME\n');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
};
