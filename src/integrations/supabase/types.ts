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
      company_profiles: {
        Row: {
          address: string | null
          business_type: string | null
          company_name: string
          company_size: string
          created_at: string
          current_jurisdictions: string[]
          description: string | null
          document_urls: string[] | null
          email: string | null
          founded_year: string | null
          id: string
          industry: string
          phone: string | null
          registration_number: string | null
          target_jurisdictions: string[] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          company_name: string
          company_size: string
          created_at?: string
          current_jurisdictions: string[]
          description?: string | null
          document_urls?: string[] | null
          email?: string | null
          founded_year?: string | null
          id?: string
          industry: string
          phone?: string | null
          registration_number?: string | null
          target_jurisdictions?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_type?: string | null
          company_name?: string
          company_size?: string
          created_at?: string
          current_jurisdictions?: string[]
          description?: string | null
          document_urls?: string[] | null
          email?: string | null
          founded_year?: string | null
          id?: string
          industry?: string
          phone?: string | null
          registration_number?: string | null
          target_jurisdictions?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      compliance_analysis: {
        Row: {
          company_profile_id: string
          compliance_score: number
          created_at: string
          id: string
          jurisdiction_id: string
          jurisdiction_name: string
          risk_level: string
          status: string
          updated_at: string
        }
        Insert: {
          company_profile_id: string
          compliance_score: number
          created_at?: string
          id?: string
          jurisdiction_id: string
          jurisdiction_name: string
          risk_level: string
          status: string
          updated_at?: string
        }
        Update: {
          company_profile_id?: string
          compliance_score?: number
          created_at?: string
          id?: string
          jurisdiction_id?: string
          jurisdiction_name?: string
          risk_level?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_reports: {
        Row: {
          company_profile_id: string
          created_at: string
          file_url: string | null
          generated_at: string
          id: string
          jurisdiction_id: string
          report_type: string
        }
        Insert: {
          company_profile_id: string
          created_at?: string
          file_url?: string | null
          generated_at?: string
          id?: string
          jurisdiction_id: string
          report_type: string
        }
        Update: {
          company_profile_id?: string
          created_at?: string
          file_url?: string | null
          generated_at?: string
          id?: string
          jurisdiction_id?: string
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reports_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_requirements: {
        Row: {
          analysis_id: string | null
          category: string
          created_at: string
          description: string
          id: string
          recommendation: string | null
          risk: string
          status: string
          title: string
        }
        Insert: {
          analysis_id?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          recommendation?: string | null
          risk: string
          status: string
          title: string
        }
        Update: {
          analysis_id?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          recommendation?: string | null
          risk?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_requirements_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "compliance_analysis"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_documents: {
        Row: {
          company_profile_id: string
          created_at: string
          description: string | null
          document_type: string
          file_url: string | null
          generated_at: string
          id: string
          issuer: string | null
          jurisdiction_id: string
          title: string | null
        }
        Insert: {
          company_profile_id: string
          created_at?: string
          description?: string | null
          document_type: string
          file_url?: string | null
          generated_at?: string
          id?: string
          issuer?: string | null
          jurisdiction_id: string
          title?: string | null
        }
        Update: {
          company_profile_id?: string
          created_at?: string
          description?: string | null
          document_type?: string
          file_url?: string | null
          generated_at?: string
          id?: string
          issuer?: string | null
          jurisdiction_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_documents_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          role: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
