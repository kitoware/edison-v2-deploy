// Supabase generated types placeholder. Will be updated when MCP types are regenerated.
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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          actors: Database["public"]["Enums"]["contributor_name"][]
          ask_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          email_url: string | null
          id: string
          notes: string | null
          received_at: string | null
          subject: string
          summary: string | null
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          actors?: Database["public"]["Enums"]["contributor_name"][]
          ask_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email_url?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          subject: string
          summary?: string | null
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          actors?: Database["public"]["Enums"]["contributor_name"][]
          ask_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email_url?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          subject?: string
          summary?: string | null
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_ask_id_fkey"
            columns: ["ask_id"]
            isOneToOne: false
            referencedRelation: "asks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_kpis"
            referencedColumns: ["company_id"]
          },
        ]
      }
      asks: {
        Row: {
          company_id: string | null
          contributors: Database["public"]["Enums"]["contributor_name"][]
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          owner_id: string | null
          position: number
          priority: Database["public"]["Enums"]["ask_priority"]
          status: Database["public"]["Enums"]["ask_status"]
          title: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          contributors?: Database["public"]["Enums"]["contributor_name"][]
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["ask_priority"]
          status?: Database["public"]["Enums"]["ask_status"]
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          contributors?: Database["public"]["Enums"]["contributor_name"][]
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["ask_priority"]
          status?: Database["public"]["Enums"]["ask_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_kpis"
            referencedColumns: ["company_id"]
          },
        ]
      }
      companies: {
        Row: {
          amount_invested: number | null
          arr: number | null
          created_at: string
          id: string
          last_round_date: string | null
          last_round_note: string | null
          logo_url: string | null
          name: string
          ownership_percent: number | null
          sector: string | null
          stage: string | null
          updated_at: string
        }
        Insert: {
          amount_invested?: number | null
          arr?: number | null
          created_at?: string
          id?: string
          last_round_date?: string | null
          last_round_note?: string | null
          logo_url?: string | null
          name: string
          ownership_percent?: number | null
          sector?: string | null
          stage?: string | null
          updated_at?: string
        }
        Update: {
          amount_invested?: number | null
          arr?: number | null
          created_at?: string
          id?: string
          last_round_date?: string | null
          last_round_note?: string | null
          logo_url?: string | null
          name?: string
          ownership_percent?: number | null
          sector?: string | null
          stage?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      company_kpis: {
        Row: {
          company_id: string | null
          intros_30d: number | null
          last_update_at: string | null
          name: string | null
          open_asks: number | null
          valueadds_30d: number | null
        }
        Insert: {
          company_id?: string | null
          intros_30d?: never
          last_update_at?: never
          name?: string | null
          open_asks?: never
          valueadds_30d?: never
        }
        Update: {
          company_id?: string | null
          intros_30d?: never
          last_update_at?: never
          name?: string | null
          open_asks?: never
          valueadds_30d?: never
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      activity_type: "Ask" | "Intro" | "ValueAdd" | "CompanyUpdate"
      ask_priority: "low" | "medium" | "high"
      ask_status: "unassigned" | "in_progress" | "done" | "blocked"
      contributor_name: "Brandon" | "Adam"
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
      activity_type: ["Ask", "Intro", "ValueAdd", "CompanyUpdate"],
      ask_priority: ["low", "medium", "high"],
      ask_status: ["unassigned", "in_progress", "done", "blocked"],
      contributor_name: ["Brandon", "Adam"],
    },
  },
} as const


