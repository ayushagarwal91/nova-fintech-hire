import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Job } from "@/types";

interface JobSelectorProps {
  jobs: Job[];
  selectedJobId: string;
  onJobSelect: (jobId: string) => void;
}

export const JobSelector = ({ jobs, selectedJobId, onJobSelect }: JobSelectorProps) => {
  const selectedJob = jobs.find(job => job.id === selectedJobId);

  return (
    <div className="space-y-2">
      <Label htmlFor="job">Select Position</Label>
      <Select required value={selectedJobId} onValueChange={onJobSelect}>
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
          <p className="text-sm font-medium mt-2">
            Required Experience: {selectedJob.experience_required} years
          </p>
          <p className="text-sm font-medium">
            Skills: {selectedJob.skills_required.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
};
