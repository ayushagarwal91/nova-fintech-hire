import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Assignment } from "@/hooks/useAssignments";
import { Clock, ExternalLink, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface AssignmentsTableProps {
  assignments: Assignment[];
  isLoading: boolean;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'pending': 'bg-muted text-muted-foreground',
    'submitted': 'bg-primary/20 text-primary',
    'evaluated': 'bg-accent/20 text-accent-foreground',
    'passed': 'bg-accent text-accent-foreground',
    'failed': 'bg-destructive/20 text-destructive',
  };
  return colors[status] || 'bg-muted text-muted-foreground';
};

const getDifficultyColor = (level: string) => {
  const colors: Record<string, string> = {
    'Junior': 'bg-primary/10 text-primary border-primary/20',
    'Mid': 'bg-accent/10 text-accent border-accent/20',
    'Senior': 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return colors[level] || 'bg-muted text-muted-foreground';
};

const getTimeRemaining = (deadline: string) => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();
  
  if (diff < 0) return { text: 'Expired', color: 'text-destructive', isExpired: true };
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return { 
      text: `${days}d ${hours % 24}h left`, 
      color: days > 2 ? 'text-foreground' : 'text-primary',
      isExpired: false 
    };
  }
  
  return { 
    text: `${hours}h left`, 
    color: hours > 12 ? 'text-primary' : 'text-destructive',
    isExpired: false 
  };
};

export const AssignmentsTable = ({ assignments, isLoading }: AssignmentsTableProps) => {
  const [evaluating, setEvaluating] = useState<string | null>(null);

  const handleEvaluate = async (assignmentId: string) => {
    try {
      setEvaluating(assignmentId);
      
      const { data, error } = await supabase.functions.invoke('evaluate-assignment', {
        body: { assignmentId }
      });

      if (error) throw error;

      toast.success(`Assignment evaluated: ${data.score}/100 - ${data.passed ? 'Passed' : 'Failed'}`);
      
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error: any) {
      console.error('Evaluation error:', error);
      toast.error(error.message || 'Failed to evaluate assignment');
    } finally {
      setEvaluating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading assignments...</div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No assignments yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Assignments are automatically generated when candidates are shortlisted
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Candidate</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Level</TableHead>
          <TableHead>Time Remaining</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Submission</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((assignment) => {
          const timeRemaining = assignment.deadline 
            ? getTimeRemaining(assignment.deadline)
            : { text: 'No deadline', color: 'text-muted-foreground', isExpired: false };
          const candidate = assignment.candidates;
          
          return (
            <TableRow key={assignment.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{candidate?.name}</div>
                  <div className="text-sm text-muted-foreground">{candidate?.email}</div>
                </div>
              </TableCell>
              <TableCell>{candidate?.role}</TableCell>
              <TableCell>
                {assignment.difficulty_level ? (
                  <Badge className={getDifficultyColor(assignment.difficulty_level)}>
                    {assignment.difficulty_level}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">Not set</span>
                )}
              </TableCell>
              <TableCell>
                {assignment.status === 'pending' && assignment.deadline ? (
                  <div className={`flex items-center gap-2 ${timeRemaining.color}`}>
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">{timeRemaining.text}</span>
                  </div>
                ) : assignment.status === 'pending' ? (
                  <span className="text-muted-foreground text-sm">No deadline set</span>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    Submitted {formatDistanceToNow(new Date(assignment.updated_at))} ago
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(assignment.status)}>
                  {assignment.status}
                </Badge>
              </TableCell>
              <TableCell>
                {assignment.final_score > 0 ? (
                  <span className={`font-semibold ${assignment.final_score >= 70 ? 'text-accent' : 'text-destructive'}`}>
                    {assignment.final_score}/100
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {assignment.submission_url ? (
                  <a 
                    href={assignment.submission_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View
                  </a>
                ) : (
                  <span className="text-muted-foreground text-sm">Not submitted</span>
                )}
              </TableCell>
              <TableCell>
                {assignment.submission_url && assignment.status === 'submitted' && (
                  <Button
                    size="sm"
                    onClick={() => handleEvaluate(assignment.id)}
                    disabled={evaluating === assignment.id}
                  >
                    {evaluating === assignment.id ? 'Evaluating...' : 'Evaluate'}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
