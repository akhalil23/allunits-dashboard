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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      contact_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      monthly_budget_snapshots: {
        Row: {
          id: string
          month: string
          observed_at: string
          payload: Json
          publication_id: string
        }
        Insert: {
          id?: string
          month: string
          observed_at?: string
          payload: Json
          publication_id: string
        }
        Update: {
          id?: string
          month?: string
          observed_at?: string
          payload?: Json
          publication_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budget_snapshots_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: true
            referencedRelation: "monthly_snapshot_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_refresh_attempts: {
        Row: {
          attempt_number: number
          budget_status: string | null
          completed_at: string | null
          details: Json
          duration_ms: number | null
          error_message: string | null
          id: string
          month: string
          started_at: string
          status: string
          triggered_by: string
          units_failed: number
          units_succeeded: number
        }
        Insert: {
          attempt_number: number
          budget_status?: string | null
          completed_at?: string | null
          details?: Json
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          month: string
          started_at?: string
          status?: string
          triggered_by?: string
          units_failed?: number
          units_succeeded?: number
        }
        Update: {
          attempt_number?: number
          budget_status?: string | null
          completed_at?: string | null
          details?: Json
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          month?: string
          started_at?: string
          status?: string
          triggered_by?: string
          units_failed?: number
          units_succeeded?: number
        }
        Relationships: []
      }
      monthly_refresh_state: {
        Row: {
          active_month: string | null
          active_publication_id: string | null
          attempts_this_month: number
          current_status: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_success_at: string | null
          next_retry_at: string | null
          updated_at: string
        }
        Insert: {
          active_month?: string | null
          active_publication_id?: string | null
          attempts_this_month?: number
          current_status?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          next_retry_at?: string | null
          updated_at?: string
        }
        Update: {
          active_month?: string | null
          active_publication_id?: string | null
          attempts_this_month?: number
          current_status?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          next_retry_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_refresh_state_active_publication_id_fkey"
            columns: ["active_publication_id"]
            isOneToOne: false
            referencedRelation: "monthly_snapshot_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_snapshot_publications: {
        Row: {
          budget_included: boolean
          created_at: string
          id: string
          month: string
          notes: string | null
          published_at: string
          succeeded_units: number
          total_units: number
        }
        Insert: {
          budget_included?: boolean
          created_at?: string
          id?: string
          month: string
          notes?: string | null
          published_at?: string
          succeeded_units: number
          total_units: number
        }
        Update: {
          budget_included?: boolean
          created_at?: string
          id?: string
          month?: string
          notes?: string | null
          published_at?: string
          succeeded_units?: number
          total_units?: number
        }
        Relationships: []
      }
      monthly_unit_snapshots: {
        Row: {
          id: string
          month: string
          observed_at: string
          payload: Json
          publication_id: string
          unit_id: string
          view_type: string
        }
        Insert: {
          id?: string
          month: string
          observed_at?: string
          payload: Json
          publication_id: string
          unit_id: string
          view_type: string
        }
        Update: {
          id?: string
          month?: string
          observed_at?: string
          payload?: Json
          publication_id?: string
          unit_id?: string
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_unit_snapshots_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "monthly_snapshot_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_email: string
          created_at: string | null
          display_name: string | null
          id: string
          user_id: string
          username: string
        }
        Insert: {
          auth_email: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          user_id: string
          username: string
        }
        Update: {
          auth_email?: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          academic_year: string
          created_at: string
          description: string | null
          file_path: string
          id: string
          pillar: string | null
          report_type: Database["public"]["Enums"]["report_type"]
          reporting_period: Database["public"]["Enums"]["reporting_period"]
          scope: Database["public"]["Enums"]["report_scope"]
          title: string
          unit_id: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          academic_year?: string
          created_at?: string
          description?: string | null
          file_path: string
          id?: string
          pillar?: string | null
          report_type: Database["public"]["Enums"]["report_type"]
          reporting_period: Database["public"]["Enums"]["reporting_period"]
          scope: Database["public"]["Enums"]["report_scope"]
          title: string
          unit_id?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          description?: string | null
          file_path?: string
          id?: string
          pillar?: string | null
          report_type?: Database["public"]["Enums"]["report_type"]
          reporting_period?: Database["public"]["Enums"]["reporting_period"]
          scope?: Database["public"]["Enums"]["report_scope"]
          title?: string
          unit_id?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      strategic_snapshots: {
        Row: {
          academic_year: string
          applicable_items: number
          below_target_pct: number
          budget_utilization: number
          captured_by: string
          completion_pct: number
          created_at: string
          id: string
          on_track_pct: number
          pillar_data: Json
          reporting_cycle: string
          risk_index: number
          term: string
          total_items: number
          unit_data: Json
          view_type: string
        }
        Insert: {
          academic_year: string
          applicable_items?: number
          below_target_pct?: number
          budget_utilization?: number
          captured_by: string
          completion_pct?: number
          created_at?: string
          id?: string
          on_track_pct?: number
          pillar_data?: Json
          reporting_cycle: string
          risk_index?: number
          term: string
          total_items?: number
          unit_data?: Json
          view_type?: string
        }
        Update: {
          academic_year?: string
          applicable_items?: number
          below_target_pct?: number
          budget_utilization?: number
          captured_by?: string
          completion_pct?: number
          created_at?: string
          id?: string
          on_track_pct?: number
          pillar_data?: Json
          reporting_cycle?: string
          risk_index?: number
          term?: string
          total_items?: number
          unit_data?: Json
          view_type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          unit_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          unit_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          unit_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_session_snapshots: {
        Row: {
          academic_year: string
          applicable_items: number
          below_target_pct: number
          budget_utilization: number
          completion_pct: number
          created_at: string
          filters: Json
          id: string
          label: string
          metrics: Json
          notes: string | null
          on_track_pct: number
          pillar_data: Json
          reporting_cycle: string
          risk_index: number
          term: string
          total_items: number
          unit_data: Json
          updated_at: string
          user_id: string
          view_type: string
        }
        Insert: {
          academic_year: string
          applicable_items?: number
          below_target_pct?: number
          budget_utilization?: number
          completion_pct?: number
          created_at?: string
          filters?: Json
          id?: string
          label?: string
          metrics?: Json
          notes?: string | null
          on_track_pct?: number
          pillar_data?: Json
          reporting_cycle: string
          risk_index?: number
          term: string
          total_items?: number
          unit_data?: Json
          updated_at?: string
          user_id: string
          view_type?: string
        }
        Update: {
          academic_year?: string
          applicable_items?: number
          below_target_pct?: number
          budget_utilization?: number
          completion_pct?: number
          created_at?: string
          filters?: Json
          id?: string
          label?: string
          metrics?: Json
          notes?: string | null
          on_track_pct?: number
          pillar_data?: Json
          reporting_cycle?: string
          risk_index?: number
          term?: string
          total_items?: number
          unit_data?: Json
          updated_at?: string
          user_id?: string
          view_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_email_by_username: {
        Args: { _username: string }
        Returns: string
      }
      get_user_is_active: { Args: { _user_id: string }; Returns: boolean }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      get_user_unit: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "unit_user"
        | "university_viewer"
        | "pillar_champion"
        | "board_member"
      report_scope: "university" | "per_pillar" | "per_unit"
      report_type: "executive" | "full"
      reporting_period: "mid_year" | "end_of_year"
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
      app_role: [
        "admin",
        "unit_user",
        "university_viewer",
        "pillar_champion",
        "board_member",
      ],
      report_scope: ["university", "per_pillar", "per_unit"],
      report_type: ["executive", "full"],
      reporting_period: ["mid_year", "end_of_year"],
    },
  },
} as const
