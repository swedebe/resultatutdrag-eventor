export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_texts: {
        Row: {
          category: string
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      processed_results: {
        Row: {
          birth_year: string | null
          class_name: string | null
          class_type: string | null
          course_length: number | null
          event_date: string | null
          event_id: string | null
          event_name: string | null
          event_type: string | null
          id: string
          organizer: string | null
          person_id: number | null
          position: number | null
          run_id: string
          runner_name: string | null
          saved_at: string
          started: number | null
          time: string | null
          time_after: string | null
          time_after_seconds: number | null
          total_participants: number | null
        }
        Insert: {
          birth_year?: string | null
          class_name?: string | null
          class_type?: string | null
          course_length?: number | null
          event_date?: string | null
          event_id?: string | null
          event_name?: string | null
          event_type?: string | null
          id?: string
          organizer?: string | null
          person_id?: number | null
          position?: number | null
          run_id: string
          runner_name?: string | null
          saved_at?: string
          started?: number | null
          time?: string | null
          time_after?: string | null
          time_after_seconds?: number | null
          total_participants?: number | null
        }
        Update: {
          birth_year?: string | null
          class_name?: string | null
          class_type?: string | null
          course_length?: number | null
          event_date?: string | null
          event_id?: string | null
          event_name?: string | null
          event_type?: string | null
          id?: string
          organizer?: string | null
          person_id?: number | null
          position?: number | null
          run_id?: string
          runner_name?: string | null
          saved_at?: string
          started?: number | null
          time?: string | null
          time_after?: string | null
          time_after_seconds?: number | null
          total_participants?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processed_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_logs: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          run_id: string
          status: string | null
          timestamp: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          run_id: string
          status?: string | null
          timestamp?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          run_id?: string
          status?: string | null
          timestamp?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          club_name: string | null
          date: string
          email: string | null
          event_count: number
          id: string
          logs: Json | null
          name: string
          results: Json
          user_id: string
        }
        Insert: {
          club_name?: string | null
          date?: string
          email?: string | null
          event_count: number
          id?: string
          logs?: Json | null
          name: string
          results: Json
          user_id: string
        }
        Update: {
          club_name?: string | null
          date?: string
          email?: string | null
          event_count?: number
          id?: string
          logs?: Json | null
          name?: string
          results?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_processing_state: {
        Row: {
          cancellation_cleared_at: string | null
          cancellation_flag: boolean
          cancellation_set_at: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancellation_cleared_at?: string | null
          cancellation_flag?: boolean
          cancellation_set_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancellation_cleared_at?: string | null
          cancellation_flag?: boolean
          cancellation_set_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          club_name: string
          created_at: string
          email: string
          id: string
          name: string | null
          role: string | null
        }
        Insert: {
          club_name: string
          created_at?: string
          email: string
          id?: string
          name?: string | null
          role?: string | null
        }
        Update: {
          club_name?: string
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_user_from_admin: {
        Args: {
          user_email: string
          user_password: string
          user_name: string
          user_club_name?: string
          user_role?: string
        }
        Returns: Json
      }
      create_user_if_not_exists: {
        Args: { user_id: string; user_email: string; user_club_name: string }
        Returns: boolean
      }
      populate_app_texts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sync_all_user_role_claims: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
