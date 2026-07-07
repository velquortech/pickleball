export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          amount_cents: number
          booking_type: Database["public"]["Enums"]["booking_type"]
          court_id: string
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string
          ends_at: string
          expires_at: string | null
          id: string
          notes: string | null
          players_count: number
          reference_code: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          booking_type: Database["public"]["Enums"]["booking_type"]
          court_id: string
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          ends_at: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          players_count?: number
          reference_code: string
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          booking_type?: Database["public"]["Enums"]["booking_type"]
          court_id?: string
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          ends_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          players_count?: number
          reference_code?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          court_type: Database["public"]["Enums"]["court_type"]
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          status: Database["public"]["Enums"]["court_status"]
          updated_at: string
        }
        Insert: {
          court_type?: Database["public"]["Enums"]["court_type"]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          status?: Database["public"]["Enums"]["court_status"]
          updated_at?: string
        }
        Update: {
          court_type?: Database["public"]["Enums"]["court_type"]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["court_status"]
          updated_at?: string
        }
        Relationships: []
      }
      facility_settings: {
        Row: {
          booking_hold_minutes: number
          close_hour: number
          id: boolean
          match_duration_minutes: number
          max_players_per_match: number
          min_players_per_match: number
          open_hour: number
          timezone: string
          updated_at: string
        }
        Insert: {
          booking_hold_minutes?: number
          close_hour?: number
          id?: boolean
          match_duration_minutes?: number
          max_players_per_match?: number
          min_players_per_match?: number
          open_hour?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          booking_hold_minutes?: number
          close_hour?: number
          id?: boolean
          match_duration_minutes?: number
          max_players_per_match?: number
          min_players_per_match?: number
          open_hour?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      match_players: {
        Row: {
          created_at: string
          match_id: string
          player_id: string
          queue_entry_id: string | null
        }
        Insert: {
          created_at?: string
          match_id: string
          player_id: string
          queue_entry_id?: string | null
        }
        Update: {
          created_at?: string
          match_id?: string
          player_id?: string
          queue_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_queue_entry_id_fkey"
            columns: ["queue_entry_id"]
            isOneToOne: false
            referencedRelation: "queue_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          court_id: string
          created_at: string
          ended_at: string | null
          ends_at: string
          id: string
          started_at: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        Insert: {
          court_id: string
          created_at?: string
          ended_at?: string | null
          ends_at: string
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Update: {
          court_id?: string
          created_at?: string
          ended_at?: string | null
          ends_at?: string
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          provider: string
          provider_ref: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          display_name: string
          id: string
          profile_id: string | null
          skill_level: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          profile_id?: string | null
          skill_level?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          profile_id?: string | null
          skill_level?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      queue_entries: {
        Row: {
          called_at: string | null
          created_at: string
          id: string
          joined_at: string
          left_at: string | null
          player_id: string
          status: Database["public"]["Enums"]["queue_status"]
          updated_at: string
        }
        Insert: {
          called_at?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          player_id: string
          status?: Database["public"]["Enums"]["queue_status"]
          updated_at?: string
        }
        Update: {
          called_at?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          player_id?: string
          status?: Database["public"]["Enums"]["queue_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      rates: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_cents: number
          rate_type: Database["public"]["Enums"]["rate_type"]
          sort_order: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          rate_type: Database["public"]["Enums"]["rate_type"]
          sort_order?: number
          unit: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          rate_type?: Database["public"]["Enums"]["rate_type"]
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      booking_status:
        | "pending_payment"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "expired"
      booking_type: "private_rental" | "coaching"
      court_status: "open" | "maintenance" | "closed"
      court_type: "open_play" | "vip"
      match_status: "active" | "completed" | "cancelled"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      queue_status: "waiting" | "called" | "playing" | "done" | "cancelled"
      rate_type: "open_play" | "private_rental" | "coaching"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_status: [
        "pending_payment",
        "confirmed",
        "cancelled",
        "completed",
        "expired",
      ],
      booking_type: ["private_rental", "coaching"],
      court_status: ["open", "maintenance", "closed"],
      court_type: ["open_play", "vip"],
      match_status: ["active", "completed", "cancelled"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      queue_status: ["waiting", "called", "playing", "done", "cancelled"],
      rate_type: ["open_play", "private_rental", "coaching"],
    },
  },
} as const

