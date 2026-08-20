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
      hc_action_steps: {
        Row: {
          accountable: string | null
          action_id: string
          code: string
          consulted: string | null
          created_at: string
          display_order: number
          first_seen_batch_id: string | null
          id: string
          import_batch_id: string | null
          informed: string | null
          intent: string | null
          owner: string | null
          priority: number | null
          responsible: string | null
          source_row: number | null
          title: string
        }
        Insert: {
          accountable?: string | null
          action_id: string
          code: string
          consulted?: string | null
          created_at?: string
          display_order?: number
          first_seen_batch_id?: string | null
          id?: string
          import_batch_id?: string | null
          informed?: string | null
          intent?: string | null
          owner?: string | null
          priority?: number | null
          responsible?: string | null
          source_row?: number | null
          title: string
        }
        Update: {
          accountable?: string | null
          action_id?: string
          code?: string
          consulted?: string | null
          created_at?: string
          display_order?: number
          first_seen_batch_id?: string | null
          id?: string
          import_batch_id?: string | null
          informed?: string | null
          intent?: string | null
          owner?: string | null
          priority?: number | null
          responsible?: string | null
          source_row?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_action_steps_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "hc_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hc_action_steps_first_seen_batch_id_fkey"
            columns: ["first_seen_batch_id"]
            isOneToOne: false
            referencedRelation: "hc_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hc_action_steps_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "hc_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_actions: {
        Row: {
          action_kpi_text: string | null
          code: string
          created_at: string
          display_order: number
          first_seen_batch_id: string | null
          goal_id: string
          id: string
          import_batch_id: string | null
          spoc: string | null
          title: string
        }
        Insert: {
          action_kpi_text?: string | null
          code: string
          created_at?: string
          display_order?: number
          first_seen_batch_id?: string | null
          goal_id: string
          id?: string
          import_batch_id?: string | null
          spoc?: string | null
          title: string
        }
        Update: {
          action_kpi_text?: string | null
          code?: string
          created_at?: string
          display_order?: number
          first_seen_batch_id?: string | null
          goal_id?: string
          id?: string
          import_batch_id?: string | null
          spoc?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_actions_first_seen_batch_id_fkey"
            columns: ["first_seen_batch_id"]
            isOneToOne: false
            referencedRelation: "hc_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hc_actions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "hc_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hc_actions_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "hc_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_budget_years: {
        Row: {
          amount: number | null
          amount_raw: string | null
          created_at: string
          id: string
          import_batch_id: string | null
          note: string | null
          step_id: string
          year_label: string
        }
        Insert: {
          amount?: number | null
          amount_raw?: string | null
          created_at?: string
          id?: string
          import_batch_id?: string | null
          note?: string | null
          step_id: string
          year_label: string
        }
        Update: {
          amount?: number | null
          amount_raw?: string | null
          created_at?: string
          id?: string
          import_batch_id?: string | null
          note?: string | null
          step_id?: string
          year_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_budget_years_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "hc_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hc_budget_years_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "hc_action_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      hc_goals: {
        Row: {
          champion: string | null
          code: number
          created_at: string
          display_order: number
          first_seen_batch_id: string | null
          id: string
          import_batch_id: string | null
          title: string
        }
        Insert: {
          champion?: string | null
          code: number
          created_at?: string
          display_order?: number
          first_seen_batch_id?: string | null
          id?: string
          import_batch_id?: string | null
          title: string
        }
        Update: {
          champion?: string | null
          code?: number
          created_at?: string
          display_order?: number
          first_seen_batch_id?: string | null
          id?: string
          import_batch_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_goals_first_seen_batch_id_fkey"
            columns: ["first_seen_batch_id"]
            isOneToOne: false
            referencedRelation: "hc_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hc_goals_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "hc_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_import_batches: {
        Row: {
          error_count: number
          filename: string
          goal_scope: string
          id: string
          imported_at: string
          imported_by: string | null
          notes: string | null
          row_count: number
          source_sheet: string
          status: string
          warning_count: number
        }
        Insert: {
          error_count?: number
          filename: string
          goal_scope?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          notes?: string | null
          row_count?: number
          source_sheet: string
          status?: string
          warning_count?: number
        }
        Update: {
          error_count?: number
          filename?: string
          goal_scope?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          notes?: string | null
          row_count?: number
          source_sheet?: string
          status?: string
          warning_count?: number
        }
        Relationships: []
      }
      hc_kpis: {
        Row: {
          created_at: string
          direction: string
          id: string
          import_batch_id: string | null
          kpi_type: string | null
          measurable: boolean
          original_text: string | null
          step_id: string
          target_date_raw: string | null
          target_unit: string | null
          target_value: number | null
          target_value_raw: string | null
        }
        Insert: {
          created_at?: string
          direction?: string
          id?: string
          import_batch_id?: string | null
          kpi_type?: string | null
          measurable?: boolean
          original_text?: string | null
          step_id: string
          target_date_raw?: string | null
          target_unit?: string | null
          target_value?: number | null
          target_value_raw?: string | null
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          import_batch_id?: string | null
          kpi_type?: string | null
          measurable?: boolean
          original_text?: string | null
          step_id?: string
          target_date_raw?: string | null
          target_unit?: string | null
          target_value?: number | null
          target_value_raw?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hc_kpis_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "hc_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hc_kpis_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "hc_action_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_periods: {
        Row: {
          code: string
          is_current: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          is_current?: boolean
          label: string
          sort_order: number
        }
        Update: {
          code?: string
          is_current?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      hc_quarterly_updates: {
        Row: {
          blocker_category: string | null
          blocker_details: string | null
          blocker_flag: string | null
          comments: string | null
          created_at: string
          evidence: string | null
          execution_progress_pct: number | null
          expected_milestone_date_raw: string | null
          id: string
          import_batch_id: string | null
          kpi_actual_raw: string | null
          kpi_actual_value: number | null
          next_milestone: string | null
          period_code: string
          status: string | null
          step_id: string
        }
        Insert: {
          blocker_category?: string | null
          blocker_details?: string | null
          blocker_flag?: string | null
          comments?: string | null
          created_at?: string
          evidence?: string | null
          execution_progress_pct?: number | null
          expected_milestone_date_raw?: string | null
          id?: string
          import_batch_id?: string | null
          kpi_actual_raw?: string | null
          kpi_actual_value?: number | null
          next_milestone?: string | null
          period_code: string
          status?: string | null
          step_id: string
        }
        Update: {
          blocker_category?: string | null
          blocker_details?: string | null
          blocker_flag?: string | null
          comments?: string | null
          created_at?: string
          evidence?: string | null
          execution_progress_pct?: number | null
          expected_milestone_date_raw?: string | null
          id?: string
          import_batch_id?: string | null
          kpi_actual_raw?: string | null
          kpi_actual_value?: number | null
          next_milestone?: string | null
          period_code?: string
          status?: string | null
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_quarterly_updates_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "hc_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hc_quarterly_updates_period_code_fkey"
            columns: ["period_code"]
            isOneToOne: false
            referencedRelation: "hc_periods"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "hc_quarterly_updates_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "hc_action_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_validation_issues: {
        Row: {
          batch_id: string
          created_at: string
          field: string | null
          id: string
          issue_code: string
          message: string
          row_ref: string | null
          severity: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          field?: string | null
          id?: string
          issue_code: string
          message: string
          row_ref?: string | null
          severity: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          field?: string | null
          id?: string
          issue_code?: string
          message?: string
          row_ref?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_validation_issues_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "hc_import_batches"
            referencedColumns: ["id"]
          },
        ]
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
      hc_can_read: { Args: { _user_id: string }; Returns: boolean }
      hc_can_write: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "unit_user"
        | "university_viewer"
        | "pillar_champion"
        | "board_member"
        | "healthcare_admin"
        | "healthcare_executive"
        | "healthcare_viewer"
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
        "healthcare_admin",
        "healthcare_executive",
        "healthcare_viewer",
      ],
      report_scope: ["university", "per_pillar", "per_unit"],
      report_type: ["executive", "full"],
      reporting_period: ["mid_year", "end_of_year"],
    },
  },
} as const
