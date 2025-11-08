export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          accuracy_score: number | null
          assignment_text: string
          candidate_id: string
          clarity_score: number | null
          created_at: string | null
          feedback: string | null
          id: string
          relevance_score: number | null
          submission_url: string | null
          updated_at: string | null
        }
        Insert: {
          accuracy_score?: number | null
          assignment_text: string
          candidate_id: string
          clarity_score?: number | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          relevance_score?: number | null
          submission_url?: string | null
          updated_at?: string | null
        }
        Update: {
          accuracy_score?: number | null
          assignment_text?: string
          candidate_id?: string
          clarity_score?: number | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          relevance_score?: number | null
          submission_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string | null
          email: string
          experience: number
          id: string
          job_id: string | null
          name: string
          resume_feedback: string | null
          resume_score: number | null
          resume_url: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["candidate_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          experience: number
          id?: string
          job_id?: string | null
          name: string
          resume_feedback?: string | null
          resume_score?: number | null
          resume_url?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["candidate_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          experience?: number
          id?: string
          job_id?: string | null
          name?: string
          resume_feedback?: string | null
          resume_score?: number | null
          resume_url?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["candidate_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          answers: Json | null
          candidate_id: string
          created_at: string | null
          feedback: string | null
          id: string
          questions: Json
          score: number | null
          updated_at: string | null
        }
        Insert: {
          answers?: Json | null
          candidate_id: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          questions: Json
          score?: number | null
          updated_at?: string | null
        }
        Update: {
          answers?: Json | null
          candidate_id?: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          questions?: Json
          score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          description: string
          experience_required: number
          id: string
          requirements: string
          role: Database["public"]["Enums"]["app_role"]
          skills_required: string[]
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          experience_required: number
          id?: string
          requirements: string
          role: Database["public"]["Enums"]["app_role"]
          skills_required?: string[]
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          experience_required?: number
          id?: string
          requirements?: string
          role?: Database["public"]["Enums"]["app_role"]
          skills_required?: string[]
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      candidate_rankings: {
        Row: {
          assignment_score: number | null
          composite_score: number | null
          created_at: string | null
          email: string | null
          id: string | null
          interview_score: number | null
          job_id: string | null
          job_title: string | null
          name: string | null
          resume_score: number | null
          role: Database["public"]["Enums"]["app_role"] | null
          status: Database["public"]["Enums"]["candidate_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "Backend" | "Frontend" | "Data Analyst" | "ML" | "DevOps"
      candidate_status:
        | "Applied"
        | "Shortlisted"
        | "Assignment"
        | "Interview"
        | "Ranked"
        | "Not Shortlisted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["Backend", "Frontend", "Data Analyst", "ML", "DevOps"],
      candidate_status: [
        "Applied",
        "Shortlisted",
        "Assignment",
        "Interview",
        "Ranked",
        "Not Shortlisted",
      ],
    },
  },
} as const
