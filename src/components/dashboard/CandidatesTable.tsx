import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ScoreDisplay } from "@/components/shared/ScoreDisplay";
import { Candidate } from "@/types";

interface CandidatesTableProps {
  candidates: Candidate[];
  isLoading: boolean;
}

export const CandidatesTable = ({ candidates, isLoading }: CandidatesTableProps) => {
  if (isLoading) {
    return <p className="text-center text-muted-foreground py-8">Loading candidates...</p>;
  }

  if (candidates.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No candidates found</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Job Applied</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Resume Score</TableHead>
            <TableHead>Feedback</TableHead>
            <TableHead>Applied</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => {
            const job = candidate.jobs as any;
            return (
              <TableRow key={candidate.id}>
                <TableCell className="font-medium">{candidate.name}</TableCell>
                <TableCell>{candidate.email}</TableCell>
                <TableCell>{job?.title || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{candidate.role}</Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={candidate.status} />
                </TableCell>
                <TableCell>
                  <ScoreDisplay score={candidate.resume_score} />
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="truncate text-sm text-muted-foreground">
                    {candidate.resume_feedback || 'Pending analysis'}
                  </p>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(candidate.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
