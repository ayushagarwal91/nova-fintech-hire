import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AssignmentData {
  id: string;
  assignment_text: string;
  difficulty_level: string;
  time_limit_hours: number;
  deadline: string;
  status: string;
  submission_url?: string;
  candidates: {
    name: string;
    email: string;
  };
}

export default function Assignment() {
  const { assignmentId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { toast } = useToast();

  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState("");

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId, token]);

  const fetchAssignment = async () => {
    if (!assignmentId || !token) {
      toast({
        title: "Invalid Link",
        description: "The assignment link is invalid or expired.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("assignments")
        .select(`
          id,
          assignment_text,
          difficulty_level,
          time_limit_hours,
          deadline,
          status,
          submission_url,
          anti_cheat_id,
          candidates (
            name,
            email
          )
        `)
        .eq("id", assignmentId)
        .eq("anti_cheat_id", token)
        .single();

      if (error || !data) {
        toast({
          title: "Assignment Not Found",
          description: "Could not find the assignment. Please check your link.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setAssignment(data as AssignmentData);
      setSubmissionUrl(data.submission_url || "");
    } catch (error) {
      console.error("Error fetching assignment:", error);
      toast({
        title: "Error",
        description: "Failed to load assignment details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!submissionUrl.trim()) {
      toast({
        title: "Submission Required",
        description: "Please provide a submission URL (GitHub repo, Google Drive, etc.)",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("assignments")
        .update({
          submission_url: submissionUrl,
          status: "submitted",
        })
        .eq("id", assignmentId);

      if (error) throw error;

      toast({
        title: "Submission Successful!",
        description: "Your assignment has been submitted. We'll review it shortly.",
      });

      // Refresh assignment data
      fetchAssignment();
    } catch (error) {
      console.error("Error submitting assignment:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-center">Assignment Not Found</CardTitle>
            <CardDescription className="text-center">
              The assignment link is invalid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(assignment.deadline) < new Date();
  const isSubmitted = assignment.status === "submitted" || assignment.status === "evaluated";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Technical Assessment</CardTitle>
                <CardDescription className="mt-2">
                  Candidate: {assignment.candidates.name} ({assignment.candidates.email})
                </CardDescription>
              </div>
              <Badge variant={isSubmitted ? "default" : isExpired ? "destructive" : "secondary"}>
                {isSubmitted ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Submitted</>
                ) : isExpired ? (
                  <><AlertCircle className="h-3 w-3 mr-1" /> Expired</>
                ) : (
                  <><Clock className="h-3 w-3 mr-1" /> Pending</>
                )}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
            <div className="flex gap-4 mt-2">
              <Badge variant="outline">Difficulty: {assignment.difficulty_level}</Badge>
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                Time Limit: {assignment.time_limit_hours} hours
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap bg-muted p-4 rounded-lg">
                {assignment.assignment_text}
              </div>
            </div>

            {!isExpired && new Date(assignment.deadline) > new Date() && (
              <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                <p className="text-sm text-accent-foreground">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Deadline: {new Date(assignment.deadline).toLocaleString()}
                </p>
              </div>
            )}

            {isExpired && !isSubmitted && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  This assignment has expired
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {!isSubmitted && !isExpired && (
          <Card>
            <CardHeader>
              <CardTitle>Submit Your Solution</CardTitle>
              <CardDescription>
                Provide a link to your solution (GitHub repository, Google Drive, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="submission" className="text-sm font-medium">
                  Submission URL *
                </label>
                <Input
                  id="submission"
                  placeholder="https://github.com/yourname/project or https://drive.google.com/..."
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || !submissionUrl.trim()}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Assignment"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {isSubmitted && assignment.submission_url && (
          <Card>
            <CardHeader>
              <CardTitle>Submitted Solution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Submission URL:</p>
                <a
                  href={assignment.submission_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {assignment.submission_url}
                </a>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Your assignment has been submitted successfully. We'll review it and get back to you soon.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
