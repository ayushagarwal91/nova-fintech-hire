import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2 } from "lucide-react";

const FormPreview = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    experience: "",
    skills: [],
    projects: [""]
  });

  const addProject = () => {
    if (formData.projects.length < 10) {
      setFormData({
        ...formData,
        projects: [...formData.projects, ""]
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold">Thanks for applying!</h2>
          <p className="text-muted-foreground">
            We've received your application and will review it carefully. You'll hear from us soon.
          </p>
          <Button className="w-full mt-4" onClick={() => setSubmitted(false)}>
            Submit Another Application
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Bar */}
      <div className="sticky top-0 bg-card border-b z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Application Progress</span>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Form Content */}
      <main className="container mx-auto px-6 py-12 max-w-2xl">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Senior Backend Developer</h1>
            <p className="text-muted-foreground">
              Please fill out this application form. All required fields are marked with an asterisk (*).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Information */}
            <Card className="p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="text-lg font-semibold mb-1">Basic Information</h3>
                <p className="text-sm text-muted-foreground">
                  Let's start with your basic details
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">
                  Years of Experience <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="experience"
                  type="number"
                  placeholder="5"
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: e.target.value})}
                  required
                  className="h-12"
                />
              </div>
            </Card>

            {/* Step 2: Technical Background */}
            <Card className="p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="text-lg font-semibold mb-1">Technical Background</h3>
                <p className="text-sm text-muted-foreground">
                  Tell us about your technical expertise
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tech-stack">
                  Tech Stack <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tech-stack"
                  placeholder="e.g., React, Node.js, PostgreSQL"
                  required
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple technologies with commas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="why-join">
                  Why do you want to join our team? <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="why-join"
                  placeholder="Share what excites you about this opportunity..."
                  rows={5}
                  required
                />
              </div>
            </Card>

            {/* Step 3: Projects */}
            <Card className="p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="text-lg font-semibold mb-1">Your Projects</h3>
                <p className="text-sm text-muted-foreground">
                  Share links to your work (up to 10 projects)
                </p>
              </div>

              <div className="space-y-4">
                {formData.projects.map((project, index) => (
                  <div key={index} className="space-y-2">
                    <Label htmlFor={`project-${index}`}>
                      Project Link {index + 1} {index === 0 && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id={`project-${index}`}
                      type="url"
                      placeholder="https://github.com/username/project"
                      value={project}
                      onChange={(e) => {
                        const newProjects = [...formData.projects];
                        newProjects[index] = e.target.value;
                        setFormData({...formData, projects: newProjects});
                      }}
                      required={index === 0}
                      className="h-12"
                    />
                  </div>
                ))}
                
                {formData.projects.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addProject}
                    className="w-full border-dashed"
                  >
                    Add another project
                  </Button>
                )}
              </div>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="flex-1"
              >
                Previous
              </Button>
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                  className="flex-1"
                >
                  Next Step
                </Button>
              ) : (
                <Button type="submit" className="flex-1">
                  Submit Application
                </Button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default FormPreview;
