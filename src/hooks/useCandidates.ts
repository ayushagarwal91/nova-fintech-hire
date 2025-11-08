import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Candidate, CandidateStats } from "@/types";

export const useCandidates = () => {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<CandidateStats>({ 
    total: 0, 
    shortlisted: 0, 
    avgScore: 0 
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          *,
          jobs (
            title
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCandidates(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const shortlisted = data?.filter(
        c => ['Shortlisted', 'Assignment', 'Interview', 'Ranked'].includes(c.status)
      ).length || 0;
      const avgScore = data?.reduce((acc, c) => acc + c.resume_score, 0) / (total || 1);
      
      setStats({ 
        total, 
        shortlisted, 
        avgScore: Math.round(avgScore * 10) / 10 
      });
    } catch (error: any) {
      toast({
        title: "Error Loading Candidates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { candidates, stats, isLoading, refetch: fetchCandidates };
};
