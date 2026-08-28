export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TopicStatus = "locked" | "in_progress" | "completed";

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: {
          user_id: string;
          created_at?: string;
        };
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_progress: {
        Row: {
          user_id: string;
          topic_id: string;
          status: TopicStatus;
          quiz_passed: boolean;
          quiz_score: number | null;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          topic_id: string;
          status: TopicStatus;
          quiz_passed?: boolean;
          quiz_score?: number | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          topic_id?: string;
          status?: TopicStatus;
          quiz_passed?: boolean;
          quiz_score?: number | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_stats: {
        Row: {
          user_id: string;
          xp: number;
          last_studied: string | null; // YYYY-MM-DD
          streak_count: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          xp?: number;
          last_studied?: string | null;
          streak_count?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          xp?: number;
          last_studied?: string | null;
          streak_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: {
          user_id?: string;
          badge_id?: string;
          earned_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      admin_user_list: {
        Row: {
          user_id: string;
          login_id: string | null;
          xp: number | null;
          streak_count: number | null;
          last_studied: string | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type AdminRow = Database["public"]["Tables"]["admins"]["Row"];
export type UserProgressRow = Database["public"]["Tables"]["user_progress"]["Row"];
export type UserStatsRow = Database["public"]["Tables"]["user_stats"]["Row"];
export type UserBadgeRow = Database["public"]["Tables"]["user_badges"]["Row"];
export type AdminUserListRow = Database["public"]["Views"]["admin_user_list"]["Row"];

export interface StudentSummary {
  userId: string;
  loginId: string;
  cohort: string;
  completedTopicsCount: number;
  progressPercent: number;
  level: number;
  xp: number;
  badgesCount: number;
  streakCount: number;
  lastStudied: string | null;
}
