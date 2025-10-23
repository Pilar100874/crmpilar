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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_endpoints: {
        Row: {
          active: boolean | null
          connection_id: string | null
          created_at: string | null
          database_type: string
          description: string | null
          endpoint_path: string
          http_method: string
          id: string
          name: string
          parameters: Json | null
          query: string
          sql_database: string | null
          sql_password: string | null
          sql_server: string | null
          sql_username: string | null
        }
        Insert: {
          active?: boolean | null
          connection_id?: string | null
          created_at?: string | null
          database_type: string
          description?: string | null
          endpoint_path: string
          http_method: string
          id?: string
          name: string
          parameters?: Json | null
          query: string
          sql_database?: string | null
          sql_password?: string | null
          sql_server?: string | null
          sql_username?: string | null
        }
        Update: {
          active?: boolean | null
          connection_id?: string | null
          created_at?: string | null
          database_type?: string
          description?: string | null
          endpoint_path?: string
          http_method?: string
          id?: string
          name?: string
          parameters?: Json | null
          query?: string
          sql_database?: string | null
          sql_password?: string | null
          sql_server?: string | null
          sql_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_endpoints_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_flows: {
        Row: {
          active: boolean | null
          created_at: string | null
          flow_data: Json
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          flow_data: Json
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          flow_data?: Json
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string | null
          id: string
          n8n_workflow_id: string | null
          nome: string
          schedule_at: string | null
          segment: Json | null
          stats: Json | null
          status: string | null
          template: string
          variables: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          n8n_workflow_id?: string | null
          nome: string
          schedule_at?: string | null
          segment?: Json | null
          stats?: Json | null
          status?: string | null
          template: string
          variables?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          n8n_workflow_id?: string | null
          nome?: string
          schedule_at?: string | null
          segment?: Json | null
          stats?: Json | null
          status?: string | null
          template?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          session_id: string
          updated_at: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          session_id: string
          updated_at?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          session_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contents: {
        Row: {
          blob_ref: string | null
          created_at: string | null
          descricao: string | null
          id: string
          tags: string[] | null
          tipo: string
          titulo: string
          url: string | null
        }
        Insert: {
          blob_ref?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          tags?: string[] | null
          tipo: string
          titulo: string
          url?: string | null
        }
        Update: {
          blob_ref?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          tags?: string[] | null
          tipo?: string
          titulo?: string
          url?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assignee_id: string | null
          bot_id: string | null
          canal: string
          created_at: string | null
          customer_id: string
          id: string
          metadata: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          bot_id?: string | null
          canal: string
          created_at?: string | null
          customer_id: string
          id?: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          bot_id?: string | null
          canal?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          custom_fields: Json | null
          email: string
          id: string
          nome: string
          tags: string[] | null
          telefone: string
          tipo_operador: boolean | null
        }
        Insert: {
          created_at?: string | null
          custom_fields?: Json | null
          email: string
          id?: string
          nome: string
          tags?: string[] | null
          telefone: string
          tipo_operador?: boolean | null
        }
        Update: {
          created_at?: string | null
          custom_fields?: Json | null
          email?: string
          id?: string
          nome?: string
          tags?: string[] | null
          telefone?: string
          tipo_operador?: boolean | null
        }
        Relationships: []
      }
      database_connections: {
        Row: {
          active: boolean | null
          created_at: string | null
          database_type: string
          description: string | null
          id: string
          name: string
          proxy_url: string | null
          sql_database: string
          sql_password: string
          sql_port: string | null
          sql_server: string
          sql_username: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          database_type: string
          description?: string | null
          id?: string
          name: string
          proxy_url?: string | null
          sql_database: string
          sql_password: string
          sql_port?: string | null
          sql_server: string
          sql_username: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          database_type?: string
          description?: string | null
          id?: string
          name?: string
          proxy_url?: string | null
          sql_database?: string
          sql_password?: string
          sql_port?: string | null
          sql_server?: string
          sql_username?: string
        }
        Relationships: []
      }
      flows: {
        Row: {
          created_at: string | null
          created_by: string | null
          graph: Json
          id: string
          nome: string
          published: boolean | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          graph: Json
          id?: string
          nome: string
          published?: boolean | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          graph?: Json
          id?: string
          nome?: string
          published?: boolean | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      global_variables: {
        Row: {
          created_at: string
          default_value: Json | null
          description: string | null
          id: string
          is_constant: boolean | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_value?: Json | null
          description?: string | null
          id?: string
          is_constant?: boolean | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_value?: Json | null
          description?: string | null
          id?: string
          is_constant?: boolean | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      grupos_acesso: {
        Row: {
          created_at: string | null
          id: string
          menus_permitidos: Json | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          menus_permitidos?: Json | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          menus_permitidos?: Json | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: string[] | null
          conversation_id: string
          created_at: string | null
          id: string
          payload: Json | null
          sender: string
          text: string | null
        }
        Insert: {
          attachments?: string[] | null
          conversation_id: string
          created_at?: string | null
          id?: string
          payload?: Json | null
          sender: string
          text?: string | null
        }
        Update: {
          attachments?: string[] | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          payload?: Json | null
          sender?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_attachments: {
        Row: {
          created_at: string | null
          grupo_acesso_id: string | null
          id: string
          is_global: boolean | null
          title: string
          type: string
          updated_at: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          grupo_acesso_id?: string | null
          id?: string
          is_global?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          grupo_acesso_id?: string | null
          id?: string
          is_global?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_attachments_grupo_acesso_id_fkey"
            columns: ["grupo_acesso_id"]
            isOneToOne: false
            referencedRelation: "grupos_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          content: string
          created_at: string | null
          grupo_acesso_id: string | null
          id: string
          is_global: boolean | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          grupo_acesso_id?: string | null
          id?: string
          is_global?: boolean | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          grupo_acesso_id?: string | null
          id?: string
          is_global?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_grupo_acesso_id_fkey"
            columns: ["grupo_acesso_id"]
            isOneToOne: false
            referencedRelation: "grupos_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      segmentos: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      twilio_config: {
        Row: {
          account_sid: string | null
          auth_token: string | null
          created_at: string | null
          id: number
          sandbox_number: string | null
          updated_at: string | null
        }
        Insert: {
          account_sid?: string | null
          auth_token?: string | null
          created_at?: string | null
          id?: number
          sandbox_number?: string | null
          updated_at?: string | null
        }
        Update: {
          account_sid?: string | null
          auth_token?: string | null
          created_at?: string | null
          id?: number
          sandbox_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      unidades: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuario_segmentos: {
        Row: {
          id: string
          segmento_id: string
          usuario_id: string
        }
        Insert: {
          id?: string
          segmento_id: string
          usuario_id: string
        }
        Update: {
          id?: string
          segmento_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_segmentos_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_segmentos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          created_at: string | null
          email: string
          grupo_acesso_id: string | null
          id: string
          nome: string
          senha_hash: string
          telefone: string | null
          unidade_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          grupo_acesso_id?: string | null
          id?: string
          nome: string
          senha_hash: string
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          grupo_acesso_id?: string | null
          id?: string
          nome?: string
          senha_hash?: string
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_grupo_acesso_id_fkey"
            columns: ["grupo_acesso_id"]
            isOneToOne: false
            referencedRelation: "grupos_acesso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config: {
        Row: {
          business_account_id: string | null
          business_token: string
          created_at: string | null
          id: string
          phone_number_id: string
          updated_at: string | null
        }
        Insert: {
          business_account_id?: string | null
          business_token: string
          created_at?: string | null
          id?: string
          phone_number_id: string
          updated_at?: string | null
        }
        Update: {
          business_account_id?: string | null
          business_token?: string
          created_at?: string | null
          id?: string
          phone_number_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      roles_present: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "gestor" | "agente"
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
      app_role: ["admin", "gestor", "agente"],
    },
  },
} as const
