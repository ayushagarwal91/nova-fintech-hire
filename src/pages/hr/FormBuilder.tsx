import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Eye, 
  Plus, 
  Settings, 
  FileText, 
  User,
  AlignLeft,
  List,
  Upload,
  Video,
  Hash,
  Calendar,
  GripVertical,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

interface FormField {
  id: string;
  type: 'short_text' | 'long_text' | 'multiple_choice' | 'number' | 'date' | 'file' | 'video';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

const FormBuilder = () => {
  const [activeSection, setActiveSection] = useState<'job' | 'form'>('job');
  const [jobData, setJobData] = useState({
    title: '',
    role: '',
    experience: '',
    description: '',
    skills: ''
  });
  const [formFields, setFormFields] = useState<FormField[]>([
    { id: '1', type: 'short_text', label: 'Full Name', required: true },
    { id: '2', type: 'short_text', label: 'Email Address', required: true },
  ]);

  const fieldTypeIcons = {
    short_text: FileText,
    long_text: AlignLeft,
    multiple_choice: List,
    number: Hash,
    date: Calendar,
    file: Upload,
    video: Video
  };

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: 'Untitled Question',
      required: false
    };
    setFormFields([...formFields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFormFields(formFields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const removeField = (id: string) => {
    setFormFields(formFields.filter(field => field.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Toolbar */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold">Form Builder</h1>
            <div className="flex gap-2">
              <Button 
                variant={activeSection === 'job' ? 'default' : 'ghost'}
                onClick={() => setActiveSection('job')}
                size="sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Job Description
              </Button>
              <Button 
                variant={activeSection === 'form' ? 'default' : 'ghost'}
                onClick={() => setActiveSection('form')}
                size="sm"
              >
                <User className="w-4 h-4 mr-2" />
                Candidate Form
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {activeSection === 'job' ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-6">Job Description</h2>
              <p className="text-muted-foreground mb-8">
                Define the role you're hiring for. This helps candidates understand the position better.
              </p>
            </div>

            <Card className="p-6 space-y-6 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="job-title">Job Title</Label>
                <Input
                  id="job-title"
                  placeholder="e.g. Senior Backend Developer"
                  value={jobData.title}
                  onChange={(e) => setJobData({...jobData, title: e.target.value})}
                  className="text-lg font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role Summary</Label>
                <Textarea
                  id="role"
                  placeholder="A brief overview of the role..."
                  value={jobData.role}
                  onChange={(e) => setJobData({...jobData, role: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience">Required Experience (years)</Label>
                  <Input
                    id="experience"
                    type="number"
                    placeholder="e.g. 3"
                    value={jobData.experience}
                    onChange={(e) => setJobData({...jobData, experience: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skills">Key Skills</Label>
                  <Input
                    id="skills"
                    placeholder="e.g. React, Node.js, SQL"
                    value={jobData.skills}
                    onChange={(e) => setJobData({...jobData, skills: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Full Job Description</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed responsibilities, requirements, and what makes this role exciting..."
                  value={jobData.description}
                  onChange={(e) => setJobData({...jobData, description: e.target.value})}
                  rows={6}
                />
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Candidate Application Form</h2>
                <p className="text-muted-foreground">
                  Build the form your candidates will fill out
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => addField('short_text')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Short Answer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addField('long_text')}>
                    <AlignLeft className="w-4 h-4 mr-2" />
                    Long Answer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addField('multiple_choice')}>
                    <List className="w-4 h-4 mr-2" />
                    Multiple Choice
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addField('number')}>
                    <Hash className="w-4 h-4 mr-2" />
                    Number
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addField('date')}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Date
                  </DropdownMenuItem>
                  <Separator className="my-1" />
                  <DropdownMenuItem onClick={() => addField('file')}>
                    <Upload className="w-4 h-4 mr-2" />
                    File Upload
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addField('video')}>
                    <Video className="w-4 h-4 mr-2" />
                    Video Recording
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-4">
              {formFields.map((field, index) => {
                const IconComponent = fieldTypeIcons[field.type];
                return (
                  <Card key={field.id} className="p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-4">
                      <div className="flex items-start pt-2">
                        <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                            <IconComponent className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 space-y-3">
                            <Input
                              value={field.label}
                              onChange={(e) => updateField(field.id, { label: e.target.value })}
                              className="font-medium border-none shadow-none text-base focus-visible:ring-0 px-0"
                              placeholder="Question text"
                            />
                            {field.type === 'short_text' && (
                              <Input
                                value={field.placeholder || ''}
                                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                placeholder="Placeholder text (optional)"
                                className="text-sm"
                              />
                            )}
                            {field.type === 'long_text' && (
                              <Textarea
                                value={field.placeholder || ''}
                                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                placeholder="Placeholder text (optional)"
                                rows={2}
                                className="text-sm"
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`required-${field.id}`}
                              checked={field.required}
                              onCheckedChange={(checked) => 
                                updateField(field.id, { required: checked as boolean })
                              }
                            />
                            <Label 
                              htmlFor={`required-${field.id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              Required
                            </Label>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeField(field.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Button 
              variant="outline" 
              className="w-full border-dashed"
              onClick={() => addField('short_text')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add another question
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default FormBuilder;
