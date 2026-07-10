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
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_invites: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invitee_id: string
          inviter_id: string
          match_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["invite_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          invitee_id: string
          inviter_id: string
          match_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          match_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_invites_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          created_at: string
          joined_at: string
          match_id: string
          player_id: string
          queue_entry_id: string | null
          source: Database["public"]["Enums"]["match_player_source"]
        }
        Insert: {
          created_at?: string
          joined_at?: string
          match_id: string
          player_id: string
          queue_entry_id?: string | null
          source?: Database["public"]["Enums"]["match_player_source"]
        }
        Update: {
          created_at?: string
          joined_at?: string
          match_id?: string
          player_id?: string
          queue_entry_id?: string | null
          source?: Database["public"]["Enums"]["match_player_source"]
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
          capacity: number
          court_id: string
          created_at: string
          ended_at: string | null
          ends_at: string | null
          forming_expires_at: string | null
          id: string
          open_to_stacking: boolean
          started_at: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        Insert: {
          capacity?: number
          court_id: string
          created_at?: string
          ended_at?: string | null
          ends_at?: string | null
          forming_expires_at?: string | null
          id?: string
          open_to_stacking?: boolean
          started_at?: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Update: {
          capacity?: number
          court_id?: string
          created_at?: string
          ended_at?: string | null
          ends_at?: string | null
          forming_expires_at?: string | null
          id?: string
          open_to_stacking?: boolean
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
          booking_id: string | null
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          play_session_id: string | null
          provider: string
          provider_ref: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          play_session_id?: string | null
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          play_session_id?: string | null
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
          {
            foreignKeyName: "payments_play_session_id_fkey"
            columns: ["play_session_id"]
            isOneToOne: false
            referencedRelation: "play_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      play_credit_ledger: {
        Row: {
          created_at: string
          id: string
          match_id: string | null
          minutes_delta: number
          play_session_id: string | null
          player_id: string
          reason: Database["public"]["Enums"]["credit_reason"]
        }
        Insert: {
          created_at?: string
          id?: string
          match_id?: string | null
          minutes_delta: number
          play_session_id?: string | null
          player_id: string
          reason: Database["public"]["Enums"]["credit_reason"]
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string | null
          minutes_delta?: number
          play_session_id?: string | null
          player_id?: string
          reason?: Database["public"]["Enums"]["credit_reason"]
        }
        Relationships: [
          {
            foreignKeyName: "play_credit_ledger_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_credit_ledger_play_session_id_fkey"
            columns: ["play_session_id"]
            isOneToOne: false
            referencedRelation: "play_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_credit_ledger_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      play_sessions: {
        Row: {
          activated_at: string | null
          amount_cents: number
          created_at: string
          currency: string
          expires_at: string | null
          hours_purchased: number
          id: string
          minutes_total: number
          player_id: string
          reference_code: string
          status: Database["public"]["Enums"]["play_session_status"]
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          activated_at?: string | null
          amount_cents: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          hours_purchased: number
          id?: string
          minutes_total: number
          player_id: string
          reference_code: string
          status?: Database["public"]["Enums"]["play_session_status"]
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          activated_at?: string | null
          amount_cents?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          hours_purchased?: number
          id?: string
          minutes_total?: number
          player_id?: string
          reference_code?: string
          status?: Database["public"]["Enums"]["play_session_status"]
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "play_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_credits: {
        Row: {
          minutes_remaining: number
          player_id: string
          updated_at: string
        }
        Insert: {
          minutes_remaining?: number
          player_id: string
          updated_at?: string
        }
        Update: {
          minutes_remaining?: number
          player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_credits_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
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
      current_player_id: { Args: never; Returns: string }
      expire_play_credits: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      settle_play_session: {
        Args: {
          p_provider_ref: string
          p_reference: string
          p_valid_until: string
        }
        Returns: {
          changed: boolean
          minutes_credited: number
          reference_code: string
          status: Database["public"]["Enums"]["play_session_status"]
        }[]
      }
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
      credit_reason:
        | "purchase"
        | "match_debit"
        | "match_refund"
        | "expiry_writeoff"
        | "admin_adjustment"
      invite_status:
        | "pending"
        | "accepted"
        | "declined"
        | "cancelled"
        | "expired"
      match_player_source: "queue" | "stack" | "invite" | "walk_in"
      match_status: "forming" | "active" | "completed" | "cancelled"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      play_session_status:
        | "pending_payment"
        | "active"
        | "expired"
        | "consumed"
        | "cancelled"
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
      credit_reason: [
        "purchase",
        "match_debit",
        "match_refund",
        "expiry_writeoff",
        "admin_adjustment",
      ],
      invite_status: [
        "pending",
        "accepted",
        "declined",
        "cancelled",
        "expired",
      ],
      match_player_source: ["queue", "stack", "invite", "walk_in"],
      match_status: ["forming", "active", "completed", "cancelled"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      play_session_status: [
        "pending_payment",
        "active",
        "expired",
        "consumed",
        "cancelled",
      ],
      queue_status: ["waiting", "called", "playing", "done", "cancelled"],
      rate_type: ["open_play", "private_rental", "coaching"],
    },
  },
} as const

