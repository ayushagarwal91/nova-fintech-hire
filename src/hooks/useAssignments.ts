import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Assignment {
  id: string;
  candidate_id: string;
  assignment_text: string;
  submission_url?: string;
  feedback?: string;
  difficulty_level: 'Junior' | 'Mid' | 'Senior';
  time_limit_hours: number;
  deadline: string;
  status: 'pending' | 'submitted' | 'evaluated' | 'passed' | 'failed';
  final_score: number;
  anti_cheat_id: string;
  created_at: string;
  updated_at: string;
  candidates?: {
    name: string;
    email: string;
    role: string;
    experience: number;
  };
}

export const useAssignments = () => {
  return useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          candidates (
            name,
            email,
            role,
            experience
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Assignment[];
    },
  });
};

export const useAssignmentById = (assignmentId: string) => {
  return useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          candidates (
            name,
            email,
            role,
            experience
          )
        `)
        .eq('id', assignmentId)
        .single();

      if (error) throw error;
      return data as Assignment;
    },
    enabled: !!assignmentId,
  });
};
