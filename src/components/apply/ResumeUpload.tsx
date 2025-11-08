import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResumeUploadProps {
  resumeFile: File | null;
  onFileChange: (file: File | null) => void;
}

export const ResumeUpload = ({ resumeFile, onFileChange }: ResumeUploadProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="resume">Resume (PDF)</Label>
      <div className="relative">
        <Input
          id="resume"
          type="file"
          accept=".pdf"
          required
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="h-12"
        />
        {resumeFile && (
          <p className="mt-2 text-sm text-muted-foreground">
            Selected: {resumeFile.name}
          </p>
        )}
      </div>
    </div>
  );
};
