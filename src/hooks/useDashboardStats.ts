import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DashboardStats } from "@/types";

export const useDashboardStats = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({ 
    total: 0, 
    shortlisted: 0, 
    avgScore: 0,
    openPositions: 0,
    activeJobPostings: 0,
    interviewsToday: 0,
    interviewsThisWeek: 0,
    avgTimeToHire: 0,
    conversionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch candidates
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('*');

      if (candidatesError) throw candidatesError;

      // Fetch jobs
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'open');

      if (jobsError) throw jobsError;

      // Fetch interviews
      const { data: interviews, error: interviewsError } = await supabase
        .from('interviews')
        .select('*');

      if (interviewsError) throw interviewsError;

      // Calculate candidate stats
      const total = candidates?.length || 0;
      const shortlisted = candidates?.filter(
        c => ['Shortlisted', 'Assignment', 'Interview', 'Ranked'].includes(c.status)
      ).length || 0;
      const avgScore = candidates?.reduce((acc, c) => acc + c.resume_score, 0) / (total || 1);

      // Calculate job stats
      const openPositions = jobs?.length || 0;
      const activeJobPostings = jobs?.length || 0;

      // Calculate interview stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const interviewsToday = interviews?.filter(i => {
        const interviewDate = new Date(i.created_at);
        return interviewDate >= today && interviewDate <= todayEnd;
      }).length || 0;

      const interviewsThisWeek = interviews?.filter(i => {
        const interviewDate = new Date(i.created_at);
        return interviewDate >= weekStart && interviewDate <= weekEnd;
      }).length || 0;

      // Calculate average time to hire (using 'Ranked' as final status)
      const rankedCandidates = candidates?.filter(c => c.status === 'Ranked') || [];
      let avgTimeToHire = 0;
      if (rankedCandidates.length > 0) {
        const totalDays = rankedCandidates.reduce((acc, c) => {
          const applied = new Date(c.created_at);
          const ranked = new Date(c.updated_at);
          const days = Math.floor((ranked.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24));
          return acc + days;
        }, 0);
        avgTimeToHire = Math.round(totalDays / rankedCandidates.length);
      }

      // Calculate conversion rate (Applied → Ranked)
      const conversionRate = total > 0 
        ? Math.round((rankedCandidates.length / total) * 100) 
        : 0;

      setStats({ 
        total, 
        shortlisted, 
        avgScore: Math.round(avgScore * 10) / 10,
        openPositions,
        activeJobPostings,
        interviewsToday,
        interviewsThisWeek,
        avgTimeToHire,
        conversionRate,
      });
    } catch (error: any) {
      toast({
        title: "Error Loading Dashboard Stats",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, refetch: fetchDashboardStats };
};
