// Centralized type definitions for the application

export interface Job {
  id: string;
  title: string;
  role: string;
  description: string;
  requirements: string;
  skills_required: string[];
  experience_required: number;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  role: string;
  status: CandidateStatus;
  resume_score: number;
  resume_feedback?: string;
  experience: number;
  resume_url?: string;
  created_at: string;
  updated_at: string;
  job_id?: string;
  jobs?: {
    title: string;
  };
}

export type CandidateStatus = 
  | 'Applied' 
  | 'Shortlisted' 
  | 'Not Shortlisted' 
  | 'Assignment' 
  | 'Interview' 
  | 'Ranked';

export interface CandidateStats {
  total: number;
  shortlisted: number;
  avgScore: number;
}

export interface DashboardStats extends CandidateStats {
  openPositions: number;
  activeJobPostings: number;
  interviewsToday: number;
  interviewsThisWeek: number;
  avgTimeToHire: number;
  conversionRate: number;
}

export interface ApplicationFormData {
  name: string;
  email: string;
  jobId: string;
}
