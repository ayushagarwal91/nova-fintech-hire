import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Plus } from "lucide-react";

const PostJob = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    role: "",
    description: "",
    requirements: "",
    skills: "",
    experience: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('jobs').insert({
        title: formData.title,
        role: formData.role as any,
        description: formData.description,
        requirements: formData.requirements,
        skills_required: formData.skills.split(',').map(s => s.trim()),
        experience_required: parseInt(formData.experience),
        status: 'open',
      });

      if (error) throw error;

      toast({
        title: "Job Posted!",
        description: "Your job posting is now live and accepting applications.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error posting job:', error);
      toast({
        title: "Failed to Post Job",
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
          <h1 className="mb-2 text-4xl font-bold text-white">Post a Job</h1>
          <p className="text-lg text-white/80">AI will screen candidates based on your requirements</p>
        </div>

        <Card className="mx-auto max-w-3xl border-0 shadow-elevated">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Senior Backend Engineer"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role Category</Label>
              <Select required value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select role category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Backend">Backend Engineer</SelectItem>
                  <SelectItem value="Frontend">Frontend Engineer</SelectItem>
                  <SelectItem value="Data Analyst">Data Analyst</SelectItem>
                  <SelectItem value="ML">ML Engineer</SelectItem>
                  <SelectItem value="DevOps">DevOps Engineer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job Description</Label>
              <Textarea
                id="description"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the role, responsibilities, and what makes this position exciting..."
                className="min-h-32"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Key Requirements</Label>
              <Textarea
                id="requirements"
                required
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="List the must-have qualifications, certifications, or experience..."
                className="min-h-32"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Required Skills (comma-separated)</Label>
              <Input
                id="skills"
                required
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="Python, PostgreSQL, AWS, Docker"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Minimum Years of Experience</Label>
              <Input
                id="experience"
                type="number"
                min="0"
                max="50"
                required
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                placeholder="5"
                className="h-12"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-accent text-accent-foreground hover:opacity-90 transition-opacity"
            >
              <Plus className="mr-2 h-5 w-5" />
              {isSubmitting ? "Posting..." : "Post Job"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default PostJob;