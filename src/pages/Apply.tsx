import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Briefcase, Upload, Loader2 } from "lucide-react";
import { JobSelector } from "@/components/apply/JobSelector";
import { ApplicationForm } from "@/components/apply/ApplicationForm";
import { ResumeUpload } from "@/components/apply/ResumeUpload";
import { useJobs } from "@/hooks/useJobs";
import { useApplicationSubmit } from "@/hooks/useApplicationSubmit";
import { ApplicationFormData } from "@/types";

const Apply = () => {
  const { jobs } = useJobs();
  const { submitApplication, isSubmitting } = useApplicationSubmit();
  
  const [formData, setFormData] = useState<ApplicationFormData>({
    name: "",
    email: "",
    jobId: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const selectedJob = jobs.find(job => job.id === formData.jobId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitApplication(formData, resumeFile, selectedJob);
  };

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-2xl bg-accent p-4">
              <Briefcase className="h-12 w-12 text-accent-foreground" />
            </div>
          </div>
          <h1 className="mb-2 text-4xl font-bold text-white">Apply to NovaHire</h1>
          <p className="text-lg text-white/80">AI-powered fintech hiring made simple</p>
        </div>

        <Card className="mx-auto max-w-2xl border-0 shadow-elevated">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <JobSelector 
              jobs={jobs}
              selectedJobId={formData.jobId}
              onJobSelect={(jobId) => setFormData({ ...formData, jobId })}
            />

            <ApplicationForm 
              name={formData.name}
              email={formData.email}
              onNameChange={(name) => setFormData({ ...formData, name })}
              onEmailChange={(email) => setFormData({ ...formData, email })}
            />

            <ResumeUpload 
              resumeFile={resumeFile}
              onFileChange={setResumeFile}
            />

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-accent text-accent-foreground hover:opacity-90 transition-opacity"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Submit Application
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Apply;
