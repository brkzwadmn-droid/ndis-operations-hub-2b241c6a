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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      abc_charts: {
        Row: {
          antecedent: string
          behaviour: string
          client_id: string
          consequence: string
          created_at: string
          id: string
          notes: string | null
          occurred_at: string
          profile_id: string
          shift_id: string
        }
        Insert: {
          antecedent: string
          behaviour: string
          client_id: string
          consequence: string
          created_at?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          profile_id: string
          shift_id: string
        }
        Update: {
          antecedent?: string
          behaviour?: string
          client_id?: string
          consequence?: string
          created_at?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          profile_id?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abc_charts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abc_charts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abc_charts_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          location_lat: number | null
          location_lng: number | null
          profile_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          profile_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          expected_lat: number | null
          expected_lng: number | null
          full_name: string
          id: string
          is_active: boolean
          location_radius_meters: number | null
          ndis_number: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          expected_lat?: number | null
          expected_lng?: number | null
          full_name: string
          id?: string
          is_active?: boolean
          location_radius_meters?: number | null
          ndis_number?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          expected_lat?: number | null
          expected_lng?: number | null
          full_name?: string
          id?: string
          is_active?: boolean
          location_radius_meters?: number | null
          ndis_number?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      finance_entries: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string
          entry_date: string
          id: string
          type: Database["public"]["Enums"]["finance_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          description: string
          entry_date?: string
          id?: string
          type: Database["public"]["Enums"]["finance_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          description?: string
          entry_date?: string
          id?: string
          type?: Database["public"]["Enums"]["finance_type"]
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_checklists: {
        Row: {
          checklist_type: string
          client_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          items: Json
          photo_url: string | null
          profile_id: string
          shift_id: string
        }
        Insert: {
          checklist_type?: string
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          items?: Json
          photo_url?: string | null
          profile_id: string
          shift_id: string
        }
        Update: {
          checklist_type?: string
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          items?: Json
          photo_url?: string | null
          profile_id?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handover_checklists_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handover_checklists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handover_checklists_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          client_id: string
          created_at: string
          description: string
          id: string
          photo_url: string | null
          profile_id: string
          severity: string
          shift_id: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description: string
          id?: string
          photo_url?: string | null
          profile_id: string
          severity?: string
          shift_id: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string
          id?: string
          photo_url?: string | null
          profile_id?: string
          severity?: string
          shift_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          profile_id: string
          read: boolean
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          profile_id: string
          read?: boolean
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          profile_id?: string
          read?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      progress_notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          photo_url: string | null
          profile_id: string
          shift_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          id?: string
          photo_url?: string | null
          profile_id: string
          shift_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          photo_url?: string | null
          profile_id?: string
          shift_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_notes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_notes_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_approvals: {
        Row: {
          created_at: string
          director_id: string
          id: string
          shift_id: string
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          director_id: string
          id?: string
          shift_id: string
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          director_id?: string
          id?: string
          shift_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_approvals_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_approvals_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_review_items: {
        Row: {
          created_at: string
          decision: string | null
          director1_approved: boolean | null
          director2_approved: boolean | null
          id: string
          notes: string | null
          reassigned_date: string | null
          reassigned_to: string | null
          review_id: string
          status: string
          task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision?: string | null
          director1_approved?: boolean | null
          director2_approved?: boolean | null
          id?: string
          notes?: string | null
          reassigned_date?: string | null
          reassigned_to?: string | null
          review_id: string
          status?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision?: string | null
          director1_approved?: boolean | null
          director2_approved?: boolean | null
          id?: string
          notes?: string | null
          reassigned_date?: string | null
          reassigned_to?: string | null
          review_id?: string
          status?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_review_items_reassigned_to_fkey"
            columns: ["reassigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_review_items_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "shift_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_review_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_reviews: {
        Row: {
          completed_at: string | null
          created_at: string
          director1_id: string
          director2_id: string | null
          id: string
          shift_id: string
          started_at: string
          status: string
          summary_notes: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          director1_id: string
          director2_id?: string | null
          id?: string
          shift_id: string
          started_at?: string
          status?: string
          summary_notes?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          director1_id?: string
          director2_id?: string | null
          id?: string
          shift_id?: string
          started_at?: string
          status?: string
          summary_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_reviews_director1_id_fkey"
            columns: ["director1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_reviews_director2_id_fkey"
            columns: ["director2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_reviews_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          client_id: string | null
          clock_in_lat: number | null
          clock_in_lng: number | null
          clock_in_location_valid: boolean | null
          clock_out_lat: number | null
          clock_out_lng: number | null
          clock_out_location_valid: boolean | null
          created_at: string
          end_time: string | null
          handover_completed: boolean | null
          id: string
          notes: string | null
          profile_id: string
          start_time: string | null
          status: Database["public"]["Enums"]["shift_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_in_location_valid?: boolean | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          clock_out_location_valid?: boolean | null
          created_at?: string
          end_time?: string | null
          handover_completed?: boolean | null
          id?: string
          notes?: string | null
          profile_id: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["shift_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_in_location_valid?: boolean | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          clock_out_location_valid?: boolean | null
          created_at?: string
          end_time?: string | null
          handover_completed?: boolean | null
          id?: string
          notes?: string | null
          profile_id?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["shift_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_changes: {
        Row: {
          approved_by: string | null
          created_at: string
          id: string
          notes: string | null
          operation: string
          payload: Json
          requested_by: string
          status: string
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          operation: string
          payload?: Json
          requested_by: string
          status?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          operation?: string
          payload?: Json
          requested_by?: string
          status?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_changes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_changes_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          added_by_self: boolean
          assigned_by: string
          assigned_to: string
          client_id: string | null
          comment: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          incomplete_reason: string | null
          is_end_of_day: boolean
          photo_required: boolean
          photo_url: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          added_by_self?: boolean
          assigned_by: string
          assigned_to: string
          client_id?: string | null
          comment?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          incomplete_reason?: string | null
          is_end_of_day?: boolean
          photo_required?: boolean
          photo_url?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          added_by_self?: boolean
          assigned_by?: string
          assigned_to?: string
          client_id?: string | null
          comment?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          incomplete_reason?: string | null
          is_end_of_day?: boolean
          photo_required?: boolean
          photo_url?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_director: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "director" | "manager" | "team_leader" | "support_worker"
      approval_status: "pending" | "approved" | "rejected"
      finance_type: "income" | "expense"
      shift_status: "open" | "closed" | "submitted" | "approved" | "rejected"
      task_status: "pending" | "in_progress" | "completed"
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
      app_role: ["director", "manager", "team_leader", "support_worker"],
      approval_status: ["pending", "approved", "rejected"],
      finance_type: ["income", "expense"],
      shift_status: ["open", "closed", "submitted", "approved", "rejected"],
      task_status: ["pending", "in_progress", "completed"],
    },
  },
} as const
