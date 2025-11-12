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
      administradores: {
        Row: {
          cpf: string
          created_at: string | null
          id: string
          nome: string
          senha_hash: string
          updated_at: string | null
        }
        Insert: {
          cpf: string
          created_at?: string | null
          id?: string
          nome: string
          senha_hash: string
          updated_at?: string | null
        }
        Update: {
          cpf?: string
          created_at?: string | null
          id?: string
          nome?: string
          senha_hash?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      api_endpoints: {
        Row: {
          active: boolean | null
          connection_id: string | null
          created_at: string | null
          custom_url: string | null
          database_type: string
          description: string | null
          endpoint_path: string
          estabelecimento_id: string | null
          http_method: string
          id: string
          is_custom: boolean | null
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
          custom_url?: string | null
          database_type: string
          description?: string | null
          endpoint_path: string
          estabelecimento_id?: string | null
          http_method: string
          id?: string
          is_custom?: boolean | null
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
          custom_url?: string | null
          database_type?: string
          description?: string | null
          endpoint_path?: string
          estabelecimento_id?: string | null
          http_method?: string
          id?: string
          is_custom?: boolean | null
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
          {
            foreignKeyName: "api_endpoints_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_flows: {
        Row: {
          active: boolean | null
          canais: string[] | null
          created_at: string | null
          description: string | null
          estabelecimento_id: string | null
          flow_data: Json
          id: string
          name: string
          updated_at: string | null
          whatsapp_type: string | null
        }
        Insert: {
          active?: boolean | null
          canais?: string[] | null
          created_at?: string | null
          description?: string | null
          estabelecimento_id?: string | null
          flow_data: Json
          id?: string
          name: string
          updated_at?: string | null
          whatsapp_type?: string | null
        }
        Update: {
          active?: boolean | null
          canais?: string[] | null
          created_at?: string | null
          description?: string | null
          estabelecimento_id?: string | null
          flow_data?: Json
          id?: string
          name?: string
          updated_at?: string | null
          whatsapp_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_flows_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string | null
          estabelecimento_id: string | null
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
          estabelecimento_id?: string | null
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
          estabelecimento_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "campaigns_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      canais_atendimento: {
        Row: {
          created_at: string | null
          estabelecimento_id: string
          id: string
          telegram_enabled: boolean | null
          updated_at: string | null
          webchat_enabled: boolean | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          telegram_enabled?: boolean | null
          updated_at?: string | null
          webchat_enabled?: boolean | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          telegram_enabled?: boolean | null
          updated_at?: string | null
          webchat_enabled?: boolean | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "canais_atendimento_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
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
      condicoes_pagamento: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string | null
          id: string
          nome: string
          tipo_pagamento_id: string | null
          updated_at: string | null
          valor_maximo: number | null
          valor_minimo: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome: string
          tipo_pagamento_id?: string | null
          updated_at?: string | null
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome?: string
          tipo_pagamento_id?: string | null
          updated_at?: string | null
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "condicoes_pagamento_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condicoes_pagamento_tipo_pagamento_id_fkey"
            columns: ["tipo_pagamento_id"]
            isOneToOne: false
            referencedRelation: "tipos_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          blob_ref: string | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string | null
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
          estabelecimento_id?: string | null
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
          estabelecimento_id?: string | null
          id?: string
          tags?: string[] | null
          tipo?: string
          titulo?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contents_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assignee_id: string | null
          bot_active: boolean
          bot_id: string | null
          canal: string
          created_at: string | null
          customer_id: string
          estabelecimento_id: string | null
          id: string
          metadata: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          bot_active?: boolean
          bot_id?: string | null
          canal: string
          created_at?: string | null
          customer_id: string
          estabelecimento_id?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          bot_active?: boolean
          bot_id?: string | null
          canal?: string
          created_at?: string | null
          customer_id?: string
          estabelecimento_id?: string | null
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
          {
            foreignKeyName: "conversations_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_empresas: {
        Row: {
          cargo: string | null
          created_at: string | null
          customer_id: string
          departamento: string | null
          empresa_id: string
          id: string
          is_primary: boolean | null
        }
        Insert: {
          cargo?: string | null
          created_at?: string | null
          customer_id: string
          departamento?: string | null
          empresa_id: string
          id?: string
          is_primary?: boolean | null
        }
        Update: {
          cargo?: string | null
          created_at?: string | null
          customer_id?: string
          departamento?: string | null
          empresa_id?: string
          id?: string
          is_primary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_empresas_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segmentos: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          segmento_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          segmento_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          segmento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segmentos_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_segmentos_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_vinculos: {
        Row: {
          created_at: string | null
          customer_id: string
          estabelecimento_id: string
          id: string
          segmento_id: string | null
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          estabelecimento_id: string
          id?: string
          segmento_id?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          estabelecimento_id?: string
          id?: string
          segmento_id?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          custom_fields: Json | null
          email: string
          empresa_id: string | null
          estabelecimento_id: string | null
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
          empresa_id?: string | null
          estabelecimento_id?: string | null
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
          empresa_id?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome?: string
          tags?: string[] | null
          telefone?: string
          tipo_operador?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      database_connections: {
        Row: {
          active: boolean | null
          created_at: string | null
          database_type: string
          description: string | null
          estabelecimento_id: string | null
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
          estabelecimento_id?: string | null
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
          estabelecimento_id?: string | null
          id?: string
          name?: string
          proxy_url?: string | null
          sql_database?: string
          sql_password?: string
          sql_port?: string | null
          sql_server?: string
          sql_username?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_connections_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          body: string
          created_at: string
          date: string
          folder: string
          from_email: string
          id: string
          read: boolean
          starred: boolean
          subject: string
          to_email: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          date?: string
          folder?: string
          from_email: string
          id?: string
          read?: boolean
          starred?: boolean
          subject: string
          to_email: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          date?: string
          folder?: string
          from_email?: string
          id?: string
          read?: boolean
          starred?: boolean
          subject?: string
          to_email?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      empresa_vinculos: {
        Row: {
          created_at: string | null
          empresa_id: string
          estabelecimento_id: string
          id: string
          segmento_id: string | null
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          estabelecimento_id: string
          id?: string
          segmento_id?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          estabelecimento_id?: string
          id?: string
          segmento_id?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_vinculos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_vinculos_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_vinculos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          endereco: string | null
          estabelecimento_id: string | null
          estado: string | null
          id: string
          nome: string | null
          nome_fantasia: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          endereco?: string | null
          estabelecimento_id?: string | null
          estado?: string | null
          id?: string
          nome?: string | null
          nome_fantasia?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          endereco?: string | null
          estabelecimento_id?: string | null
          estado?: string | null
          id?: string
          nome?: string | null
          nome_fantasia?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      estabelecimentos: {
        Row: {
          cnpj: string
          created_at: string | null
          id: string
          nome: string
          numero_usuarios_permitidos: number
          updated_at: string | null
        }
        Insert: {
          cnpj: string
          created_at?: string | null
          id?: string
          nome: string
          numero_usuarios_permitidos?: number
          updated_at?: string | null
        }
        Update: {
          cnpj?: string
          created_at?: string | null
          id?: string
          nome?: string
          numero_usuarios_permitidos?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      flows: {
        Row: {
          created_at: string | null
          created_by: string | null
          estabelecimento_id: string | null
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
          estabelecimento_id?: string | null
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
          estabelecimento_id?: string | null
          graph?: Json
          id?: string
          nome?: string
          published?: boolean | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flows_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      form_field_configs: {
        Row: {
          category: string | null
          created_at: string | null
          estabelecimento_id: string | null
          field_id: string
          field_label: string
          field_order: number | null
          field_type: string
          form_type: string
          id: string
          locked: boolean | null
          options: Json | null
          required: boolean | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          estabelecimento_id?: string | null
          field_id: string
          field_label: string
          field_order?: number | null
          field_type: string
          form_type: string
          id?: string
          locked?: boolean | null
          options?: Json | null
          required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          estabelecimento_id?: string | null
          field_id?: string
          field_label?: string
          field_order?: number | null
          field_type?: string
          form_type?: string
          id?: string
          locked?: boolean | null
          options?: Json | null
          required?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_field_configs_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      funil_deals: {
        Row: {
          cliente_id: string | null
          cliente_nome: string
          created_at: string | null
          custom_fields: Json | null
          data_estimada: string | null
          dias_parado: number | null
          estabelecimento_id: string | null
          funil_id: string
          id: string
          origem: string | null
          prioridade: number | null
          responsavel_id: string | null
          saude: string | null
          stage_id: string
          status: string | null
          tags: string[] | null
          ultima_interacao: string | null
          updated_at: string | null
          valor: number | null
        }
        Insert: {
          cliente_id?: string | null
          cliente_nome: string
          created_at?: string | null
          custom_fields?: Json | null
          data_estimada?: string | null
          dias_parado?: number | null
          estabelecimento_id?: string | null
          funil_id: string
          id?: string
          origem?: string | null
          prioridade?: number | null
          responsavel_id?: string | null
          saude?: string | null
          stage_id: string
          status?: string | null
          tags?: string[] | null
          ultima_interacao?: string | null
          updated_at?: string | null
          valor?: number | null
        }
        Update: {
          cliente_id?: string | null
          cliente_nome?: string
          created_at?: string | null
          custom_fields?: Json | null
          data_estimada?: string | null
          dias_parado?: number | null
          estabelecimento_id?: string | null
          funil_id?: string
          id?: string
          origem?: string | null
          prioridade?: number | null
          responsavel_id?: string | null
          saude?: string | null
          stage_id?: string
          status?: string | null
          tags?: string[] | null
          ultima_interacao?: string | null
          updated_at?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funil_deals_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funil_deals_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funil_deals_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funil_deals_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funil_deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "funil_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      funil_stages: {
        Row: {
          cor: string | null
          created_at: string | null
          descricao: string | null
          funil_id: string
          id: string
          is_final: boolean | null
          nome: string
          ordem: number
          playbook_automatico: Json | null
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          funil_id: string
          id?: string
          is_final?: boolean | null
          nome: string
          ordem?: number
          playbook_automatico?: Json | null
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          funil_id?: string
          id?: string
          is_final?: boolean | null
          nome?: string
          ordem?: number
          playbook_automatico?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "funil_stages_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
        ]
      }
      funis: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funis_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
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
          estabelecimento_id: string | null
          id: string
          menus_permitidos: Json | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          menus_permitidos?: Json | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          menus_permitidos?: Json | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grupos_acesso_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_automations: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          description: string | null
          estabelecimento_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          description?: string | null
          estabelecimento_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          description?: string | null
          estabelecimento_id?: string
          id?: string
          name?: string
          updated_at?: string
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
      notificacoes_config: {
        Row: {
          campanha_concluida_enabled: boolean | null
          created_at: string | null
          erros_sistema_enabled: boolean | null
          estabelecimento_id: string
          id: string
          nova_conversa_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          campanha_concluida_enabled?: boolean | null
          created_at?: string | null
          erros_sistema_enabled?: boolean | null
          estabelecimento_id: string
          id?: string
          nova_conversa_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          campanha_concluida_enabled?: boolean | null
          created_at?: string | null
          erros_sistema_enabled?: boolean | null
          estabelecimento_id?: string
          id?: string
          nova_conversa_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_historico: {
        Row: {
          acao: string
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          orcamento_id: string | null
          tipo_usuario: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          orcamento_id?: string | null
          tipo_usuario: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          orcamento_id?: string | null
          tipo_usuario?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_historico_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens: {
        Row: {
          created_at: string | null
          desconto: number | null
          id: string
          orcamento_id: string | null
          preco_original: number
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          subtotal: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          desconto?: number | null
          id?: string
          orcamento_id?: string | null
          preco_original: number
          preco_unitario: number
          produto_id?: string | null
          quantidade: number
          subtotal: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          desconto?: number | null
          id?: string
          orcamento_id?: string | null
          preco_original?: number
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          subtotal?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          cliente_id: string | null
          condicao_pagamento_id: string | null
          created_at: string | null
          data_envio: string | null
          data_modificacao_cliente: string | null
          data_visualizacao: string | null
          empresa_id: string | null
          estabelecimento_id: string | null
          etapa: string
          id: string
          motivo_perda: string | null
          observacoes: string | null
          orcamento_origem_id: string | null
          percentual_desconto: number | null
          status: string
          token_compartilhamento: string | null
          unidade_id: string | null
          updated_at: string | null
          valor_desconto: number | null
          valor_total: number | null
          vendedor_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          condicao_pagamento_id?: string | null
          created_at?: string | null
          data_envio?: string | null
          data_modificacao_cliente?: string | null
          data_visualizacao?: string | null
          empresa_id?: string | null
          estabelecimento_id?: string | null
          etapa?: string
          id?: string
          motivo_perda?: string | null
          observacoes?: string | null
          orcamento_origem_id?: string | null
          percentual_desconto?: number | null
          status?: string
          token_compartilhamento?: string | null
          unidade_id?: string | null
          updated_at?: string | null
          valor_desconto?: number | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          condicao_pagamento_id?: string | null
          created_at?: string | null
          data_envio?: string | null
          data_modificacao_cliente?: string | null
          data_visualizacao?: string | null
          empresa_id?: string | null
          estabelecimento_id?: string | null
          etapa?: string
          id?: string
          motivo_perda?: string | null
          observacoes?: string | null
          orcamento_origem_id?: string | null
          percentual_desconto?: number | null
          status?: string
          token_compartilhamento?: string | null
          unidade_id?: string | null
          updated_at?: string | null
          valor_desconto?: number | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_condicao_pagamento_id_fkey"
            columns: ["condicao_pagamento_id"]
            isOneToOne: false
            referencedRelation: "condicoes_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_orcamento_origem_id_fkey"
            columns: ["orcamento_origem_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_categorias: {
        Row: {
          created_at: string | null
          estabelecimento_id: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_categorias_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_grupos: {
        Row: {
          created_at: string | null
          estabelecimento_id: string | null
          id: string
          nome: string
          percentual_comissao: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome: string
          percentual_comissao?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome?: string
          percentual_comissao?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_grupos_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          comprimento: number | null
          created_at: string | null
          estabelecimento_id: string | null
          foto_url: string | null
          gramatura: number | null
          grupo_id: string | null
          id: string
          largura: number | null
          nome: string
          numero_folhas: number | null
          peso_unitario: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria_id?: string | null
          comprimento?: number | null
          created_at?: string | null
          estabelecimento_id?: string | null
          foto_url?: string | null
          gramatura?: number | null
          grupo_id?: string | null
          id?: string
          largura?: number | null
          nome: string
          numero_folhas?: number | null
          peso_unitario?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string | null
          comprimento?: number | null
          created_at?: string | null
          estabelecimento_id?: string | null
          foto_url?: string | null
          gramatura?: number | null
          grupo_id?: string | null
          id?: string
          largura?: number | null
          nome?: string
          numero_folhas?: number | null
          peso_unitario?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "produto_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "produto_grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_sugeridos: {
        Row: {
          aceito: boolean | null
          created_at: string | null
          enviado: boolean | null
          id: string
          orcamento_id: string | null
          produto_id: string | null
        }
        Insert: {
          aceito?: boolean | null
          created_at?: string | null
          enviado?: boolean | null
          id?: string
          orcamento_id?: string | null
          produto_id?: string | null
        }
        Update: {
          aceito?: boolean | null
          created_at?: string | null
          enviado?: boolean | null
          id?: string
          orcamento_id?: string | null
          produto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_sugeridos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_sugeridos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_attachments: {
        Row: {
          created_at: string | null
          estabelecimento_id: string | null
          file_type: string | null
          grupo_acesso_id: string | null
          id: string
          is_global: boolean | null
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id?: string | null
          file_type?: string | null
          grupo_acesso_id?: string | null
          id?: string
          is_global?: boolean | null
          thumbnail_url?: string | null
          title: string
          type: string
          updated_at?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string | null
          file_type?: string | null
          grupo_acesso_id?: string | null
          id?: string
          is_global?: boolean | null
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_attachments_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
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
          estabelecimento_id: string | null
          grupo_acesso_id: string | null
          id: string
          is_global: boolean | null
          shortcut: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          estabelecimento_id?: string | null
          grupo_acesso_id?: string | null
          id?: string
          is_global?: boolean | null
          shortcut?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          estabelecimento_id?: string | null
          grupo_acesso_id?: string | null
          id?: string
          is_global?: boolean | null
          shortcut?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_replies_grupo_acesso_id_fkey"
            columns: ["grupo_acesso_id"]
            isOneToOne: false
            referencedRelation: "grupos_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      redes_sociais: {
        Row: {
          created_at: string | null
          estabelecimento_id: string
          facebook: string | null
          id: string
          instagram: string | null
          updated_at: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          updated_at?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          updated_at?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redes_sociais_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorio_jobs: {
        Row: {
          api_variables: Json | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          pdf_url: string | null
          relatorio_id: string
          reportbro_key: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          api_variables?: Json | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          pdf_url?: string | null
          relatorio_id: string
          reportbro_key?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          api_variables?: Json | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          pdf_url?: string | null
          relatorio_id?: string
          reportbro_key?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorio_jobs_relatorio_id_fkey"
            columns: ["relatorio_id"]
            isOneToOne: false
            referencedRelation: "relatorios"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios: {
        Row: {
          conexao_id: string | null
          configuracoes: Json | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string | null
          id: string
          layout_json: Json
          nome: string
          parametros: Json | null
          query_sql: string | null
          updated_at: string | null
        }
        Insert: {
          conexao_id?: string | null
          configuracoes?: Json | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string | null
          id?: string
          layout_json?: Json
          nome: string
          parametros?: Json | null
          query_sql?: string | null
          updated_at?: string | null
        }
        Update: {
          conexao_id?: string | null
          configuracoes?: Json | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string | null
          id?: string
          layout_json?: Json
          nome?: string
          parametros?: Json | null
          query_sql?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_conexao_id_fkey"
            columns: ["conexao_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      report_preview_jobs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          included: number | null
          pdf_url: string | null
          report_id: string | null
          requested_by: string | null
          status: string
          total: number | null
          truncated: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          included?: number | null
          pdf_url?: string | null
          report_id?: string | null
          requested_by?: string | null
          status?: string
          total?: number | null
          truncated?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          included?: number | null
          pdf_url?: string | null
          report_id?: string | null
          requested_by?: string | null
          status?: string
          total?: number | null
          truncated?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      report_templates_jsreport: {
        Row: {
          created_at: string
          database_connection_id: string | null
          descricao: string | null
          estabelecimento_id: string
          id: string
          nome: string
          template: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          database_connection_id?: string | null
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
          template?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          database_connection_id?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
          template?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_jsreport_database_connection_id_fkey"
            columns: ["database_connection_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_templates_jsreport_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      resend_config: {
        Row: {
          api_key: string
          created_at: string | null
          estabelecimento_id: string
          from_email: string
          from_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          estabelecimento_id: string
          from_email: string
          from_name: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          estabelecimento_id?: string
          from_email?: string
          from_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resend_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      segmentos: {
        Row: {
          created_at: string | null
          estabelecimento_id: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "segmentos_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      seguranca_config: {
        Row: {
          consentimento_obrigatorio: boolean | null
          created_at: string | null
          estabelecimento_id: string
          id: string
          retencao_dados_dias: number | null
          updated_at: string | null
        }
        Insert: {
          consentimento_obrigatorio?: boolean | null
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          retencao_dados_dias?: number | null
          updated_at?: string | null
        }
        Update: {
          consentimento_obrigatorio?: boolean | null
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          retencao_dados_dias?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seguranca_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      tabelas_preco: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          created_at: string | null
          estabelecimento_id: string | null
          id: string
          preco_minimo: number
          preco_tabela: number
          unidade_id: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria_id?: string | null
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          preco_minimo: number
          preco_tabela: number
          unidade_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string | null
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          preco_minimo?: number
          preco_tabela?: number
          unidade_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tabelas_preco_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "produto_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tabelas_preco_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tabelas_preco_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_pagamento: {
        Row: {
          ativo: boolean
          created_at: string | null
          estabelecimento_id: string | null
          id: string
          nome: string
          taxa_percentual: number
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome: string
          taxa_percentual?: number
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome?: string
          taxa_percentual?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tipos_pagamento_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
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
          estabelecimento_id: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unidades_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
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
          estabelecimento_id: string | null
          grupo_acesso_id: string | null
          hora_final: string
          hora_inicial: string
          id: string
          nome: string
          pop: string | null
          porta_pop: number | null
          porta_smtp: number | null
          senha_email: string | null
          senha_hash: string
          smtp: string | null
          telefone: string | null
          unidade_id: string | null
          updated_at: string | null
          usar_autenticacao: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          estabelecimento_id?: string | null
          grupo_acesso_id?: string | null
          hora_final?: string
          hora_inicial?: string
          id?: string
          nome: string
          pop?: string | null
          porta_pop?: number | null
          porta_smtp?: number | null
          senha_email?: string | null
          senha_hash: string
          smtp?: string | null
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string | null
          usar_autenticacao?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          estabelecimento_id?: string | null
          grupo_acesso_id?: string | null
          hora_final?: string
          hora_inicial?: string
          id?: string
          nome?: string
          pop?: string | null
          porta_pop?: number | null
          porta_smtp?: number | null
          senha_email?: string | null
          senha_hash?: string
          smtp?: string | null
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string | null
          usar_autenticacao?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
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
      webhook_chat_messages: {
        Row: {
          content: string
          content_type: string
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          role: string
          session_id: string
          variables: Json | null
        }
        Insert: {
          content: string
          content_type?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          role: string
          session_id: string
          variables?: Json | null
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          role?: string
          session_id?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "webhook_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_chat_sessions: {
        Row: {
          conversation_id: string | null
          created_at: string
          estabelecimento_id: string
          id: string
          session_type: string
          updated_at: string
          user_id: string
          webhook_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          estabelecimento_id: string
          id?: string
          session_type: string
          updated_at?: string
          user_id: string
          webhook_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          estabelecimento_id?: string
          id?: string
          session_type?: string
          updated_at?: string
          user_id?: string
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_chat_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_chat_sessions_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_types: {
        Row: {
          created_at: string | null
          estabelecimento_id: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_types_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_usage_locations: {
        Row: {
          created_at: string | null
          estabelecimento_id: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_usage_locations_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          estabelecimento_id: string
          has_input_variables: boolean | null
          has_variables: boolean | null
          id: string
          input_variables: Json | null
          local_uso: string | null
          method: string
          name: string
          type: string
          updated_at: string | null
          url: string
          usage_locations: Json | null
          variables: Json | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          estabelecimento_id: string
          has_input_variables?: boolean | null
          has_variables?: boolean | null
          id?: string
          input_variables?: Json | null
          local_uso?: string | null
          method?: string
          name: string
          type: string
          updated_at?: string | null
          url: string
          usage_locations?: Json | null
          variables?: Json | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          estabelecimento_id?: string
          has_input_variables?: boolean | null
          has_variables?: boolean | null
          id?: string
          input_variables?: Json | null
          local_uso?: string | null
          method?: string
          name?: string
          type?: string
          updated_at?: string | null
          url?: string
          usage_locations?: Json | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks_entrada: {
        Row: {
          acao_tipo: string
          aceita_form_data: boolean
          aceita_json: boolean
          ativo: boolean
          automacao_id: string | null
          bot_id: string | null
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          id: string
          metodo: string
          nome: string
          total_triggers: number
          ultimo_trigger: string | null
          updated_at: string
          url_customizada: string | null
          url_gerada: string
        }
        Insert: {
          acao_tipo: string
          aceita_form_data?: boolean
          aceita_json?: boolean
          ativo?: boolean
          automacao_id?: string | null
          bot_id?: string | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          metodo?: string
          nome: string
          total_triggers?: number
          ultimo_trigger?: string | null
          updated_at?: string
          url_customizada?: string | null
          url_gerada: string
        }
        Update: {
          acao_tipo?: string
          aceita_form_data?: boolean
          aceita_json?: boolean
          ativo?: boolean
          automacao_id?: string | null
          bot_id?: string | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          metodo?: string
          nome?: string
          total_triggers?: number
          ultimo_trigger?: string | null
          updated_at?: string
          url_customizada?: string | null
          url_gerada?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_entrada_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_entrada_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config: {
        Row: {
          business_account_id: string | null
          business_token: string | null
          created_at: string | null
          estabelecimento_id: string | null
          id: string
          phone_number_id: string | null
          session_name: string | null
          updated_at: string | null
          waha_api_key: string | null
          waha_url: string | null
          webhook_url: string | null
        }
        Insert: {
          business_account_id?: string | null
          business_token?: string | null
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          phone_number_id?: string | null
          session_name?: string | null
          updated_at?: string | null
          waha_api_key?: string | null
          waha_url?: string | null
          webhook_url?: string | null
        }
        Update: {
          business_account_id?: string | null
          business_token?: string | null
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          phone_number_id?: string | null
          session_name?: string | null
          updated_at?: string | null
          waha_api_key?: string | null
          waha_url?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          bot_flow_id: string | null
          created_at: string
          estabelecimento_id: string | null
          id: string
          phone_number: string | null
          qr_code: string | null
          session_name: string
          status: string
          updated_at: string
        }
        Insert: {
          bot_flow_id?: string | null
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          phone_number?: string | null
          qr_code?: string | null
          session_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          bot_flow_id?: string | null
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          phone_number?: string | null
          qr_code?: string | null
          session_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_bot_flow_id_fkey"
            columns: ["bot_flow_id"]
            isOneToOne: false
            referencedRelation: "bot_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sessions_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_login: {
        Args: { cpf_input: string; password_input: string }
        Returns: string
      }
      admins_present: { Args: never; Returns: boolean }
      execute_sql: { Args: { sql_query: string }; Returns: Json }
      generate_orcamento_token: { Args: never; Returns: string }
      get_user_estabelecimento_id: {
        Args: { _user_id: string }
        Returns: string
      }
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
