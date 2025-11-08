import { Badge } from "@/components/ui/badge";
import { CandidateStatus } from "@/types";

interface StatusBadgeProps {
  status: CandidateStatus;
}

const STATUS_COLORS: Record<CandidateStatus, string> = {
  'Applied': 'bg-muted text-muted-foreground',
  'Shortlisted': 'bg-accent/20 text-accent-foreground',
  'Assignment': 'bg-primary/20 text-primary',
  'Interview': 'bg-primary/30 text-primary',
  'Ranked': 'bg-accent text-accent-foreground',
  'Not Shortlisted': 'bg-destructive/20 text-destructive',
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <Badge className={STATUS_COLORS[status]}>
      {status}
    </Badge>
  );
};
