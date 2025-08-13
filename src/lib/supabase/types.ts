// Supabase generated types placeholder. Will be updated when MCP types are regenerated.
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
      companies: {
        Row: {
          id: string;
          name: string;
          sector: string | null;
          stage: string | null;
          arr: number | null;
          amount_invested: number | null;
          ownership_percent: number | null;
          last_round_date: string | null;
          last_round_note: string | null;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['companies']['Row']> & { name: string };
        Update: Partial<Database['public']['Tables']['companies']['Row']>;
      };
      asks: {
        Row: {
          id: string;
          company_id: string | null;
          title: string;
          description: string | null;
          status: 'unassigned'|'in_progress'|'done'|'blocked';
          priority: 'low'|'medium'|'high';
          due_date: string | null;
          position: number;
          created_by: string | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['asks']['Row']> & { title: string };
        Update: Partial<Database['public']['Tables']['asks']['Row']>;
      };
      activities: {
        Row: {
          id: string;
          company_id: string | null;
          type: 'Ask'|'Intro'|'ValueAdd'|'CompanyUpdate';
          subject: string;
          summary: string | null;
          notes: string | null;
          email_url: string | null;
          received_at: string | null;
          ask_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['activities']['Row']> & { type: 'Ask'|'Intro'|'ValueAdd'|'CompanyUpdate'; subject: string };
        Update: Partial<Database['public']['Tables']['activities']['Row']>;
      };
    };
    Views: {
      company_kpis: {
        Row: {
          company_id: string;
          name: string;
          open_asks: number;
          intros_30d: number;
          valueadds_30d: number;
          last_update_at: string | null;
        };
      };
    };
    Enums: {
      ask_status: 'unassigned' | 'in_progress' | 'done' | 'blocked';
      ask_priority: 'low' | 'medium' | 'high';
      activity_type: 'Ask' | 'Intro' | 'ValueAdd' | 'CompanyUpdate';
    };
  };
};


