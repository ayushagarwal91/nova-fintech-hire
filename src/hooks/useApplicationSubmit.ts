import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ApplicationFormData, Job } from "@/types";

export const useApplicationSubmit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitApplication = async (
    formData: ApplicationFormData,
    resumeFile: File | null,
    selectedJob: Job | undefined
  ) => {
    if (!resumeFile) {
      toast({
        title: "Resume Required",
        description: "Please upload your resume to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.jobId || !selectedJob) {
      toast({
        title: "Job Selection Required",
        description: "Please select a position to apply for.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload resume to storage
      const fileExt = resumeFile.name.split('.').pop();
      const fileName = `${Date.now()}-${formData.email}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, resumeFile);

      if (uploadError) throw uploadError;

      // Create candidate record
      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .insert({
          name: formData.name,
          email: formData.email,
          role: selectedJob.role as any,
          experience: selectedJob.experience_required,
          resume_url: uploadData.path,
          job_id: formData.jobId,
        })
        .select()
        .single();

      if (candidateError) throw candidateError;

      // Call AI resume analysis edge function
      const { error: analysisError } = await supabase.functions.invoke('analyze-resume', {
        body: { candidateId: candidate.id, resumePath: uploadData.path }
      });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        // Don't fail the submission if analysis fails
      }

      toast({
        title: "Application Submitted!",
        description: "We're analyzing your resume against the job requirements. You'll hear from us soon!",
      });

      navigate('/');
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitApplication, isSubmitting };
};
