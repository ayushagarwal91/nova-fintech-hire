import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Upload, Loader2 } from "lucide-react";

const Apply = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    jobId: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setJobs(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resumeFile) {
      toast({
        title: "Resume Required",
        description: "Please upload your resume to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.jobId) {
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
          role: selectedJob.role,
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
            <div className="space-y-2">
              <Label htmlFor="job">Select Position</Label>
              <Select 
                required 
                value={formData.jobId} 
                onValueChange={(value) => {
                  const job = jobs.find(j => j.id === value);
                  setSelectedJob(job);
                  setFormData({ ...formData, jobId: value });
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Choose a position" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} - {job.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedJob && (
                <div className="mt-3 p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-medium">Job Description:</p>
                  <p className="text-sm text-muted-foreground">{selectedJob.description}</p>
                  <p className="text-sm font-medium mt-2">Required Experience: {selectedJob.experience_required} years</p>
                  <p className="text-sm font-medium">Skills: {selectedJob.skills_required.join(', ')}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resume">Resume (PDF)</Label>
              <div className="relative">
                <Input
                  id="resume"
                  type="file"
                  accept=".pdf"
                  required
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="h-12"
                />
                {resumeFile && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Selected: {resumeFile.name}
                  </p>
                )}
              </div>
            </div>

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
