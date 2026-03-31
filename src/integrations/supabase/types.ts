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
      ad_accounts: {
        Row: {
          created_at: string | null
          credenciais_json: Json | null
          estabelecimento_id: string
          id: string
          nome_conta: string
          plataforma_id: string
          status: string | null
          ultimo_sync: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credenciais_json?: Json | null
          estabelecimento_id: string
          id?: string
          nome_conta: string
          plataforma_id: string
          status?: string | null
          ultimo_sync?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credenciais_json?: Json | null
          estabelecimento_id?: string
          id?: string
          nome_conta?: string
          plataforma_id?: string
          status?: string | null
          ultimo_sync?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_accounts_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_accounts_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "ad_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_insights: {
        Row: {
          anuncio: string | null
          campanha: string | null
          cliques: number | null
          conjunto: string | null
          conta_id: string
          conversoes: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          dados_brutos_json: Json | null
          data: string
          estabelecimento_id: string
          gastos: number | null
          id: string
          impressoes: number | null
          plataforma_id: string
          receita: number | null
          roas: number | null
        }
        Insert: {
          anuncio?: string | null
          campanha?: string | null
          cliques?: number | null
          conjunto?: string | null
          conta_id: string
          conversoes?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          dados_brutos_json?: Json | null
          data: string
          estabelecimento_id: string
          gastos?: number | null
          id?: string
          impressoes?: number | null
          plataforma_id: string
          receita?: number | null
          roas?: number | null
        }
        Update: {
          anuncio?: string | null
          campanha?: string | null
          cliques?: number | null
          conjunto?: string | null
          conta_id?: string
          conversoes?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          dados_brutos_json?: Json | null
          data?: string
          estabelecimento_id?: string
          gastos?: number | null
          id?: string
          impressoes?: number | null
          plataforma_id?: string
          receita?: number | null
          roas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_insights_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_insights_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_insights_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "ad_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_platforms: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          icone: string | null
          id: string
          nome: string
          nome_display: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          icone?: string | null
          id?: string
          nome: string
          nome_display: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          icone?: string | null
          id?: string
          nome?: string
          nome_display?: string
        }
        Relationships: []
      }
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
      ads_automacoes: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string
          flow_data: Json
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id: string
          flow_data?: Json
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          flow_data?: Json
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_automacoes_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_logs_coleta: {
        Row: {
          created_at: string | null
          detalhes: Json | null
          estabelecimento_id: string
          id: string
          mensagem: string | null
          plataforma_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          detalhes?: Json | null
          estabelecimento_id: string
          id?: string
          mensagem?: string | null
          plataforma_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          detalhes?: Json | null
          estabelecimento_id?: string
          id?: string
          mensagem?: string | null
          plataforma_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_logs_coleta_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_logs_coleta_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "ad_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_chat_sessions: {
        Row: {
          agent_id: string
          created_at: string
          estabelecimento_id: string
          id: string
          titulo: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          estabelecimento_id: string
          id?: string
          titulo?: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          estabelecimento_id?: string
          id?: string
          titulo?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_chat_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "chat_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_chat_sessions_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_chat_sessions_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_api_keys: {
        Row: {
          api_key: string | null
          api_secret: string | null
          base_url: string | null
          created_at: string
          estabelecimento_id: string
          id: string
          is_active: boolean | null
          last_validated_at: string | null
          organization_id: string | null
          project_id: string | null
          provider: string
          provider_display_name: string
          updated_at: string
          validation_status: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          base_url?: string | null
          created_at?: string
          estabelecimento_id: string
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          organization_id?: string | null
          project_id?: string | null
          provider: string
          provider_display_name: string
          updated_at?: string
          validation_status?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          base_url?: string | null
          created_at?: string
          estabelecimento_id?: string
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          organization_id?: string | null
          project_id?: string | null
          provider?: string
          provider_display_name?: string
          updated_at?: string
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_api_keys_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_studio_workflows: {
        Row: {
          created_at: string
          descricao: string | null
          edges_data: Json
          estabelecimento_id: string
          id: string
          nodes_data: Json
          nome: string
          pasta: string | null
          thumbnail: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          edges_data?: Json
          estabelecimento_id: string
          id?: string
          nodes_data?: Json
          nome: string
          pasta?: string | null
          thumbnail?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          edges_data?: Json
          estabelecimento_id?: string
          id?: string
          nodes_data?: Json
          nome?: string
          pasta?: string | null
          thumbnail?: string | null
          updated_at?: string
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
          locais_permitidos: string[] | null
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
          locais_permitidos?: string[] | null
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
          locais_permitidos?: string[] | null
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
      arquivos_precos_importados: {
        Row: {
          caminho_armazenamento: string | null
          data_importacao: string | null
          estabelecimento_id: string
          fonte_id: string
          id: string
          mapeamento_colunas_json: Json | null
          nome_arquivo: string
        }
        Insert: {
          caminho_armazenamento?: string | null
          data_importacao?: string | null
          estabelecimento_id: string
          fonte_id: string
          id?: string
          mapeamento_colunas_json?: Json | null
          nome_arquivo: string
        }
        Update: {
          caminho_armazenamento?: string | null
          data_importacao?: string | null
          estabelecimento_id?: string
          fonte_id?: string
          id?: string
          mapeamento_colunas_json?: Json | null
          nome_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_precos_importados_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivos_precos_importados_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "fontes_pesquisa_precos"
            referencedColumns: ["id"]
          },
        ]
      }
      atendente_carteiras: {
        Row: {
          atendente_id: string
          ativa: boolean | null
          created_at: string | null
          customer_id: string
          estabelecimento_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          atendente_id: string
          ativa?: boolean | null
          created_at?: string | null
          customer_id: string
          estabelecimento_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          atendente_id?: string
          ativa?: boolean | null
          created_at?: string | null
          customer_id?: string
          estabelecimento_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atendente_carteiras_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendente_carteiras_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendente_carteiras_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      atendente_filas: {
        Row: {
          atendente_id: string
          created_at: string | null
          fila_id: string
          id: string
          prioridade: number | null
        }
        Insert: {
          atendente_id: string
          created_at?: string | null
          fila_id: string
          id?: string
          prioridade?: number | null
        }
        Update: {
          atendente_id?: string
          created_at?: string | null
          fila_id?: string
          id?: string
          prioridade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "atendente_filas_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendente_filas_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      atendente_skills: {
        Row: {
          atendente_id: string
          created_at: string | null
          id: string
          nivel: number | null
          skill_id: string
        }
        Insert: {
          atendente_id: string
          created_at?: string | null
          id?: string
          nivel?: number | null
          skill_id: string
        }
        Update: {
          atendente_id?: string
          created_at?: string | null
          id?: string
          nivel?: number | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendente_skills_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendente_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      atendentes: {
        Row: {
          aceita_novos_chats: boolean | null
          created_at: string | null
          estabelecimento_id: string
          id: string
          max_chats_simultaneos: number | null
          motivo_pausa: string | null
          status: Database["public"]["Enums"]["atendente_status"] | null
          tempo_pausa_inicio: string | null
          ultimo_status_mudanca: string | null
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          aceita_novos_chats?: boolean | null
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          max_chats_simultaneos?: number | null
          motivo_pausa?: string | null
          status?: Database["public"]["Enums"]["atendente_status"] | null
          tempo_pausa_inicio?: string | null
          ultimo_status_mudanca?: string | null
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          aceita_novos_chats?: boolean | null
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          max_chats_simultaneos?: number | null
          motivo_pausa?: string | null
          status?: Database["public"]["Enums"]["atendente_status"] | null
          tempo_pausa_inicio?: string | null
          ultimo_status_mudanca?: string | null
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendentes_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendentes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimento_config_proxima_data: {
        Row: {
          created_at: string | null
          dias_padrao: number
          estabelecimento_id: string
          id: string
          tipo_contato: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dias_padrao?: number
          estabelecimento_id: string
          id?: string
          tipo_contato: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dias_padrao?: number
          estabelecimento_id?: string
          id?: string
          tipo_contato?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimento_config_proxima_data_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimento_flags: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          estabelecimento_id: string
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimento_flags_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimento_registros: {
        Row: {
          created_at: string | null
          data_proximo_contato: string
          envio_massa: boolean | null
          estabelecimento_id: string
          flag_id: string | null
          id: string
          observacao: string | null
          tarefa_id: string
          tipo_contato: string
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          data_proximo_contato: string
          envio_massa?: boolean | null
          estabelecimento_id: string
          flag_id?: string | null
          id?: string
          observacao?: string | null
          tarefa_id: string
          tipo_contato: string
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          data_proximo_contato?: string
          envio_massa?: boolean | null
          estabelecimento_id?: string
          flag_id?: string | null
          id?: string
          observacao?: string | null
          tarefa_id?: string
          tipo_contato?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendimento_registros_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimento_registros_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "atendimento_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimento_registros_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "calendario_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      automacoes_vendas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string
          expires_at: string | null
          flow_data: Json
          id: string
          nome: string
          prioridade: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id: string
          expires_at?: string | null
          flow_data: Json
          id?: string
          nome: string
          prioridade?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          expires_at?: string | null
          flow_data?: Json
          id?: string
          nome?: string
          prioridade?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_automacoes_vendas_estabelecimento"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      automacoes_vendas_log: {
        Row: {
          automacao_id: string
          created_at: string | null
          detalhes: Json | null
          id: string
          orcamento_id: string
          percentual_desconto: number | null
          regra_aplicada: string
          valor_desconto: number | null
        }
        Insert: {
          automacao_id: string
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          orcamento_id: string
          percentual_desconto?: number | null
          regra_aplicada: string
          valor_desconto?: number | null
        }
        Update: {
          automacao_id?: string
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          orcamento_id?: string
          percentual_desconto?: number | null
          regra_aplicada?: string
          valor_desconto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_automacoes_vendas_log_automacao"
            columns: ["automacao_id"]
            isOneToOne: false
            referencedRelation: "automacoes_vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_automacoes_vendas_log_orcamento"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_lidos: {
        Row: {
          aviso_id: string
          id: string
          lido_em: string
          usuario_id: string
        }
        Insert: {
          aviso_id: string
          id?: string
          lido_em?: string
          usuario_id: string
        }
        Update: {
          aviso_id?: string
          id?: string
          lido_em?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_lidos_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos_sistema"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_lidos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_sistema: {
        Row: {
          ativo: boolean | null
          created_at: string
          criado_por: string | null
          destinatarios_ids: string[] | null
          destinatarios_roles: string[] | null
          destinatarios_tipo: string
          estabelecimento_id: string | null
          expira_em: string | null
          id: string
          mensagem: string
          resolvido: boolean | null
          resolvido_em: string | null
          resolvido_por: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          criado_por?: string | null
          destinatarios_ids?: string[] | null
          destinatarios_roles?: string[] | null
          destinatarios_tipo?: string
          estabelecimento_id?: string | null
          expira_em?: string | null
          id?: string
          mensagem: string
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          tipo?: string
          titulo: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          criado_por?: string | null
          destinatarios_ids?: string[] | null
          destinatarios_roles?: string[] | null
          destinatarios_tipo?: string
          estabelecimento_id?: string | null
          expira_em?: string | null
          id?: string
          mensagem?: string
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_sistema_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_sistema_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_sistema_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
      calendario_regras: {
        Row: {
          ativa: boolean
          configuracao: Json | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string
          id: string
          nome: string
          ordem: number | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean
          configuracao?: Json | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
          ordem?: number | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean
          configuracao?: Json | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
          ordem?: number | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      calendario_tarefas: {
        Row: {
          campaign_id: string | null
          contact_id: string | null
          contact_name: string
          created_at: string
          data_original: string | null
          date: string
          description: string | null
          estabelecimento_id: string
          id: string
          is_all_day: boolean | null
          origem: string
          origem_sub_item: string | null
          status: string
          time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          contact_id?: string | null
          contact_name: string
          created_at?: string
          data_original?: string | null
          date: string
          description?: string | null
          estabelecimento_id: string
          id?: string
          is_all_day?: boolean | null
          origem: string
          origem_sub_item?: string | null
          status?: string
          time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          contact_id?: string | null
          contact_name?: string
          created_at?: string
          data_original?: string | null
          date?: string
          description?: string | null
          estabelecimento_id?: string
          id?: string
          is_all_day?: boolean | null
          origem?: string
          origem_sub_item?: string | null
          status?: string
          time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendario_tarefas_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendario_tarefas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          call_id: string | null
          created_at: string
          direcao: string
          duracao_segundos: number | null
          estabelecimento_id: string
          horario_atendimento: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          metadata: Json | null
          numero_destino: string | null
          numero_origem: string | null
          ramal: string | null
          recording_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          call_id?: string | null
          created_at?: string
          direcao: string
          duracao_segundos?: number | null
          estabelecimento_id: string
          horario_atendimento?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          metadata?: Json | null
          numero_destino?: string | null
          numero_origem?: string | null
          ramal?: string | null
          recording_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          call_id?: string | null
          created_at?: string
          direcao?: string
          duracao_segundos?: number | null
          estabelecimento_id?: string
          horario_atendimento?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          metadata?: Json | null
          numero_destino?: string | null
          numero_origem?: string | null
          ramal?: string | null
          recording_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_permissions: {
        Row: {
          allowed_tags: string[] | null
          blocked_tags: string[] | null
          created_at: string
          delay_max_seconds: number
          delay_min_seconds: number
          estabelecimento_id: string
          id: string
          include_media: boolean
          is_active: boolean
          last_contact_days: number
          max_per_day: number
          max_per_hour: number
          min_score: number
          nome: string
          only_replied: boolean
          optin_required: boolean
          randomize_text: boolean
          risk_level: string | null
          risk_score: number | null
          stop_if_blocks: number | null
          stop_if_low_response: number | null
          updated_at: string
        }
        Insert: {
          allowed_tags?: string[] | null
          blocked_tags?: string[] | null
          created_at?: string
          delay_max_seconds?: number
          delay_min_seconds?: number
          estabelecimento_id: string
          id?: string
          include_media?: boolean
          is_active?: boolean
          last_contact_days?: number
          max_per_day?: number
          max_per_hour?: number
          min_score?: number
          nome?: string
          only_replied?: boolean
          optin_required?: boolean
          randomize_text?: boolean
          risk_level?: string | null
          risk_score?: number | null
          stop_if_blocks?: number | null
          stop_if_low_response?: number | null
          updated_at?: string
        }
        Update: {
          allowed_tags?: string[] | null
          blocked_tags?: string[] | null
          created_at?: string
          delay_max_seconds?: number
          delay_min_seconds?: number
          estabelecimento_id?: string
          id?: string
          include_media?: boolean
          is_active?: boolean
          last_contact_days?: number
          max_per_day?: number
          max_per_hour?: number
          min_score?: number
          nome?: string
          only_replied?: boolean
          optin_required?: boolean
          randomize_text?: boolean
          risk_level?: string | null
          risk_score?: number | null
          stop_if_blocks?: number | null
          stop_if_low_response?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_permissions_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_send_logs: {
        Row: {
          campaign_id: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          error_message: string | null
          estabelecimento_id: string
          has_response: boolean | null
          id: string
          message_content: string | null
          metadata: Json | null
          permission_id: string | null
          response_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          skip_reason: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          error_message?: string | null
          estabelecimento_id: string
          has_response?: boolean | null
          id?: string
          message_content?: string | null
          metadata?: Json | null
          permission_id?: string | null
          response_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          skip_reason?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          error_message?: string | null
          estabelecimento_id?: string
          has_response?: boolean | null
          id?: string
          message_content?: string | null
          metadata?: Json | null
          permission_id?: string | null
          response_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          skip_reason?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_send_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_send_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_send_logs_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_send_logs_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "campaign_permissions"
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
      canal_transitions: {
        Row: {
          canal_destino: string
          canal_origem: string
          contexto_transferido: Json | null
          conversa_destino_id: string | null
          conversa_origem_id: string | null
          created_at: string | null
          customer_id: string
          estabelecimento_id: string
          id: string
          motivo: string | null
          session_id: string
          sucesso: boolean | null
        }
        Insert: {
          canal_destino: string
          canal_origem: string
          contexto_transferido?: Json | null
          conversa_destino_id?: string | null
          conversa_origem_id?: string | null
          created_at?: string | null
          customer_id: string
          estabelecimento_id: string
          id?: string
          motivo?: string | null
          session_id: string
          sucesso?: boolean | null
        }
        Update: {
          canal_destino?: string
          canal_origem?: string
          contexto_transferido?: Json | null
          conversa_destino_id?: string | null
          conversa_origem_id?: string | null
          created_at?: string | null
          customer_id?: string
          estabelecimento_id?: string
          id?: string
          motivo?: string | null
          session_id?: string
          sucesso?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "canal_transitions_conversa_destino_id_fkey"
            columns: ["conversa_destino_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canal_transitions_conversa_origem_id_fkey"
            columns: ["conversa_origem_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canal_transitions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canal_transitions_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canal_transitions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "omnichannel_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_ai_images: {
        Row: {
          created_at: string
          estabelecimento_id: string
          id: string
          prompt: string | null
          public_url: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          prompt?: string | null
          public_url: string
          storage_path: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          prompt?: string | null
          public_url?: string
          storage_path?: string
        }
        Relationships: []
      }
      catalogos_salvos: {
        Row: {
          ativo: boolean | null
          backcover_page: Json | null
          config: Json
          cover_page: Json | null
          created_at: string
          data_indeterminada: boolean | null
          data_validade: string | null
          estabelecimento_id: string
          id: string
          nome: string
          products_page: Json | null
          thumbnail: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          backcover_page?: Json | null
          config?: Json
          cover_page?: Json | null
          created_at?: string
          data_indeterminada?: boolean | null
          data_validade?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
          products_page?: Json | null
          thumbnail?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          backcover_page?: Json | null
          config?: Json
          cover_page?: Json | null
          created_at?: string
          data_indeterminada?: boolean | null
          data_validade?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
          products_page?: Json | null
          thumbnail?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_agent_kb_files: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          mime_type: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes?: number | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          storage_path?: string
          tamanho_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_agent_kb_files_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "chat_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_agents: {
        Row: {
          acumular_filtros: boolean
          api_endpoint_config: Json | null
          api_endpoint_ids: string[] | null
          ativo: boolean
          cor: string
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          gerar_pre_orcamento: boolean | null
          icone: string
          id: string
          knowledge_base_internal_data: Json | null
          knowledge_base_type: string
          modelo_ia: string
          modo_operacao: string
          nome: string
          ordem: number
          permite_cliente: boolean
          regras_busca_personalizada: string | null
          resposta_formato_tabela: boolean
          solicitar_cnpj: boolean | null
          system_prompt: string
          updated_at: string
          usar_estoque_sistema: boolean
          usar_produtos_importados: boolean
        }
        Insert: {
          acumular_filtros?: boolean
          api_endpoint_config?: Json | null
          api_endpoint_ids?: string[] | null
          ativo?: boolean
          cor?: string
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          gerar_pre_orcamento?: boolean | null
          icone?: string
          id?: string
          knowledge_base_internal_data?: Json | null
          knowledge_base_type?: string
          modelo_ia?: string
          modo_operacao?: string
          nome: string
          ordem?: number
          permite_cliente?: boolean
          regras_busca_personalizada?: string | null
          resposta_formato_tabela?: boolean
          solicitar_cnpj?: boolean | null
          system_prompt?: string
          updated_at?: string
          usar_estoque_sistema?: boolean
          usar_produtos_importados?: boolean
        }
        Update: {
          acumular_filtros?: boolean
          api_endpoint_config?: Json | null
          api_endpoint_ids?: string[] | null
          ativo?: boolean
          cor?: string
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          gerar_pre_orcamento?: boolean | null
          icone?: string
          id?: string
          knowledge_base_internal_data?: Json | null
          knowledge_base_type?: string
          modelo_ia?: string
          modo_operacao?: string
          nome?: string
          ordem?: number
          permite_cliente?: boolean
          regras_busca_personalizada?: string | null
          resposta_formato_tabela?: boolean
          solicitar_cnpj?: boolean | null
          system_prompt?: string
          updated_at?: string
          usar_estoque_sistema?: boolean
          usar_produtos_importados?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "chat_agents_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_interno_conversas: {
        Row: {
          created_at: string
          estabelecimento_id: string
          id: string
          tipo: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_interno_conversas_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_interno_mensagens: {
        Row: {
          conteudo: string
          conversa_id: string
          created_at: string
          id: string
          metadata: Json | null
          remetente_id: string | null
          tipo: string
        }
        Insert: {
          conteudo: string
          conversa_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          remetente_id?: string | null
          tipo?: string
        }
        Update: {
          conteudo?: string
          conversa_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          remetente_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_interno_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "chat_interno_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_interno_mensagens_remetente_id_fkey"
            columns: ["remetente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_interno_participantes: {
        Row: {
          conversa_id: string
          created_at: string
          id: string
          ultima_leitura: string | null
          usuario_id: string
        }
        Insert: {
          conversa_id: string
          created_at?: string
          id?: string
          ultima_leitura?: string | null
          usuario_id: string
        }
        Update: {
          conversa_id?: string
          created_at?: string
          id?: string
          ultima_leitura?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_interno_participantes_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "chat_interno_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_interno_participantes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_retencao_config: {
        Row: {
          created_at: string | null
          data_limpeza_manual: string | null
          estabelecimento_id: string
          id: string
          retencao_dias: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_limpeza_manual?: string | null
          estabelecimento_id: string
          id?: string
          retencao_dias?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_limpeza_manual?: string | null
          estabelecimento_id?: string
          id?: string
          retencao_dias?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_retencao_config_estabelecimento_id_fkey"
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
      chat_tags: {
        Row: {
          categoria: string | null
          cor: string | null
          created_at: string | null
          estabelecimento_id: string
          id: string
          nome: string
        }
        Insert: {
          categoria?: string | null
          cor?: string | null
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
        }
        Update: {
          categoria?: string | null
          cor?: string | null
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_tags_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_tags_aplicadas: {
        Row: {
          aplicada_por: string | null
          chat_id: string
          created_at: string | null
          id: string
          tag_id: string
        }
        Insert: {
          aplicada_por?: string | null
          chat_id: string
          created_at?: string | null
          id?: string
          tag_id: string
        }
        Update: {
          aplicada_por?: string | null
          chat_id?: string
          created_at?: string | null
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_tags_aplicadas_aplicada_por_fkey"
            columns: ["aplicada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_tags_aplicadas_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_tags_aplicadas_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "chat_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_transferencias: {
        Row: {
          atendente_destino_id: string | null
          atendente_origem_id: string | null
          chat_id: string
          created_at: string | null
          fila_destino_id: string | null
          fila_origem_id: string | null
          id: string
          motivo: string | null
          realizada_por: string | null
          tipo: string | null
        }
        Insert: {
          atendente_destino_id?: string | null
          atendente_origem_id?: string | null
          chat_id: string
          created_at?: string | null
          fila_destino_id?: string | null
          fila_origem_id?: string | null
          id?: string
          motivo?: string | null
          realizada_por?: string | null
          tipo?: string | null
        }
        Update: {
          atendente_destino_id?: string | null
          atendente_origem_id?: string | null
          chat_id?: string
          created_at?: string | null
          fila_destino_id?: string | null
          fila_origem_id?: string | null
          id?: string
          motivo?: string | null
          realizada_por?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_transferencias_atendente_destino_id_fkey"
            columns: ["atendente_destino_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_transferencias_atendente_origem_id_fkey"
            columns: ["atendente_origem_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_transferencias_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_transferencias_fila_destino_id_fkey"
            columns: ["fila_destino_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_transferencias_fila_origem_id_fkey"
            columns: ["fila_origem_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_transferencias_realizada_por_fkey"
            columns: ["realizada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cnaes: {
        Row: {
          classe: string | null
          codigo: string
          created_at: string | null
          descricao: string
          divisao: string | null
          grupo: string | null
          id: string
          secao: string | null
          subclasse: string | null
        }
        Insert: {
          classe?: string | null
          codigo: string
          created_at?: string | null
          descricao: string
          divisao?: string | null
          grupo?: string | null
          id?: string
          secao?: string | null
          subclasse?: string | null
        }
        Update: {
          classe?: string | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          divisao?: string | null
          grupo?: string | null
          id?: string
          secao?: string | null
          subclasse?: string | null
        }
        Relationships: []
      }
      cnpj_base_local: {
        Row: {
          bairro: string | null
          capital_social: number | null
          cep: string | null
          cnae_fiscal: string | null
          cnae_fiscal_descricao: string | null
          cnpj: string
          cnpj_basico: string | null
          codigo_municipio: string | null
          complemento: string | null
          created_at: string
          data_inicio_atividade: string | null
          data_situacao_cadastral: string | null
          email: string | null
          estabelecimento_id: string
          id: string
          logradouro: string | null
          municipio: string | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          numero: string | null
          porte_empresa: string | null
          razao_social: string | null
          situacao_cadastral: string | null
          telefone1: string | null
          telefone2: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cnae_fiscal?: string | null
          cnae_fiscal_descricao?: string | null
          cnpj: string
          cnpj_basico?: string | null
          codigo_municipio?: string | null
          complemento?: string | null
          created_at?: string
          data_inicio_atividade?: string | null
          data_situacao_cadastral?: string | null
          email?: string | null
          estabelecimento_id: string
          id?: string
          logradouro?: string | null
          municipio?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          porte_empresa?: string | null
          razao_social?: string | null
          situacao_cadastral?: string | null
          telefone1?: string | null
          telefone2?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cnae_fiscal?: string | null
          cnae_fiscal_descricao?: string | null
          cnpj?: string
          cnpj_basico?: string | null
          codigo_municipio?: string | null
          complemento?: string | null
          created_at?: string
          data_inicio_atividade?: string | null
          data_situacao_cadastral?: string | null
          email?: string | null
          estabelecimento_id?: string
          id?: string
          logradouro?: string | null
          municipio?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          porte_empresa?: string | null
          razao_social?: string | null
          situacao_cadastral?: string | null
          telefone1?: string | null
          telefone2?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cnpj_base_local_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      cnpj_importacoes: {
        Row: {
          created_at: string
          erro_mensagem: string | null
          estabelecimento_id: string
          filtros_aplicados: Json | null
          id: string
          nome_arquivo: string
          registros_ignorados: number | null
          registros_importados: number | null
          status: string | null
          tipo_arquivo: string
          total_registros: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          erro_mensagem?: string | null
          estabelecimento_id: string
          filtros_aplicados?: Json | null
          id?: string
          nome_arquivo: string
          registros_ignorados?: number | null
          registros_importados?: number | null
          status?: string | null
          tipo_arquivo: string
          total_registros?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          erro_mensagem?: string | null
          estabelecimento_id?: string
          filtros_aplicados?: Json | null
          id?: string
          nome_arquivo?: string
          registros_ignorados?: number | null
          registros_importados?: number | null
          status?: string | null
          tipo_arquivo?: string
          total_registros?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cnpj_importacoes_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      combustiveis_precos: {
        Row: {
          created_at: string
          estabelecimento_id: string
          id: string
          preco_diesel: number | null
          preco_eletrico: number | null
          preco_etanol: number | null
          preco_gasolina: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          preco_diesel?: number | null
          preco_eletrico?: number | null
          preco_etanol?: number | null
          preco_gasolina?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          preco_diesel?: number | null
          preco_eletrico?: number | null
          preco_etanol?: number | null
          preco_gasolina?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "combustiveis_precos_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
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
      contas_marketplace: {
        Row: {
          access_token: string | null
          ajuste_preco_fixo: number | null
          ajuste_preco_percentual: number | null
          ambiente: string | null
          configuracoes: Json | null
          created_at: string | null
          data_expiracao_token: string | null
          estabelecimento_id: string
          id: string
          marketplace_id: string
          nome_loja: string
          refresh_token: string | null
          seller_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          ajuste_preco_fixo?: number | null
          ajuste_preco_percentual?: number | null
          ambiente?: string | null
          configuracoes?: Json | null
          created_at?: string | null
          data_expiracao_token?: string | null
          estabelecimento_id: string
          id?: string
          marketplace_id: string
          nome_loja: string
          refresh_token?: string | null
          seller_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          ajuste_preco_fixo?: number | null
          ajuste_preco_percentual?: number | null
          ambiente?: string | null
          configuracoes?: Json | null
          created_at?: string | null
          data_expiracao_token?: string | null
          estabelecimento_id?: string
          id?: string
          marketplace_id?: string
          nome_loja?: string
          refresh_token?: string | null
          seller_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_marketplace_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_marketplace_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
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
          atendente_atual_id: string | null
          avaliacao: number | null
          bot_active: boolean
          bot_id: string | null
          canal: string
          chat_status: Database["public"]["Enums"]["chat_status"] | null
          comentario_avaliacao: string | null
          created_at: string | null
          customer_id: string
          estabelecimento_id: string | null
          fila_id: string | null
          id: string
          metadata: Json | null
          motivo_encerramento: string | null
          numero_reaberturas: number | null
          origem_abertura: string | null
          prioridade: Database["public"]["Enums"]["chat_prioridade"] | null
          reaberto_automaticamente: boolean | null
          sla_config_id: string | null
          sla_primeira_resposta_at: string | null
          sla_tempo_primeira_resposta: number | null
          sla_tempo_total_resolucao: number | null
          sla_ultima_resposta_cliente_at: string | null
          sla_violacao_primeira_resposta: boolean | null
          sla_violacao_resolucao: boolean | null
          sla_violacao_resposta_subsequente: boolean | null
          status: string | null
          tempo_atendimento_inicio: string | null
          tempo_encerramento: string | null
          tempo_espera_inicio: string | null
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          atendente_atual_id?: string | null
          avaliacao?: number | null
          bot_active?: boolean
          bot_id?: string | null
          canal: string
          chat_status?: Database["public"]["Enums"]["chat_status"] | null
          comentario_avaliacao?: string | null
          created_at?: string | null
          customer_id: string
          estabelecimento_id?: string | null
          fila_id?: string | null
          id?: string
          metadata?: Json | null
          motivo_encerramento?: string | null
          numero_reaberturas?: number | null
          origem_abertura?: string | null
          prioridade?: Database["public"]["Enums"]["chat_prioridade"] | null
          reaberto_automaticamente?: boolean | null
          sla_config_id?: string | null
          sla_primeira_resposta_at?: string | null
          sla_tempo_primeira_resposta?: number | null
          sla_tempo_total_resolucao?: number | null
          sla_ultima_resposta_cliente_at?: string | null
          sla_violacao_primeira_resposta?: boolean | null
          sla_violacao_resolucao?: boolean | null
          sla_violacao_resposta_subsequente?: boolean | null
          status?: string | null
          tempo_atendimento_inicio?: string | null
          tempo_encerramento?: string | null
          tempo_espera_inicio?: string | null
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          atendente_atual_id?: string | null
          avaliacao?: number | null
          bot_active?: boolean
          bot_id?: string | null
          canal?: string
          chat_status?: Database["public"]["Enums"]["chat_status"] | null
          comentario_avaliacao?: string | null
          created_at?: string | null
          customer_id?: string
          estabelecimento_id?: string | null
          fila_id?: string | null
          id?: string
          metadata?: Json | null
          motivo_encerramento?: string | null
          numero_reaberturas?: number | null
          origem_abertura?: string | null
          prioridade?: Database["public"]["Enums"]["chat_prioridade"] | null
          reaberto_automaticamente?: boolean | null
          sla_config_id?: string | null
          sla_primeira_resposta_at?: string | null
          sla_tempo_primeira_resposta?: number | null
          sla_tempo_total_resolucao?: number | null
          sla_ultima_resposta_cliente_at?: string | null
          sla_violacao_primeira_resposta?: boolean | null
          sla_violacao_resolucao?: boolean | null
          sla_violacao_resposta_subsequente?: boolean | null
          status?: string | null
          tempo_atendimento_inicio?: string | null
          tempo_encerramento?: string | null
          tempo_espera_inicio?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_atendente_atual_id_fkey"
            columns: ["atendente_atual_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "conversations_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_sla_config_id_fkey"
            columns: ["sla_config_id"]
            isOneToOne: false
            referencedRelation: "sla_config"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_jobs: {
        Row: {
          config: Json | null
          created_at: string | null
          enabled: boolean | null
          estabelecimento_id: string
          id: string
          job_name: string
          job_type: string
          last_run: string | null
          next_run: string | null
          schedule_cron: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          estabelecimento_id: string
          id?: string
          job_name: string
          job_type: string
          last_run?: string | null
          next_run?: string | null
          schedule_cron: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          estabelecimento_id?: string
          id?: string
          job_name?: string
          job_type?: string
          last_run?: string | null
          next_run?: string | null
          schedule_cron?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cron_jobs_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      cupons_desconto: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          estabelecimento_id: string
          id: string
          tipo_desconto: string
          updated_at: string
          usos_atuais: number
          usos_maximos: number | null
          valor_desconto: number
          valor_minimo_pedido: number | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          tipo_desconto?: string
          updated_at?: string
          usos_atuais?: number
          usos_maximos?: number | null
          valor_desconto?: number
          valor_minimo_pedido?: number | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          tipo_desconto?: string
          updated_at?: string
          usos_atuais?: number
          usos_maximos?: number | null
          valor_desconto?: number
          valor_minimo_pedido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cupons_desconto_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_canal_preferences: {
        Row: {
          ativo: boolean | null
          canal: string
          created_at: string | null
          customer_id: string
          estabelecimento_id: string
          id: string
          preferencia_ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          canal: string
          created_at?: string | null
          customer_id: string
          estabelecimento_id: string
          id?: string
          preferencia_ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          canal?: string
          created_at?: string | null
          customer_id?: string
          estabelecimento_id?: string
          id?: string
          preferencia_ordem?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_canal_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_canal_preferences_estabelecimento_id_fkey"
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
          tel: string | null
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
          tel?: string | null
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
          tel?: string | null
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
      dispositivos_rastreamento: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          created_at: string
          device_uuid: string
          estabelecimento_id: string | null
          id: string
          modelo: string | null
          nome_dispositivo: string | null
          plataforma: string | null
          primeiro_acesso: string
          status: string
          ultimo_acesso: string | null
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          device_uuid: string
          estabelecimento_id?: string | null
          id?: string
          modelo?: string | null
          nome_dispositivo?: string | null
          plataforma?: string | null
          primeiro_acesso?: string
          status?: string
          ultimo_acesso?: string | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          device_uuid?: string
          estabelecimento_id?: string | null
          id?: string
          modelo?: string | null
          nome_dispositivo?: string | null
          plataforma?: string | null
          primeiro_acesso?: string
          status?: string
          ultimo_acesso?: string | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispositivos_rastreamento_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositivos_rastreamento_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositivos_rastreamento_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_anuncios: {
        Row: {
          ativo: boolean | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          estabelecimento_id: string
          html_conteudo: string | null
          id: string
          imagem_url: string | null
          link_url: string | null
          ordem: number | null
          posicao: string | null
          tipo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          estabelecimento_id: string
          html_conteudo?: string | null
          id?: string
          imagem_url?: string | null
          link_url?: string | null
          ordem?: number | null
          posicao?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          html_conteudo?: string | null
          id?: string
          imagem_url?: string | null
          link_url?: string | null
          ordem?: number | null
          posicao?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_anuncios_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_config: {
        Row: {
          b2b_badge: string | null
          b2b_btn_primario: string | null
          b2b_btn_secundario: string | null
          b2b_como_funciona: Json | null
          b2b_cta_botao: string | null
          b2b_cta_subtitulo: string | null
          b2b_cta_titulo: string | null
          b2b_depoimentos: Json | null
          b2b_descricao: string | null
          b2b_form_subtitulo: string | null
          b2b_form_titulo: string | null
          b2b_hero_subtitulo: string | null
          b2b_secao_vantagens_subtitulo: string | null
          b2b_secao_vantagens_titulo: string | null
          b2b_secoes_visiveis: Json | null
          b2b_titulo: string | null
          b2b_vantagens: Json | null
          b2b_volume_table: Json | null
          background_image_url: string | null
          background_type: string | null
          background_video_url: string | null
          beneficios: Json | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string
          depoimentos: Json | null
          estabelecimento_id: string
          feat_avaliacoes: boolean | null
          feat_b2b_card: boolean | null
          feat_b2b_volume: boolean
          feat_breadcrumb: boolean | null
          feat_compartilhar: boolean | null
          feat_estoque_visivel: boolean | null
          feat_favoritos: boolean | null
          feat_newsletter: boolean | null
          feat_produtos_relacionados: boolean | null
          feat_rating_estrelas: boolean | null
          feat_webchat: boolean | null
          feat_whatsapp: boolean | null
          feat_zoom_imagem: boolean | null
          footer_copyright: string | null
          footer_descricao: string | null
          footer_email: string | null
          footer_horario: string | null
          footer_links_extras: Json | null
          footer_pagamentos: string[] | null
          footer_telefone: string | null
          hero_badge: string | null
          hero_btn_primario: string | null
          hero_btn_secundario: string | null
          hero_stat_satisfacao: string | null
          hero_subtitulo: string | null
          hero_titulo: string | null
          id: string
          logo_url: string | null
          modo_catalogo: boolean
          mostrar_precos_visitante_b2b: boolean
          mostrar_precos_visitante_b2c: boolean
          newsletter_subtitulo: string | null
          newsletter_titulo: string | null
          nome_loja: string | null
          secoes_visiveis: Json | null
          slogan: string | null
          topbar_ativo: boolean | null
          topbar_items: Json | null
          topbar_link_b2b: boolean | null
          topbar_telefone: string | null
          updated_at: string
        }
        Insert: {
          b2b_badge?: string | null
          b2b_btn_primario?: string | null
          b2b_btn_secundario?: string | null
          b2b_como_funciona?: Json | null
          b2b_cta_botao?: string | null
          b2b_cta_subtitulo?: string | null
          b2b_cta_titulo?: string | null
          b2b_depoimentos?: Json | null
          b2b_descricao?: string | null
          b2b_form_subtitulo?: string | null
          b2b_form_titulo?: string | null
          b2b_hero_subtitulo?: string | null
          b2b_secao_vantagens_subtitulo?: string | null
          b2b_secao_vantagens_titulo?: string | null
          b2b_secoes_visiveis?: Json | null
          b2b_titulo?: string | null
          b2b_vantagens?: Json | null
          b2b_volume_table?: Json | null
          background_image_url?: string | null
          background_type?: string | null
          background_video_url?: string | null
          beneficios?: Json | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          depoimentos?: Json | null
          estabelecimento_id: string
          feat_avaliacoes?: boolean | null
          feat_b2b_card?: boolean | null
          feat_b2b_volume?: boolean
          feat_breadcrumb?: boolean | null
          feat_compartilhar?: boolean | null
          feat_estoque_visivel?: boolean | null
          feat_favoritos?: boolean | null
          feat_newsletter?: boolean | null
          feat_produtos_relacionados?: boolean | null
          feat_rating_estrelas?: boolean | null
          feat_webchat?: boolean | null
          feat_whatsapp?: boolean | null
          feat_zoom_imagem?: boolean | null
          footer_copyright?: string | null
          footer_descricao?: string | null
          footer_email?: string | null
          footer_horario?: string | null
          footer_links_extras?: Json | null
          footer_pagamentos?: string[] | null
          footer_telefone?: string | null
          hero_badge?: string | null
          hero_btn_primario?: string | null
          hero_btn_secundario?: string | null
          hero_stat_satisfacao?: string | null
          hero_subtitulo?: string | null
          hero_titulo?: string | null
          id?: string
          logo_url?: string | null
          modo_catalogo?: boolean
          mostrar_precos_visitante_b2b?: boolean
          mostrar_precos_visitante_b2c?: boolean
          newsletter_subtitulo?: string | null
          newsletter_titulo?: string | null
          nome_loja?: string | null
          secoes_visiveis?: Json | null
          slogan?: string | null
          topbar_ativo?: boolean | null
          topbar_items?: Json | null
          topbar_link_b2b?: boolean | null
          topbar_telefone?: string | null
          updated_at?: string
        }
        Update: {
          b2b_badge?: string | null
          b2b_btn_primario?: string | null
          b2b_btn_secundario?: string | null
          b2b_como_funciona?: Json | null
          b2b_cta_botao?: string | null
          b2b_cta_subtitulo?: string | null
          b2b_cta_titulo?: string | null
          b2b_depoimentos?: Json | null
          b2b_descricao?: string | null
          b2b_form_subtitulo?: string | null
          b2b_form_titulo?: string | null
          b2b_hero_subtitulo?: string | null
          b2b_secao_vantagens_subtitulo?: string | null
          b2b_secao_vantagens_titulo?: string | null
          b2b_secoes_visiveis?: Json | null
          b2b_titulo?: string | null
          b2b_vantagens?: Json | null
          b2b_volume_table?: Json | null
          background_image_url?: string | null
          background_type?: string | null
          background_video_url?: string | null
          beneficios?: Json | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          depoimentos?: Json | null
          estabelecimento_id?: string
          feat_avaliacoes?: boolean | null
          feat_b2b_card?: boolean | null
          feat_b2b_volume?: boolean
          feat_breadcrumb?: boolean | null
          feat_compartilhar?: boolean | null
          feat_estoque_visivel?: boolean | null
          feat_favoritos?: boolean | null
          feat_newsletter?: boolean | null
          feat_produtos_relacionados?: boolean | null
          feat_rating_estrelas?: boolean | null
          feat_webchat?: boolean | null
          feat_whatsapp?: boolean | null
          feat_zoom_imagem?: boolean | null
          footer_copyright?: string | null
          footer_descricao?: string | null
          footer_email?: string | null
          footer_horario?: string | null
          footer_links_extras?: Json | null
          footer_pagamentos?: string[] | null
          footer_telefone?: string | null
          hero_badge?: string | null
          hero_btn_primario?: string | null
          hero_btn_secundario?: string | null
          hero_stat_satisfacao?: string | null
          hero_subtitulo?: string | null
          hero_titulo?: string | null
          id?: string
          logo_url?: string | null
          modo_catalogo?: boolean
          mostrar_precos_visitante_b2b?: boolean
          mostrar_precos_visitante_b2c?: boolean
          newsletter_subtitulo?: string | null
          newsletter_titulo?: string | null
          nome_loja?: string | null
          secoes_visiveis?: Json | null
          slogan?: string | null
          topbar_ativo?: boolean | null
          topbar_items?: Json | null
          topbar_link_b2b?: boolean | null
          topbar_telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_conteudos: {
        Row: {
          ativo: boolean | null
          conteudo: string
          created_at: string
          dados_json: Json | null
          estabelecimento_id: string
          id: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          conteudo?: string
          created_at?: string
          dados_json?: Json | null
          estabelecimento_id: string
          id?: string
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          conteudo?: string
          created_at?: string
          dados_json?: Json | null
          estabelecimento_id?: string
          id?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_conteudos_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_rules: {
        Row: {
          ativo: boolean | null
          categoria: string
          config_json: Json | null
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          expires_at: string | null
          flow_data: Json
          id: string
          nome: string
          prioridade: number | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string
          config_json?: Json | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          expires_at?: string | null
          flow_data?: Json
          id?: string
          nome: string
          prioridade?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          config_json?: Json | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          expires_at?: string | null
          flow_data?: Json
          id?: string
          nome?: string
          prioridade?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_rules_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_volume_pricing: {
        Row: {
          ativo: boolean
          created_at: string
          estabelecimento_id: string
          id: string
          nome_faixa: string
          ordem: number
          percentual_desconto: number
          updated_at: string
          valor_maximo: number | null
          valor_minimo: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          estabelecimento_id: string
          id?: string
          nome_faixa: string
          ordem?: number
          percentual_desconto?: number
          updated_at?: string
          valor_maximo?: number | null
          valor_minimo: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          estabelecimento_id?: string
          id?: string
          nome_faixa?: string
          ordem?: number
          percentual_desconto?: number
          updated_at?: string
          valor_maximo?: number | null
          valor_minimo?: number
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_volume_pricing_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      email_oauth_config: {
        Row: {
          client_id: string | null
          client_secret: string | null
          created_at: string
          enabled: boolean | null
          estabelecimento_id: string
          id: string
          provider: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          enabled?: boolean | null
          estabelecimento_id: string
          id?: string
          provider: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          enabled?: boolean | null
          estabelecimento_id?: string
          id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_oauth_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      email_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          provider: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          email?: string | null
          expires_at: string
          id?: string
          provider: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          provider?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emails: {
        Row: {
          body: string
          created_at: string
          date: string
          folder: string
          from_email: string
          id: string
          link_clicked_at: string | null
          opened_at: string | null
          opened_count: number | null
          read: boolean
          starred: boolean
          subject: string
          to_email: string
          tracking_id: string | null
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
          link_clicked_at?: string | null
          opened_at?: string | null
          opened_count?: number | null
          read?: boolean
          starred?: boolean
          subject: string
          to_email: string
          tracking_id?: string | null
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
          link_clicked_at?: string | null
          opened_at?: string | null
          opened_count?: number | null
          read?: boolean
          starred?: boolean
          subject?: string
          to_email?: string
          tracking_id?: string | null
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
          cnae_descricao: string | null
          cnae_principal: string | null
          cnaes_secundarios: string[] | null
          cnpj: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          emails_vinculados: string[] | null
          endereco: string | null
          estabelecimento_id: string | null
          estado: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string | null
          nome_fantasia: string | null
          segmento_id: string | null
          telefone: string | null
          tipo_cliente: string
          updated_at: string | null
          whatsapps_vinculados: string[] | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnaes_secundarios?: string[] | null
          cnpj?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          emails_vinculados?: string[] | null
          endereco?: string | null
          estabelecimento_id?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string | null
          nome_fantasia?: string | null
          segmento_id?: string | null
          telefone?: string | null
          tipo_cliente?: string
          updated_at?: string | null
          whatsapps_vinculados?: string[] | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnaes_secundarios?: string[] | null
          cnpj?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          emails_vinculados?: string[] | null
          endereco?: string | null
          estabelecimento_id?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string | null
          nome_fantasia?: string | null
          segmento_id?: string | null
          telefone?: string | null
          tipo_cliente?: string
          updated_at?: string | null
          whatsapps_vinculados?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_cnae_municipios: {
        Row: {
          cnae: string
          cnae_descricao: string | null
          codigo_municipio: string | null
          created_at: string
          estabelecimento_id: string | null
          id: string
          municipio: string
          quantidade: number
          uf: string
          updated_at: string
        }
        Insert: {
          cnae: string
          cnae_descricao?: string | null
          codigo_municipio?: string | null
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          municipio: string
          quantidade?: number
          uf: string
          updated_at?: string
        }
        Update: {
          cnae?: string
          cnae_descricao?: string | null
          codigo_municipio?: string | null
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          municipio?: string
          quantidade?: number
          uf?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_cnae_municipios_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas_programadas: {
        Row: {
          created_at: string
          endereco: string
          hora_chegada: string | null
          hora_prevista: string | null
          id: string
          lat: number | null
          lng: number | null
          observacoes: string | null
          ordem: number | null
          rota_id: string | null
          status: string | null
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          created_at?: string
          endereco: string
          hora_chegada?: string | null
          hora_prevista?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          observacoes?: string | null
          ordem?: number | null
          rota_id?: string | null
          status?: string | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          created_at?: string
          endereco?: string
          hora_chegada?: string | null
          hora_prevista?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          observacoes?: string | null
          ordem?: number | null
          rota_id?: string | null
          status?: string | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entregas_programadas_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas_salvas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_programadas_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      envio_massa: {
        Row: {
          agendado_para: string | null
          contatos_enviados: number | null
          contatos_erro: number | null
          conteudo: Json
          created_at: string | null
          estabelecimento_id: string
          filtros_aplicados: Json | null
          finalizado_em: string | null
          id: string
          iniciado_em: string | null
          nome: string
          proxima_data_contato: string | null
          status: string | null
          total_contatos: number | null
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          agendado_para?: string | null
          contatos_enviados?: number | null
          contatos_erro?: number | null
          conteudo: Json
          created_at?: string | null
          estabelecimento_id: string
          filtros_aplicados?: Json | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          nome: string
          proxima_data_contato?: string | null
          status?: string | null
          total_contatos?: number | null
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          agendado_para?: string | null
          contatos_enviados?: number | null
          contatos_erro?: number | null
          conteudo?: Json
          created_at?: string | null
          estabelecimento_id?: string
          filtros_aplicados?: Json | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          nome?: string
          proxima_data_contato?: string | null
          status?: string | null
          total_contatos?: number | null
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "envio_massa_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envio_massa_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      envio_massa_config: {
        Row: {
          created_at: string
          estabelecimento_id: string
          id: string
          updated_at: string
          webhook_id: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          updated_at?: string
          webhook_id: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          updated_at?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "envio_massa_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envio_massa_config_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      envio_massa_contatos: {
        Row: {
          created_at: string | null
          customer_id: string
          enviado_em: string | null
          envio_id: string
          erro_mensagem: string | null
          id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          enviado_em?: string | null
          envio_id: string
          erro_mensagem?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          enviado_em?: string | null
          envio_id?: string
          erro_mensagem?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "envio_massa_contatos_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envio_massa_contatos_envio_id_fkey"
            columns: ["envio_id"]
            isOneToOne: false
            referencedRelation: "envio_massa"
            referencedColumns: ["id"]
          },
        ]
      }
      envio_massa_templates: {
        Row: {
          ativo: boolean
          content_items: Json | null
          conteudo: string
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          id: string
          nome: string
          ordem: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          content_items?: Json | null
          conteudo: string
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          content_items?: Json | null
          conteudo?: string
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "envio_massa_templates_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      estabelecimentos: {
        Row: {
          automacao_vendas_config: Json | null
          cnpj: string
          created_at: string | null
          id: string
          nome: string
          numero_usuarios_permitidos: number
          updated_at: string | null
        }
        Insert: {
          automacao_vendas_config?: Json | null
          cnpj: string
          created_at?: string | null
          id?: string
          nome: string
          numero_usuarios_permitidos?: number
          updated_at?: string | null
        }
        Update: {
          automacao_vendas_config?: Json | null
          cnpj?: string
          created_at?: string | null
          id?: string
          nome?: string
          numero_usuarios_permitidos?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      etiqueta_config: {
        Row: {
          altura_mm: number | null
          ativo: boolean | null
          campos_visiveis: Json
          created_at: string
          estabelecimento_id: string
          formato: string
          id: string
          largura_mm: number | null
          nome: string
          updated_at: string
        }
        Insert: {
          altura_mm?: number | null
          ativo?: boolean | null
          campos_visiveis?: Json
          created_at?: string
          estabelecimento_id: string
          formato?: string
          id?: string
          largura_mm?: number | null
          nome?: string
          updated_at?: string
        }
        Update: {
          altura_mm?: number | null
          ativo?: boolean | null
          campos_visiveis?: Json
          created_at?: string
          estabelecimento_id?: string
          formato?: string
          id?: string
          largura_mm?: number | null
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etiqueta_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ferramentas_atendimento: {
        Row: {
          aba_agenda: boolean | null
          aba_chat: boolean | null
          aba_email: boolean | null
          aba_orcamento: boolean | null
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string
          ferramenta_id: string
          icone: string
          id: string
          nome: string
          ordem: number | null
          radial_agenda: boolean | null
          radial_chat: boolean | null
          radial_email: boolean | null
          radial_orcamento: boolean | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          aba_agenda?: boolean | null
          aba_chat?: boolean | null
          aba_email?: boolean | null
          aba_orcamento?: boolean | null
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id: string
          ferramenta_id: string
          icone: string
          id?: string
          nome: string
          ordem?: number | null
          radial_agenda?: boolean | null
          radial_chat?: boolean | null
          radial_email?: boolean | null
          radial_orcamento?: boolean | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          aba_agenda?: boolean | null
          aba_chat?: boolean | null
          aba_email?: boolean | null
          aba_orcamento?: boolean | null
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          ferramenta_id?: string
          icone?: string
          id?: string
          nome?: string
          ordem?: number | null
          radial_agenda?: boolean | null
          radial_chat?: boolean | null
          radial_email?: boolean | null
          radial_orcamento?: boolean | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferramentas_atendimento_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      fila_skills: {
        Row: {
          created_at: string | null
          fila_id: string
          id: string
          nivel_minimo: number | null
          skill_id: string
        }
        Insert: {
          created_at?: string | null
          fila_id: string
          id?: string
          nivel_minimo?: number | null
          skill_id: string
        }
        Update: {
          created_at?: string | null
          fila_id?: string
          id?: string
          nivel_minimo?: number | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fila_skills_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      filas_atendimento: {
        Row: {
          ativa: boolean | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string
          horario_funcionamento: Json | null
          id: string
          max_chats_por_atendente: number | null
          mensagem_fila: string | null
          nome: string
          prioridade: number | null
          tempo_resposta_esperado: number | null
          tipo_roteamento: Database["public"]["Enums"]["tipo_roteamento"] | null
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id: string
          horario_funcionamento?: Json | null
          id?: string
          max_chats_por_atendente?: number | null
          mensagem_fila?: string | null
          nome: string
          prioridade?: number | null
          tempo_resposta_esperado?: number | null
          tipo_roteamento?:
            | Database["public"]["Enums"]["tipo_roteamento"]
            | null
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          horario_funcionamento?: Json | null
          id?: string
          max_chats_por_atendente?: number | null
          mensagem_fila?: string | null
          nome?: string
          prioridade?: number | null
          tempo_resposta_esperado?: number | null
          tipo_roteamento?:
            | Database["public"]["Enums"]["tipo_roteamento"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filas_atendimento_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
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
      fontes_pesquisa_precos: {
        Row: {
          ativo: boolean | null
          config_json: Json | null
          created_at: string | null
          estabelecimento_id: string
          id: string
          nome_fonte: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          config_json?: Json | null
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          nome_fonte: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          config_json?: Json | null
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          nome_fonte?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fontes_pesquisa_precos_estabelecimento_id_fkey"
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
      frete_terceiros_config: {
        Row: {
          api_key: string | null
          api_url: string | null
          ativo: boolean | null
          configuracao_extra: Json | null
          created_at: string
          estabelecimento_id: string
          id: string
          nome_display: string
          provider: string
          token: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          ativo?: boolean | null
          configuracao_extra?: Json | null
          created_at?: string
          estabelecimento_id: string
          id?: string
          nome_display: string
          provider: string
          token?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          ativo?: boolean | null
          configuracao_extra?: Json | null
          created_at?: string
          estabelecimento_id?: string
          id?: string
          nome_display?: string
          provider?: string
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "frete_terceiros_config_estabelecimento_id_fkey"
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
      historico_precos_concorrentes: {
        Row: {
          created_at: string | null
          data_coleta: string | null
          detalhes_json: Json | null
          estabelecimento_id: string
          fonte_id: string
          id: string
          nome_anuncio: string | null
          preco_encontrado: number | null
          produto_id: string
          url_anuncio: string | null
        }
        Insert: {
          created_at?: string | null
          data_coleta?: string | null
          detalhes_json?: Json | null
          estabelecimento_id: string
          fonte_id: string
          id?: string
          nome_anuncio?: string | null
          preco_encontrado?: number | null
          produto_id: string
          url_anuncio?: string | null
        }
        Update: {
          created_at?: string | null
          data_coleta?: string | null
          detalhes_json?: Json | null
          estabelecimento_id?: string
          fonte_id?: string
          id?: string
          nome_anuncio?: string | null
          preco_encontrado?: number | null
          produto_id?: string
          url_anuncio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_precos_concorrentes_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_precos_concorrentes_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "fontes_pesquisa_precos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_precos_concorrentes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_config: {
        Row: {
          api_key: string | null
          ativo: boolean | null
          configuracoes: Json | null
          contexto: string
          created_at: string | null
          estabelecimento_id: string
          id: string
          model: string | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          ativo?: boolean | null
          configuracoes?: Json | null
          contexto: string
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          model?: string | null
          provider?: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          ativo?: boolean | null
          configuracoes?: Json | null
          contexto?: string
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          model?: string | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_usage_log: {
        Row: {
          completion_tokens: number
          contexto: string
          created_at: string | null
          custo_estimado: number | null
          duracao_ms: number | null
          erro_mensagem: string | null
          estabelecimento_id: string
          id: string
          metadata: Json | null
          model: string
          prompt_tokens: number
          provider: string
          sucesso: boolean | null
          total_tokens: number
        }
        Insert: {
          completion_tokens?: number
          contexto: string
          created_at?: string | null
          custo_estimado?: number | null
          duracao_ms?: number | null
          erro_mensagem?: string | null
          estabelecimento_id: string
          id?: string
          metadata?: Json | null
          model: string
          prompt_tokens?: number
          provider: string
          sucesso?: boolean | null
          total_tokens?: number
        }
        Update: {
          completion_tokens?: number
          contexto?: string
          created_at?: string | null
          custo_estimado?: number | null
          duracao_ms?: number | null
          erro_mensagem?: string | null
          estabelecimento_id?: string
          id?: string
          metadata?: Json | null
          model?: string
          prompt_tokens?: number
          provider?: string
          sucesso?: boolean | null
          total_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "ia_usage_log_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          created_at: string
          credentials_json: Json
          display_name: string
          estabelecimento_id: string
          id: string
          integration_name: string
          integration_type: string
          is_active: boolean | null
          last_validated_at: string | null
          updated_at: string
          validation_status: string | null
        }
        Insert: {
          created_at?: string
          credentials_json?: Json
          display_name: string
          estabelecimento_id: string
          id?: string
          integration_name: string
          integration_type: string
          is_active?: boolean | null
          last_validated_at?: string | null
          updated_at?: string
          validation_status?: string | null
        }
        Update: {
          created_at?: string
          credentials_json?: Json
          display_name?: string
          estabelecimento_id?: string
          id?: string
          integration_name?: string
          integration_type?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          updated_at?: string
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      isocronas: {
        Row: {
          created_at: string | null
          estabelecimento_id: string
          geometria_geojson: Json | null
          id: string
          latitude: number
          longitude: number
          modo_transporte: string
          nome: string
          tempo_minutos: number
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id: string
          geometria_geojson?: Json | null
          id?: string
          latitude: number
          longitude: number
          modo_transporte?: string
          nome: string
          tempo_minutos?: number
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string
          geometria_geojson?: Json | null
          id?: string
          latitude?: number
          longitude?: number
          modo_transporte?: string
          nome?: string
          tempo_minutos?: number
        }
        Relationships: []
      }
      kb_anexos: {
        Row: {
          artigo_id: string
          created_at: string | null
          id: string
          nome: string
          tamanho: number | null
          tipo: string | null
          url: string
        }
        Insert: {
          artigo_id: string
          created_at?: string | null
          id?: string
          nome: string
          tamanho?: number | null
          tipo?: string | null
          url: string
        }
        Update: {
          artigo_id?: string
          created_at?: string | null
          id?: string
          nome?: string
          tamanho?: number | null
          tipo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_anexos_artigo_id_fkey"
            columns: ["artigo_id"]
            isOneToOne: false
            referencedRelation: "kb_artigos"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_artigo_tags: {
        Row: {
          artigo_id: string
          created_at: string | null
          id: string
          tag_id: string
        }
        Insert: {
          artigo_id: string
          created_at?: string | null
          id?: string
          tag_id: string
        }
        Update: {
          artigo_id?: string
          created_at?: string | null
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_artigo_tags_artigo_id_fkey"
            columns: ["artigo_id"]
            isOneToOne: false
            referencedRelation: "kb_artigos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_artigo_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "kb_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_artigos: {
        Row: {
          autor_id: string | null
          categoria_id: string | null
          conteudo: string
          created_at: string | null
          estabelecimento_id: string
          id: string
          nao_util_count: number | null
          ordem: number | null
          palavras_chave: string[] | null
          publicado_em: string | null
          publico: boolean | null
          resumo: string | null
          status: string | null
          titulo: string
          updated_at: string | null
          util_count: number | null
          visualizacoes: number | null
        }
        Insert: {
          autor_id?: string | null
          categoria_id?: string | null
          conteudo: string
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          nao_util_count?: number | null
          ordem?: number | null
          palavras_chave?: string[] | null
          publicado_em?: string | null
          publico?: boolean | null
          resumo?: string | null
          status?: string | null
          titulo: string
          updated_at?: string | null
          util_count?: number | null
          visualizacoes?: number | null
        }
        Update: {
          autor_id?: string | null
          categoria_id?: string | null
          conteudo?: string
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          nao_util_count?: number | null
          ordem?: number | null
          palavras_chave?: string[] | null
          publicado_em?: string | null
          publico?: boolean | null
          resumo?: string | null
          status?: string | null
          titulo?: string
          updated_at?: string | null
          util_count?: number | null
          visualizacoes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_artigos_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_artigos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "kb_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_artigos_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_artigos_relacionados: {
        Row: {
          artigo_id: string
          artigo_relacionado_id: string
          created_at: string | null
          id: string
          ordem: number | null
        }
        Insert: {
          artigo_id: string
          artigo_relacionado_id: string
          created_at?: string | null
          id?: string
          ordem?: number | null
        }
        Update: {
          artigo_id?: string
          artigo_relacionado_id?: string
          created_at?: string | null
          id?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_artigos_relacionados_artigo_id_fkey"
            columns: ["artigo_id"]
            isOneToOne: false
            referencedRelation: "kb_artigos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_artigos_relacionados_artigo_relacionado_id_fkey"
            columns: ["artigo_relacionado_id"]
            isOneToOne: false
            referencedRelation: "kb_artigos"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_categorias: {
        Row: {
          ativa: boolean | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string
          icone: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id: string
          icone?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_categorias_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_feedback: {
        Row: {
          artigo_id: string
          comentario: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          usuario_id: string | null
          util: boolean
        }
        Insert: {
          artigo_id: string
          comentario?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          usuario_id?: string | null
          util: boolean
        }
        Update: {
          artigo_id?: string
          comentario?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          usuario_id?: string | null
          util?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "kb_feedback_artigo_id_fkey"
            columns: ["artigo_id"]
            isOneToOne: false
            referencedRelation: "kb_artigos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_feedback_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_tags: {
        Row: {
          cor: string | null
          created_at: string | null
          estabelecimento_id: string
          id: string
          nome: string
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_tags_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacoes_alerts: {
        Row: {
          channel: string | null
          estabelecimento_id: string
          id: string
          opportunity_id: string
          recipients: string[] | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          channel?: string | null
          estabelecimento_id: string
          id?: string
          opportunity_id: string
          recipients?: string[] | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          channel?: string | null
          estabelecimento_id?: string
          id?: string
          opportunity_id?: string
          recipients?: string[] | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacoes_alerts_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacoes_alerts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "licitacoes_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacoes_config: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          emails_notificacao: string[] | null
          estabelecimento_id: string
          id: string
          intervalo_minutos: number | null
          score_minimo_alerta: number | null
          uf_prioridade: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          emails_notificacao?: string[] | null
          estabelecimento_id: string
          id?: string
          intervalo_minutos?: number | null
          score_minimo_alerta?: number | null
          uf_prioridade?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          emails_notificacao?: string[] | null
          estabelecimento_id?: string
          id?: string
          intervalo_minutos?: number | null
          score_minimo_alerta?: number | null
          uf_prioridade?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacoes_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacoes_fontes: {
        Row: {
          api_key: string | null
          ativo: boolean | null
          config: Json | null
          created_at: string | null
          estabelecimento_id: string
          fonte: string
          id: string
          nome_display: string
          timeout_seconds: number | null
          total_importados: number | null
          ultima_sincronizacao: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          ativo?: boolean | null
          config?: Json | null
          created_at?: string | null
          estabelecimento_id: string
          fonte: string
          id?: string
          nome_display: string
          timeout_seconds?: number | null
          total_importados?: number | null
          ultima_sincronizacao?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          ativo?: boolean | null
          config?: Json | null
          created_at?: string | null
          estabelecimento_id?: string
          fonte?: string
          id?: string
          nome_display?: string
          timeout_seconds?: number | null
          total_importados?: number | null
          ultima_sincronizacao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacoes_fontes_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacoes_keywords: {
        Row: {
          ativo: boolean | null
          categoria: string
          created_at: string | null
          estabelecimento_id: string
          id: string
          keyword: string
          peso: number | null
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          keyword: string
          peso?: number | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          keyword?: string
          peso?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacoes_keywords_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacoes_opportunities: {
        Row: {
          ano: number | null
          created_at: string | null
          data_abertura: string | null
          data_fim: string | null
          data_publicacao: string | null
          descartado: boolean | null
          estabelecimento_id: string
          id: string
          itens_licitacao: Json | null
          keywords_matched: string[] | null
          modalidade: string | null
          municipio: string | null
          numero: string | null
          objeto: string | null
          orgao_cnpj: string | null
          orgao_nome: string | null
          score: number | null
          source: string
          source_details: Json | null
          source_id: string
          status: string | null
          summary_ai: string | null
          uf: string | null
          updated_at: string | null
          url_detalhe: string | null
          valor_estimado: number | null
          vendedor_atribuido_id: string | null
        }
        Insert: {
          ano?: number | null
          created_at?: string | null
          data_abertura?: string | null
          data_fim?: string | null
          data_publicacao?: string | null
          descartado?: boolean | null
          estabelecimento_id: string
          id?: string
          itens_licitacao?: Json | null
          keywords_matched?: string[] | null
          modalidade?: string | null
          municipio?: string | null
          numero?: string | null
          objeto?: string | null
          orgao_cnpj?: string | null
          orgao_nome?: string | null
          score?: number | null
          source?: string
          source_details?: Json | null
          source_id: string
          status?: string | null
          summary_ai?: string | null
          uf?: string | null
          updated_at?: string | null
          url_detalhe?: string | null
          valor_estimado?: number | null
          vendedor_atribuido_id?: string | null
        }
        Update: {
          ano?: number | null
          created_at?: string | null
          data_abertura?: string | null
          data_fim?: string | null
          data_publicacao?: string | null
          descartado?: boolean | null
          estabelecimento_id?: string
          id?: string
          itens_licitacao?: Json | null
          keywords_matched?: string[] | null
          modalidade?: string | null
          municipio?: string | null
          numero?: string | null
          objeto?: string | null
          orgao_cnpj?: string | null
          orgao_nome?: string | null
          score?: number | null
          source?: string
          source_details?: Json | null
          source_id?: string
          status?: string | null
          summary_ai?: string | null
          uf?: string | null
          updated_at?: string | null
          url_detalhe?: string | null
          valor_estimado?: number | null
          vendedor_atribuido_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacoes_opportunities_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacoes_opportunities_vendedor_atribuido_id_fkey"
            columns: ["vendedor_atribuido_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacoes_runs: {
        Row: {
          error: string | null
          estabelecimento_id: string
          finished_at: string | null
          id: string
          items_found: number | null
          items_inserted: number | null
          source: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          error?: string | null
          estabelecimento_id: string
          finished_at?: string | null
          id?: string
          items_found?: number | null
          items_inserted?: number | null
          source?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          error?: string | null
          estabelecimento_id?: string
          finished_at?: string | null
          id?: string
          items_found?: number | null
          items_inserted?: number | null
          source?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacoes_runs_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacoes_score_config: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string
          id: string
          peso: number | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          peso?: number | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          peso?: number | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacoes_score_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      linhas_arquivo_precos: {
        Row: {
          arquivo_id: string
          created_at: string | null
          ean: string | null
          id: string
          nome_produto: string | null
          preco: number | null
          raw_json: Json | null
          sku: string | null
        }
        Insert: {
          arquivo_id: string
          created_at?: string | null
          ean?: string | null
          id?: string
          nome_produto?: string | null
          preco?: number | null
          raw_json?: Json | null
          sku?: string | null
        }
        Update: {
          arquivo_id?: string
          created_at?: string | null
          ean?: string | null
          id?: string
          nome_produto?: string | null
          preco?: number | null
          raw_json?: Json | null
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "linhas_arquivo_precos_arquivo_id_fkey"
            columns: ["arquivo_id"]
            isOneToOne: false
            referencedRelation: "arquivos_precos_importados"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_automacoes: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          flow_data: Json
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          flow_data: Json
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          flow_data?: Json
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistica_automacoes_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_config: {
        Row: {
          created_at: string
          estabelecimento_id: string
          heigit_api_key: string | null
          id: string
          token_rastreamento: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          heigit_api_key?: string | null
          id?: string
          token_rastreamento?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          heigit_api_key?: string | null
          id?: string
          token_rastreamento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistica_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_paradas_marcadas: {
        Row: {
          ativa: boolean
          automacao_id: string | null
          categoria_tempo: string
          cor_icone_parada: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          estabelecimento_id: string
          icone_parada: string | null
          id: string
          lat: number
          legenda_parada: string | null
          lng: number
          tempo_parado_minutos: number
          veiculo_id: string
        }
        Insert: {
          ativa?: boolean
          automacao_id?: string | null
          categoria_tempo: string
          cor_icone_parada?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          estabelecimento_id: string
          icone_parada?: string | null
          id?: string
          lat: number
          legenda_parada?: string | null
          lng: number
          tempo_parado_minutos: number
          veiculo_id: string
        }
        Update: {
          ativa?: boolean
          automacao_id?: string | null
          categoria_tempo?: string
          cor_icone_parada?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          estabelecimento_id?: string
          icone_parada?: string | null
          id?: string
          lat?: number
          legenda_parada?: string | null
          lng?: number
          tempo_parado_minutos?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistica_paradas_marcadas_automacao_id_fkey"
            columns: ["automacao_id"]
            isOneToOne: false
            referencedRelation: "logistica_automacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_paradas_marcadas_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_paradas_marcadas_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_monitor_preco: {
        Row: {
          created_at: string | null
          detalhes: Json | null
          estabelecimento_id: string
          fonte_id: string | null
          id: string
          mensagem: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          detalhes?: Json | null
          estabelecimento_id: string
          fonte_id?: string | null
          id?: string
          mensagem: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          detalhes?: Json | null
          estabelecimento_id?: string
          fonte_id?: string | null
          id?: string
          mensagem?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_monitor_preco_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_monitor_preco_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "fontes_pesquisa_precos"
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
      marketing_content: {
        Row: {
          channels: string[] | null
          content_type: string
          content_url: string | null
          created_at: string
          created_by: string | null
          estabelecimento_id: string | null
          id: string
          input_data: Json | null
          resource_id: string | null
          resource_name: string
          status: string | null
          text_content: string | null
        }
        Insert: {
          channels?: string[] | null
          content_type: string
          content_url?: string | null
          created_at?: string
          created_by?: string | null
          estabelecimento_id?: string | null
          id?: string
          input_data?: Json | null
          resource_id?: string | null
          resource_name: string
          status?: string | null
          text_content?: string | null
        }
        Update: {
          channels?: string[] | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          created_by?: string | null
          estabelecimento_id?: string | null
          id?: string
          input_data?: Json | null
          resource_id?: string | null
          resource_name?: string
          status?: string | null
          text_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_content_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_resource_presets: {
        Row: {
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          field_values: Json
          id: string
          nome: string
          resource_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          field_values?: Json
          id?: string
          nome: string
          resource_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          field_values?: Json
          id?: string
          nome?: string
          resource_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_resources: {
        Row: {
          auto_publish_enabled: boolean | null
          created_at: string
          description: string | null
          estabelecimento_id: string
          fields: Json
          id: string
          n8n_publish_webhook_url: string | null
          n8n_webhook_url: string | null
          name: string
          publish_channels: string[] | null
          return_type: string
          save_location: string | null
          steps: Json | null
          updated_at: string
          webhook_has_response: boolean | null
        }
        Insert: {
          auto_publish_enabled?: boolean | null
          created_at?: string
          description?: string | null
          estabelecimento_id: string
          fields?: Json
          id?: string
          n8n_publish_webhook_url?: string | null
          n8n_webhook_url?: string | null
          name: string
          publish_channels?: string[] | null
          return_type: string
          save_location?: string | null
          steps?: Json | null
          updated_at?: string
          webhook_has_response?: boolean | null
        }
        Update: {
          auto_publish_enabled?: boolean | null
          created_at?: string
          description?: string | null
          estabelecimento_id?: string
          fields?: Json
          id?: string
          n8n_publish_webhook_url?: string | null
          n8n_webhook_url?: string | null
          name?: string
          publish_channels?: string[] | null
          return_type?: string
          save_location?: string | null
          steps?: Json | null
          updated_at?: string
          webhook_has_response?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_resources_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_logs: {
        Row: {
          conta_marketplace_id: string | null
          created_at: string | null
          detalhes: Json | null
          estabelecimento_id: string
          id: string
          marketplace_id: string | null
          mensagem: string
          sucesso: boolean | null
          tipo: string
        }
        Insert: {
          conta_marketplace_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          estabelecimento_id: string
          id?: string
          marketplace_id?: string | null
          mensagem: string
          sucesso?: boolean | null
          tipo: string
        }
        Update: {
          conta_marketplace_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          estabelecimento_id?: string
          id?: string
          marketplace_id?: string | null
          mensagem?: string
          sucesso?: boolean | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_logs_conta_marketplace_id_fkey"
            columns: ["conta_marketplace_id"]
            isOneToOne: false
            referencedRelation: "contas_marketplace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_logs_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_logs_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_produtos: {
        Row: {
          conta_marketplace_id: string
          created_at: string | null
          dados_extras: Json | null
          id: string
          marketplace_id: string
          mensagem_erro: string | null
          produto_id: string
          sku_marketplace: string | null
          status: string | null
          titulo_marketplace: string | null
          ultimo_sync: string | null
          updated_at: string | null
          url_anuncio: string | null
        }
        Insert: {
          conta_marketplace_id: string
          created_at?: string | null
          dados_extras?: Json | null
          id?: string
          marketplace_id: string
          mensagem_erro?: string | null
          produto_id: string
          sku_marketplace?: string | null
          status?: string | null
          titulo_marketplace?: string | null
          ultimo_sync?: string | null
          updated_at?: string | null
          url_anuncio?: string | null
        }
        Update: {
          conta_marketplace_id?: string
          created_at?: string | null
          dados_extras?: Json | null
          id?: string
          marketplace_id?: string
          mensagem_erro?: string | null
          produto_id?: string
          sku_marketplace?: string | null
          status?: string | null
          titulo_marketplace?: string | null
          ultimo_sync?: string | null
          updated_at?: string | null
          url_anuncio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_produtos_conta_marketplace_id_fkey"
            columns: ["conta_marketplace_id"]
            isOneToOne: false
            referencedRelation: "contas_marketplace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_produtos_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplaces: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          nome_display: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          nome_display: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          nome_display?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      media_gallery: {
        Row: {
          created_at: string | null
          descricao: string | null
          disponivel_chat: boolean
          duracao_segundos: number | null
          estabelecimento_id: string
          id: string
          mime_type: string | null
          nome: string
          origem: string | null
          public_url: string
          storage_path: string
          tamanho_bytes: number | null
          thumbnail_url: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          disponivel_chat?: boolean
          duracao_segundos?: number | null
          estabelecimento_id: string
          id?: string
          mime_type?: string | null
          nome: string
          origem?: string | null
          public_url: string
          storage_path: string
          tamanho_bytes?: number | null
          thumbnail_url?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          disponivel_chat?: boolean
          duracao_segundos?: number | null
          estabelecimento_id?: string
          id?: string
          mime_type?: string | null
          nome?: string
          origem?: string | null
          public_url?: string
          storage_path?: string
          tamanho_bytes?: number | null
          thumbnail_url?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_gallery_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
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
      metricas_agregadas: {
        Row: {
          atendente_id: string | null
          avaliacao_media: number | null
          avaliacoes_recebidas: number | null
          canal: string | null
          chats_com_followup: number | null
          chats_dentro_sla: number | null
          chats_em_atendimento: number | null
          chats_encerrados: number | null
          chats_fora_sla: number | null
          chats_novos: number | null
          chats_reabertos: number | null
          chats_resolvidos_primeiro_contato: number | null
          chats_simultaneos_medio: number | null
          chats_simultaneos_pico: number | null
          chats_transferidos: number | null
          created_at: string | null
          data: string
          estabelecimento_id: string
          fila_id: string | null
          id: string
          mensagens_enviadas: number | null
          mensagens_recebidas: number | null
          nps_detratores: number | null
          nps_neutros: number | null
          nps_promotores: number | null
          nps_score: number | null
          periodo_tipo: string
          taxa_cumprimento_sla: number | null
          taxa_fcr: number | null
          taxa_ocupacao: number | null
          tempo_disponivel: number | null
          tempo_medio_atendimento: number | null
          tempo_medio_espera: number | null
          tempo_medio_primeira_resposta: number | null
          tempo_medio_resposta: number | null
          tempo_ocupado: number | null
          tempo_offline: number | null
          tempo_pausa: number | null
          tempo_total_atendimento: number | null
          total_chats: number | null
          updated_at: string | null
          violacoes_primeira_resposta: number | null
          violacoes_resolucao: number | null
        }
        Insert: {
          atendente_id?: string | null
          avaliacao_media?: number | null
          avaliacoes_recebidas?: number | null
          canal?: string | null
          chats_com_followup?: number | null
          chats_dentro_sla?: number | null
          chats_em_atendimento?: number | null
          chats_encerrados?: number | null
          chats_fora_sla?: number | null
          chats_novos?: number | null
          chats_reabertos?: number | null
          chats_resolvidos_primeiro_contato?: number | null
          chats_simultaneos_medio?: number | null
          chats_simultaneos_pico?: number | null
          chats_transferidos?: number | null
          created_at?: string | null
          data: string
          estabelecimento_id: string
          fila_id?: string | null
          id?: string
          mensagens_enviadas?: number | null
          mensagens_recebidas?: number | null
          nps_detratores?: number | null
          nps_neutros?: number | null
          nps_promotores?: number | null
          nps_score?: number | null
          periodo_tipo: string
          taxa_cumprimento_sla?: number | null
          taxa_fcr?: number | null
          taxa_ocupacao?: number | null
          tempo_disponivel?: number | null
          tempo_medio_atendimento?: number | null
          tempo_medio_espera?: number | null
          tempo_medio_primeira_resposta?: number | null
          tempo_medio_resposta?: number | null
          tempo_ocupado?: number | null
          tempo_offline?: number | null
          tempo_pausa?: number | null
          tempo_total_atendimento?: number | null
          total_chats?: number | null
          updated_at?: string | null
          violacoes_primeira_resposta?: number | null
          violacoes_resolucao?: number | null
        }
        Update: {
          atendente_id?: string | null
          avaliacao_media?: number | null
          avaliacoes_recebidas?: number | null
          canal?: string | null
          chats_com_followup?: number | null
          chats_dentro_sla?: number | null
          chats_em_atendimento?: number | null
          chats_encerrados?: number | null
          chats_fora_sla?: number | null
          chats_novos?: number | null
          chats_reabertos?: number | null
          chats_resolvidos_primeiro_contato?: number | null
          chats_simultaneos_medio?: number | null
          chats_simultaneos_pico?: number | null
          chats_transferidos?: number | null
          created_at?: string | null
          data?: string
          estabelecimento_id?: string
          fila_id?: string | null
          id?: string
          mensagens_enviadas?: number | null
          mensagens_recebidas?: number | null
          nps_detratores?: number | null
          nps_neutros?: number | null
          nps_promotores?: number | null
          nps_score?: number | null
          periodo_tipo?: string
          taxa_cumprimento_sla?: number | null
          taxa_fcr?: number | null
          taxa_ocupacao?: number | null
          tempo_disponivel?: number | null
          tempo_medio_atendimento?: number | null
          tempo_medio_espera?: number | null
          tempo_medio_primeira_resposta?: number | null
          tempo_medio_resposta?: number | null
          tempo_ocupado?: number | null
          tempo_offline?: number | null
          tempo_pausa?: number | null
          tempo_total_atendimento?: number | null
          total_chats?: number | null
          updated_at?: string | null
          violacoes_primeira_resposta?: number | null
          violacoes_resolucao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metricas_agregadas_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metricas_agregadas_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metricas_agregadas_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      metricas_atendente: {
        Row: {
          atendente_id: string
          avaliacao_media: number | null
          chats_encerrados: number | null
          chats_transferidos: number | null
          created_at: string | null
          data: string
          id: string
          tempo_medio_atendimento: number | null
          tempo_medio_primeira_resposta: number | null
          tempo_online: number | null
          tempo_pausa: number | null
          total_chats: number | null
        }
        Insert: {
          atendente_id: string
          avaliacao_media?: number | null
          chats_encerrados?: number | null
          chats_transferidos?: number | null
          created_at?: string | null
          data: string
          id?: string
          tempo_medio_atendimento?: number | null
          tempo_medio_primeira_resposta?: number | null
          tempo_online?: number | null
          tempo_pausa?: number | null
          total_chats?: number | null
        }
        Update: {
          atendente_id?: string
          avaliacao_media?: number | null
          chats_encerrados?: number | null
          chats_transferidos?: number | null
          created_at?: string | null
          data?: string
          id?: string
          tempo_medio_atendimento?: number | null
          tempo_medio_primeira_resposta?: number | null
          tempo_online?: number | null
          tempo_pausa?: number | null
          total_chats?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metricas_atendente_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
        ]
      }
      municipios_coordenadas: {
        Row: {
          codigo_ibge: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          populacao: number | null
          uf: string
        }
        Insert: {
          codigo_ibge?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          populacao?: number | null
          uf: string
        }
        Update: {
          codigo_ibge?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          populacao?: number | null
          uf?: string
        }
        Relationships: []
      }
      municipios_renda: {
        Row: {
          codigo_ibge: string | null
          created_at: string | null
          id: string
          idh: number | null
          latitude: number | null
          longitude: number | null
          mesorregiao: string | null
          microrregiao: string | null
          municipio: string
          pib_per_capita: number | null
          populacao: number | null
          regiao: string | null
          renda_media: number | null
          renda_mediana: number | null
          uf: string
          updated_at: string | null
        }
        Insert: {
          codigo_ibge?: string | null
          created_at?: string | null
          id?: string
          idh?: number | null
          latitude?: number | null
          longitude?: number | null
          mesorregiao?: string | null
          microrregiao?: string | null
          municipio: string
          pib_per_capita?: number | null
          populacao?: number | null
          regiao?: string | null
          renda_media?: number | null
          renda_mediana?: number | null
          uf: string
          updated_at?: string | null
        }
        Update: {
          codigo_ibge?: string | null
          created_at?: string | null
          id?: string
          idh?: number | null
          latitude?: number | null
          longitude?: number | null
          mesorregiao?: string | null
          microrregiao?: string | null
          municipio?: string
          pib_per_capita?: number | null
          populacao?: number | null
          regiao?: string | null
          renda_media?: number | null
          renda_mediana?: number | null
          uf?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      n8n_credenciais: {
        Row: {
          ativo: boolean
          created_at: string
          credential_type_id: string
          estabelecimento_id: string
          id: string
          nome: string
          updated_at: string
          valores_criptografados: Json
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          credential_type_id: string
          estabelecimento_id: string
          id?: string
          nome: string
          updated_at?: string
          valores_criptografados?: Json
        }
        Update: {
          ativo?: boolean
          created_at?: string
          credential_type_id?: string
          estabelecimento_id?: string
          id?: string
          nome?: string
          updated_at?: string
          valores_criptografados?: Json
        }
        Relationships: [
          {
            foreignKeyName: "n8n_credenciais_credential_type_id_fkey"
            columns: ["credential_type_id"]
            isOneToOne: false
            referencedRelation: "n8n_credential_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "n8n_credenciais_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_credential_types: {
        Row: {
          campos_json: Json
          created_at: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
        }
        Insert: {
          campos_json?: Json
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
        }
        Update: {
          campos_json?: Json
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      n8n_node_types: {
        Row: {
          categoria: string | null
          cor: string | null
          created_at: string
          credential_type_id: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome_display: string
          parametros_schema: Json
          tipo: string
        }
        Insert: {
          categoria?: string | null
          cor?: string | null
          created_at?: string
          credential_type_id?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome_display: string
          parametros_schema?: Json
          tipo: string
        }
        Update: {
          categoria?: string | null
          cor?: string | null
          created_at?: string
          credential_type_id?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome_display?: string
          parametros_schema?: Json
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_node_types_credential_type_id_fkey"
            columns: ["credential_type_id"]
            isOneToOne: false
            referencedRelation: "n8n_credential_types"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_workflows: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          flow_data: Json
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          flow_data?: Json
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          flow_data?: Json
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_workflows_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_workflows_gerados: {
        Row: {
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          id: string
          nome: string
          prompt_original: string
          updated_at: string
          variaveis_ambiente: Json | null
          workflow_json: Json
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
          prompt_original: string
          updated_at?: string
          variaveis_ambiente?: Json | null
          workflow_json: Json
        }
        Update: {
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
          prompt_original?: string
          updated_at?: string
          variaveis_ambiente?: Json | null
          workflow_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "n8n_workflows_gerados_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ncm_codigos: {
        Row: {
          codigo: string
          created_at: string | null
          descricao: string
          id: string
        }
        Insert: {
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
        }
        Update: {
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string
          estabelecimento_id: string
          id: string
          nome: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email: string
          estabelecimento_id: string
          id?: string
          nome?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string
          estabelecimento_id?: string
          id?: string
          nome?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscribers_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
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
      notificacoes_log: {
        Row: {
          chat_id: string | null
          created_at: string | null
          estabelecimento_id: string
          id: string
          lida: boolean | null
          mensagem: string
          tipo: string
          titulo: string
          usuario_id: string
        }
        Insert: {
          chat_id?: string | null
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          lida?: boolean | null
          mensagem: string
          tipo: string
          titulo: string
          usuario_id: string
        }
        Update: {
          chat_id?: string | null
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          lida?: boolean | null
          mensagem?: string
          tipo?: string
          titulo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_log_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_log_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_log_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_usuario_config: {
        Row: {
          cliente_respondeu_enabled: boolean | null
          created_at: string | null
          desktop_notification_enabled: boolean | null
          estabelecimento_id: string
          id: string
          novo_chat_enabled: boolean | null
          sla_alerta_enabled: boolean | null
          som_enabled: boolean | null
          transferencia_recebida_enabled: boolean | null
          updated_at: string | null
          usuario_id: string
          volume: number | null
        }
        Insert: {
          cliente_respondeu_enabled?: boolean | null
          created_at?: string | null
          desktop_notification_enabled?: boolean | null
          estabelecimento_id: string
          id?: string
          novo_chat_enabled?: boolean | null
          sla_alerta_enabled?: boolean | null
          som_enabled?: boolean | null
          transferencia_recebida_enabled?: boolean | null
          updated_at?: string | null
          usuario_id: string
          volume?: number | null
        }
        Update: {
          cliente_respondeu_enabled?: boolean | null
          created_at?: string | null
          desktop_notification_enabled?: boolean | null
          estabelecimento_id?: string
          id?: string
          novo_chat_enabled?: boolean | null
          sla_alerta_enabled?: boolean | null
          som_enabled?: boolean | null
          transferencia_recebida_enabled?: boolean | null
          updated_at?: string | null
          usuario_id?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_usuario_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_usuario_config_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      omnichannel_execution_logs: {
        Row: {
          block_id: string
          block_label: string
          block_type: string
          conversation_id: string
          created_at: string
          customer_name: string | null
          details: string | null
          flow_id: string
          id: string
          processing_time_ms: number | null
          status: string
        }
        Insert: {
          block_id: string
          block_label: string
          block_type: string
          conversation_id: string
          created_at?: string
          customer_name?: string | null
          details?: string | null
          flow_id: string
          id?: string
          processing_time_ms?: number | null
          status: string
        }
        Update: {
          block_id?: string
          block_label?: string
          block_type?: string
          conversation_id?: string
          created_at?: string
          customer_name?: string | null
          details?: string | null
          flow_id?: string
          id?: string
          processing_time_ms?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "omnichannel_execution_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_execution_logs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "omnichannel_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      omnichannel_flow_versions: {
        Row: {
          change_description: string | null
          created_at: string
          created_by: string | null
          flow_data: Json
          flow_id: string
          id: string
          version_number: number
        }
        Insert: {
          change_description?: string | null
          created_at?: string
          created_by?: string | null
          flow_data: Json
          flow_id: string
          id?: string
          version_number: number
        }
        Update: {
          change_description?: string | null
          created_at?: string
          created_by?: string | null
          flow_data?: Json
          flow_id?: string
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "omnichannel_flow_versions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "omnichannel_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      omnichannel_flows: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          flow_data: Json
          id: string
          is_default: boolean | null
          nome: string
          trigger_bot_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          flow_data?: Json
          id?: string
          is_default?: boolean | null
          nome: string
          trigger_bot_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          flow_data?: Json
          id?: string
          is_default?: boolean | null
          nome?: string
          trigger_bot_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "omnichannel_flows_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_flows_trigger_bot_id_fkey"
            columns: ["trigger_bot_id"]
            isOneToOne: false
            referencedRelation: "bot_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      omnichannel_sessions: {
        Row: {
          ativa: boolean | null
          canais_ativos: string[] | null
          contexto_compartilhado: Json | null
          created_at: string | null
          customer_id: string
          estabelecimento_id: string
          expires_at: string | null
          id: string
          session_token: string
          ultima_interacao: string | null
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean | null
          canais_ativos?: string[] | null
          contexto_compartilhado?: Json | null
          created_at?: string | null
          customer_id: string
          estabelecimento_id: string
          expires_at?: string | null
          id?: string
          session_token: string
          ultima_interacao?: string | null
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean | null
          canais_ativos?: string[] | null
          contexto_compartilhado?: Json | null
          created_at?: string | null
          customer_id?: string
          estabelecimento_id?: string
          expires_at?: string | null
          id?: string
          session_token?: string
          ultima_interacao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "omnichannel_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_sessions_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_conjuntos_itens: {
        Row: {
          conjunto_id: string
          created_at: string | null
          id: string
          ordem: number | null
          preco_padrao: number | null
          produto_id: string
          quantidade_padrao: number | null
        }
        Insert: {
          conjunto_id: string
          created_at?: string | null
          id?: string
          ordem?: number | null
          preco_padrao?: number | null
          produto_id: string
          quantidade_padrao?: number | null
        }
        Update: {
          conjunto_id?: string
          created_at?: string | null
          id?: string
          ordem?: number | null
          preco_padrao?: number | null
          produto_id?: string
          quantidade_padrao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_orcamento_conjuntos_itens_conjunto"
            columns: ["conjunto_id"]
            isOneToOne: false
            referencedRelation: "orcamento_conjuntos_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orcamento_conjuntos_itens_produto"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_conjuntos_usuario: {
        Row: {
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string
          id: string
          nome: string
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_orcamento_conjuntos_usuario_estabelecimento"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orcamento_conjuntos_usuario_usuario"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
      orcamento_report_config: {
        Row: {
          config_json: Json
          created_at: string
          estabelecimento_id: string
          id: string
          updated_at: string
        }
        Insert: {
          config_json?: Json
          created_at?: string
          estabelecimento_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          config_json?: Json
          created_at?: string
          estabelecimento_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_report_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
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
          origem: string | null
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
          origem?: string | null
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
          origem?: string | null
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
      payment_gateways: {
        Row: {
          api_key: string | null
          api_secret: string | null
          config_json: Json | null
          created_at: string
          estabelecimento_id: string
          gateway_id: string
          gateway_name: string
          id: string
          is_active: boolean | null
          sandbox_mode: boolean | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          config_json?: Json | null
          created_at?: string
          estabelecimento_id: string
          gateway_id: string
          gateway_name: string
          id?: string
          is_active?: boolean | null
          sandbox_mode?: boolean | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          config_json?: Json | null
          created_at?: string
          estabelecimento_id?: string
          gateway_id?: string
          gateway_name?: string
          id?: string
          is_active?: boolean | null
          sandbox_mode?: boolean | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateways_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedagio_api_config: {
        Row: {
          api_key: string
          ativo: boolean | null
          configuracoes: Json | null
          created_at: string
          estabelecimento_id: string
          id: string
          provider: string
          updated_at: string
        }
        Insert: {
          api_key: string
          ativo?: boolean | null
          configuracoes?: Json | null
          created_at?: string
          estabelecimento_id: string
          id?: string
          provider: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          ativo?: boolean | null
          configuracoes?: Json | null
          created_at?: string
          estabelecimento_id?: string
          id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedagio_api_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_tracking: {
        Row: {
          created_at: string
          customer_id: string | null
          email_cliente: string | null
          estabelecimento_id: string
          id: string
          nome_cliente: string
          notificar_email: boolean | null
          notificar_whatsapp: boolean | null
          numero_pedido: string
          observacao: string | null
          orcamento_id: string | null
          status_atual: string
          telefone_cliente: string | null
          token_rastreamento: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          email_cliente?: string | null
          estabelecimento_id: string
          id?: string
          nome_cliente: string
          notificar_email?: boolean | null
          notificar_whatsapp?: boolean | null
          numero_pedido: string
          observacao?: string | null
          orcamento_id?: string | null
          status_atual?: string
          telefone_cliente?: string | null
          token_rastreamento?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          email_cliente?: string | null
          estabelecimento_id?: string
          id?: string
          nome_cliente?: string
          notificar_email?: boolean | null
          notificar_whatsapp?: boolean | null
          numero_pedido?: string
          observacao?: string | null
          orcamento_id?: string | null
          status_atual?: string
          telefone_cliente?: string | null
          token_rastreamento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_tracking_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_tracking_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_tracking_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_tracking_historico: {
        Row: {
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          notificado_email: boolean | null
          notificado_whatsapp: boolean | null
          observacao: string | null
          pedido_tracking_id: string
          status: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          notificado_email?: boolean | null
          notificado_whatsapp?: boolean | null
          observacao?: string | null
          pedido_tracking_id: string
          status: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          notificado_email?: boolean | null
          notificado_whatsapp?: boolean | null
          observacao?: string | null
          pedido_tracking_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_tracking_historico_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_tracking_historico_pedido_tracking_id_fkey"
            columns: ["pedido_tracking_id"]
            isOneToOne: false
            referencedRelation: "pedido_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_tracking_status_config: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          icone: string | null
          id: string
          label: string
          mensagem_email: string | null
          mensagem_whatsapp: string | null
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          icone?: string | null
          id?: string
          label: string
          mensagem_email?: string | null
          mensagem_whatsapp?: string | null
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          icone?: string | null
          id?: string
          label?: string
          mensagem_email?: string | null
          mensagem_whatsapp?: string | null
          nome?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_tracking_status_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_ecommerce: {
        Row: {
          cnpj_cliente: string | null
          condicao_pagamento_nome: string | null
          cpf_cliente: string | null
          created_at: string
          desconto: number
          email_cliente: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_estado: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          estabelecimento_id: string
          frete: number
          id: string
          nome_cliente: string
          numero_pedido: string
          observacoes: string | null
          razao_social: string | null
          status: string
          subtotal: number
          telefone_cliente: string | null
          tipo_cliente: string
          tipo_pagamento_nome: string | null
          token_rastreamento: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          cnpj_cliente?: string | null
          condicao_pagamento_nome?: string | null
          cpf_cliente?: string | null
          created_at?: string
          desconto?: number
          email_cliente?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estabelecimento_id: string
          frete?: number
          id?: string
          nome_cliente: string
          numero_pedido: string
          observacoes?: string | null
          razao_social?: string | null
          status?: string
          subtotal?: number
          telefone_cliente?: string | null
          tipo_cliente?: string
          tipo_pagamento_nome?: string | null
          token_rastreamento?: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          cnpj_cliente?: string | null
          condicao_pagamento_nome?: string | null
          cpf_cliente?: string | null
          created_at?: string
          desconto?: number
          email_cliente?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estabelecimento_id?: string
          frete?: number
          id?: string
          nome_cliente?: string
          numero_pedido?: string
          observacoes?: string | null
          razao_social?: string | null
          status?: string
          subtotal?: number
          telefone_cliente?: string | null
          tipo_cliente?: string
          tipo_pagamento_nome?: string | null
          token_rastreamento?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_ecommerce_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_ecommerce_itens: {
        Row: {
          created_at: string
          foto_url: string | null
          id: string
          nome_produto: string
          pedido_id: string
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          subtotal: number
        }
        Insert: {
          created_at?: string
          foto_url?: string | null
          id?: string
          nome_produto: string
          pedido_id: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          subtotal?: number
        }
        Update: {
          created_at?: string
          foto_url?: string | null
          id?: string
          nome_produto?: string
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_ecommerce_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_ecommerce"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_ecommerce_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_marketplace: {
        Row: {
          conta_marketplace_id: string
          created_at: string | null
          dados_brutos_json: Json | null
          data_pedido: string
          endereco_entrega: Json | null
          estabelecimento_id: string
          id: string
          id_pedido_marketplace: string
          marketplace_id: string
          moeda: string | null
          nome_cliente: string | null
          status: string | null
          updated_at: string | null
          valor_total: number
        }
        Insert: {
          conta_marketplace_id: string
          created_at?: string | null
          dados_brutos_json?: Json | null
          data_pedido: string
          endereco_entrega?: Json | null
          estabelecimento_id: string
          id?: string
          id_pedido_marketplace: string
          marketplace_id: string
          moeda?: string | null
          nome_cliente?: string | null
          status?: string | null
          updated_at?: string | null
          valor_total: number
        }
        Update: {
          conta_marketplace_id?: string
          created_at?: string | null
          dados_brutos_json?: Json | null
          data_pedido?: string
          endereco_entrega?: Json | null
          estabelecimento_id?: string
          id?: string
          id_pedido_marketplace?: string
          marketplace_id?: string
          moeda?: string | null
          nome_cliente?: string | null
          status?: string | null
          updated_at?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_marketplace_conta_marketplace_id_fkey"
            columns: ["conta_marketplace_id"]
            isOneToOne: false
            referencedRelation: "contas_marketplace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_marketplace_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_marketplace_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_marketplace_itens: {
        Row: {
          created_at: string | null
          id: string
          marketplace_produto_id: string | null
          nome: string
          pedido_marketplace_id: string
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          sku: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          marketplace_produto_id?: string | null
          nome: string
          pedido_marketplace_id: string
          preco_unitario: number
          produto_id?: string | null
          quantidade?: number
          sku?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          marketplace_produto_id?: string | null
          nome?: string
          pedido_marketplace_id?: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_marketplace_itens_marketplace_produto_id_fkey"
            columns: ["marketplace_produto_id"]
            isOneToOne: false
            referencedRelation: "marketplace_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_marketplace_itens_pedido_marketplace_id_fkey"
            columns: ["pedido_marketplace_id"]
            isOneToOne: false
            referencedRelation: "pedidos_marketplace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_marketplace_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_recebidos: {
        Row: {
          codigo_rastreio: string | null
          created_at: string
          data_despacho: string | null
          data_embalagem: string | null
          data_entrega: string | null
          data_pedido: string
          data_separacao: string | null
          documento_cliente: string | null
          email_cliente: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_estado: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          estabelecimento_id: string
          forma_pagamento: string | null
          id: string
          itens_json: Json | null
          metadata: Json | null
          nome_cliente: string
          numero_pedido: string
          observacoes: string | null
          origem: string
          origem_detalhes: string | null
          origem_id: string | null
          peso_total: number | null
          rota_id: string | null
          status: string
          status_fulfillment: string
          telefone_cliente: string | null
          transportadora: string | null
          updated_at: string
          valor_desconto: number | null
          valor_frete: number | null
          valor_total: number
          veiculo_id: string | null
          volumes: number | null
        }
        Insert: {
          codigo_rastreio?: string | null
          created_at?: string
          data_despacho?: string | null
          data_embalagem?: string | null
          data_entrega?: string | null
          data_pedido?: string
          data_separacao?: string | null
          documento_cliente?: string | null
          email_cliente?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estabelecimento_id: string
          forma_pagamento?: string | null
          id?: string
          itens_json?: Json | null
          metadata?: Json | null
          nome_cliente: string
          numero_pedido: string
          observacoes?: string | null
          origem: string
          origem_detalhes?: string | null
          origem_id?: string | null
          peso_total?: number | null
          rota_id?: string | null
          status?: string
          status_fulfillment?: string
          telefone_cliente?: string | null
          transportadora?: string | null
          updated_at?: string
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_total?: number
          veiculo_id?: string | null
          volumes?: number | null
        }
        Update: {
          codigo_rastreio?: string | null
          created_at?: string
          data_despacho?: string | null
          data_embalagem?: string | null
          data_entrega?: string | null
          data_pedido?: string
          data_separacao?: string | null
          documento_cliente?: string | null
          email_cliente?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estabelecimento_id?: string
          forma_pagamento?: string | null
          id?: string
          itens_json?: Json | null
          metadata?: Json | null
          nome_cliente?: string
          numero_pedido?: string
          observacoes?: string | null
          origem?: string
          origem_detalhes?: string | null
          origem_id?: string | null
          peso_total?: number | null
          rota_id?: string | null
          status?: string
          status_fulfillment?: string
          telefone_cliente?: string | null
          transportadora?: string | null
          updated_at?: string
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_total?: number
          veiculo_id?: string | null
          volumes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_recebidos_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisas_respostas: {
        Row: {
          atendente_id: string | null
          canal: string
          classificacao: string | null
          comentario: string | null
          conversation_id: string
          created_at: string
          customer_id: string
          enviada_em: string
          fila_id: string | null
          id: string
          nota: number
          pesquisa_id: string
          respondida_em: string | null
          tempo_resposta_segundos: number | null
        }
        Insert: {
          atendente_id?: string | null
          canal: string
          classificacao?: string | null
          comentario?: string | null
          conversation_id: string
          created_at?: string
          customer_id: string
          enviada_em?: string
          fila_id?: string | null
          id?: string
          nota: number
          pesquisa_id: string
          respondida_em?: string | null
          tempo_resposta_segundos?: number | null
        }
        Update: {
          atendente_id?: string | null
          canal?: string
          classificacao?: string | null
          comentario?: string | null
          conversation_id?: string
          created_at?: string
          customer_id?: string
          enviada_em?: string
          fila_id?: string | null
          id?: string
          nota?: number
          pesquisa_id?: string
          respondida_em?: string | null
          tempo_resposta_segundos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pesquisas_respostas_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_respostas_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_respostas_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_respostas_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_respostas_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas_satisfacao"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisas_satisfacao: {
        Row: {
          aplica_atendentes: string[] | null
          aplica_filas: string[] | null
          ativa: boolean
          canais: string[]
          created_at: string
          escala_maxima: number
          escala_minima: number
          estabelecimento_id: string
          id: string
          label_maxima: string | null
          label_minima: string | null
          nome: string
          pergunta_comentario: string | null
          pergunta_principal: string
          permite_comentario: boolean
          tipo: string
          trigger_delay_minutos: number | null
          trigger_tipo: string
          updated_at: string
        }
        Insert: {
          aplica_atendentes?: string[] | null
          aplica_filas?: string[] | null
          ativa?: boolean
          canais?: string[]
          created_at?: string
          escala_maxima?: number
          escala_minima?: number
          estabelecimento_id: string
          id?: string
          label_maxima?: string | null
          label_minima?: string | null
          nome: string
          pergunta_comentario?: string | null
          pergunta_principal: string
          permite_comentario?: boolean
          tipo: string
          trigger_delay_minutos?: number | null
          trigger_tipo: string
          updated_at?: string
        }
        Update: {
          aplica_atendentes?: string[] | null
          aplica_filas?: string[] | null
          ativa?: boolean
          canais?: string[]
          created_at?: string
          escala_maxima?: number
          escala_minima?: number
          estabelecimento_id?: string
          id?: string
          label_maxima?: string | null
          label_minima?: string | null
          nome?: string
          pergunta_comentario?: string | null
          pergunta_principal?: string
          permite_comentario?: boolean
          tipo?: string
          trigger_delay_minutos?: number | null
          trigger_tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesquisas_satisfacao_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_artigos: {
        Row: {
          ajudou: number | null
          categoria: string | null
          conteudo: string
          created_at: string | null
          estabelecimento_id: string
          id: string
          kb_artigo_id: string | null
          nao_ajudou: number | null
          ordem: number | null
          publicado: boolean | null
          slug: string
          tags: string[] | null
          titulo: string
          updated_at: string | null
          visualizacoes: number | null
        }
        Insert: {
          ajudou?: number | null
          categoria?: string | null
          conteudo: string
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          kb_artigo_id?: string | null
          nao_ajudou?: number | null
          ordem?: number | null
          publicado?: boolean | null
          slug: string
          tags?: string[] | null
          titulo: string
          updated_at?: string | null
          visualizacoes?: number | null
        }
        Update: {
          ajudou?: number | null
          categoria?: string | null
          conteudo?: string
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          kb_artigo_id?: string | null
          nao_ajudou?: number | null
          ordem?: number | null
          publicado?: boolean | null
          slug?: string
          tags?: string[] | null
          titulo?: string
          updated_at?: string | null
          visualizacoes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_artigos_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_artigos_kb_artigo_id_fkey"
            columns: ["kb_artigo_id"]
            isOneToOne: false
            referencedRelation: "kb_artigos"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_ticket_respostas: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          is_cliente: boolean | null
          mensagem: string
          ticket_id: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_cliente?: boolean | null
          mensagem: string
          ticket_id: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_cliente?: boolean | null
          mensagem?: string
          ticket_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_ticket_respostas_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_ticket_respostas_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "portal_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_ticket_respostas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_tickets: {
        Row: {
          assunto: string
          atribuido_a: string | null
          categoria: string | null
          conversa_id: string | null
          created_at: string | null
          customer_id: string | null
          descricao: string
          estabelecimento_id: string
          id: string
          prioridade: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assunto: string
          atribuido_a?: string | null
          categoria?: string | null
          conversa_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          descricao: string
          estabelecimento_id: string
          id?: string
          prioridade?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assunto?: string
          atribuido_a?: string | null
          categoria?: string | null
          conversa_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          descricao?: string
          estabelecimento_id?: string
          id?: string
          prioridade?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_tickets_atribuido_a_fkey"
            columns: ["atribuido_a"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_tickets_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_tickets_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_campos_customizados: {
        Row: {
          ativo: boolean | null
          campo_key: string
          created_at: string | null
          estabelecimento_id: string
          grupo_id: string
          id: string
          nome: string
          obrigatorio: boolean | null
          opcoes: Json | null
          ordem: number | null
          pesquisa_faixa: boolean | null
          placeholder: string | null
          tipo: string
          unidade: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          campo_key: string
          created_at?: string | null
          estabelecimento_id: string
          grupo_id: string
          id?: string
          nome: string
          obrigatorio?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          pesquisa_faixa?: boolean | null
          placeholder?: string | null
          tipo: string
          unidade?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          campo_key?: string
          created_at?: string | null
          estabelecimento_id?: string
          grupo_id?: string
          id?: string
          nome?: string
          obrigatorio?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          pesquisa_faixa?: boolean | null
          placeholder?: string | null
          tipo?: string
          unidade?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_campos_customizados_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_campos_customizados_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "produto_grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_categorias: {
        Row: {
          created_at: string | null
          estabelecimento_id: string | null
          grupo: string | null
          icone_url: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id?: string | null
          grupo?: string | null
          icone_url?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string | null
          grupo?: string | null
          icone_url?: string | null
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
          descritivo_catalogo: string | null
          estabelecimento_id: string | null
          id: string
          nome: string
          percentual_comissao: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descritivo_catalogo?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome: string
          percentual_comissao?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descritivo_catalogo?: string | null
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
          altura: number | null
          ativo: boolean | null
          campos_customizados: Json | null
          categoria_google: string | null
          categoria_id: string | null
          codigo: string | null
          comprimento: number | null
          condicao: string | null
          cor: string | null
          created_at: string | null
          cubagem: number | null
          descricao: string | null
          ean_13: string | null
          ean_14_1: string | null
          ean_14_2: string | null
          embalagem_altura: number | null
          embalagem_comprimento: number | null
          embalagem_img_ean13: string | null
          embalagem_img_ean14_1: string | null
          embalagem_img_ean14_2: string | null
          embalagem_largura: number | null
          embalagem_peso: number | null
          empilhamento_maximo: number | null
          estabelecimento_id: string | null
          estoque: number | null
          faixa_etaria: string | null
          foto_url: string | null
          foto_url_2: string | null
          foto_url_3: string | null
          fragil: boolean | null
          garantia: string | null
          genero: string | null
          gramatura: number | null
          grupo_id: string | null
          gtin: string | null
          id: string
          largura: number | null
          marca: string | null
          material: string | null
          mpn: string | null
          ncm: string | null
          ncm_id: string | null
          nome: string
          numero_folhas: number | null
          observacoes_frete: string | null
          origem: string | null
          peso_frete_tipo: string | null
          peso_unitario: number | null
          preco_ativo: boolean | null
          preco_minimo: number | null
          preco_tabela: number | null
          tamanho: string | null
          tipo_preco: string | null
          updated_at: string | null
          valor_seguro: number | null
        }
        Insert: {
          altura?: number | null
          ativo?: boolean | null
          campos_customizados?: Json | null
          categoria_google?: string | null
          categoria_id?: string | null
          codigo?: string | null
          comprimento?: number | null
          condicao?: string | null
          cor?: string | null
          created_at?: string | null
          cubagem?: number | null
          descricao?: string | null
          ean_13?: string | null
          ean_14_1?: string | null
          ean_14_2?: string | null
          embalagem_altura?: number | null
          embalagem_comprimento?: number | null
          embalagem_img_ean13?: string | null
          embalagem_img_ean14_1?: string | null
          embalagem_img_ean14_2?: string | null
          embalagem_largura?: number | null
          embalagem_peso?: number | null
          empilhamento_maximo?: number | null
          estabelecimento_id?: string | null
          estoque?: number | null
          faixa_etaria?: string | null
          foto_url?: string | null
          foto_url_2?: string | null
          foto_url_3?: string | null
          fragil?: boolean | null
          garantia?: string | null
          genero?: string | null
          gramatura?: number | null
          grupo_id?: string | null
          gtin?: string | null
          id?: string
          largura?: number | null
          marca?: string | null
          material?: string | null
          mpn?: string | null
          ncm?: string | null
          ncm_id?: string | null
          nome: string
          numero_folhas?: number | null
          observacoes_frete?: string | null
          origem?: string | null
          peso_frete_tipo?: string | null
          peso_unitario?: number | null
          preco_ativo?: boolean | null
          preco_minimo?: number | null
          preco_tabela?: number | null
          tamanho?: string | null
          tipo_preco?: string | null
          updated_at?: string | null
          valor_seguro?: number | null
        }
        Update: {
          altura?: number | null
          ativo?: boolean | null
          campos_customizados?: Json | null
          categoria_google?: string | null
          categoria_id?: string | null
          codigo?: string | null
          comprimento?: number | null
          condicao?: string | null
          cor?: string | null
          created_at?: string | null
          cubagem?: number | null
          descricao?: string | null
          ean_13?: string | null
          ean_14_1?: string | null
          ean_14_2?: string | null
          embalagem_altura?: number | null
          embalagem_comprimento?: number | null
          embalagem_img_ean13?: string | null
          embalagem_img_ean14_1?: string | null
          embalagem_img_ean14_2?: string | null
          embalagem_largura?: number | null
          embalagem_peso?: number | null
          empilhamento_maximo?: number | null
          estabelecimento_id?: string | null
          estoque?: number | null
          faixa_etaria?: string | null
          foto_url?: string | null
          foto_url_2?: string | null
          foto_url_3?: string | null
          fragil?: boolean | null
          garantia?: string | null
          genero?: string | null
          gramatura?: number | null
          grupo_id?: string | null
          gtin?: string | null
          id?: string
          largura?: number | null
          marca?: string | null
          material?: string | null
          mpn?: string | null
          ncm?: string | null
          ncm_id?: string | null
          nome?: string
          numero_folhas?: number | null
          observacoes_frete?: string | null
          origem?: string | null
          peso_frete_tipo?: string | null
          peso_unitario?: number | null
          preco_ativo?: boolean | null
          preco_minimo?: number | null
          preco_tabela?: number | null
          tamanho?: string | null
          tipo_preco?: string | null
          updated_at?: string | null
          valor_seguro?: number | null
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
          {
            foreignKeyName: "produtos_ncm_id_fkey"
            columns: ["ncm_id"]
            isOneToOne: false
            referencedRelation: "ncm_codigos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_fontes_precos: {
        Row: {
          ativo: boolean | null
          chave_correspondencia: string | null
          created_at: string | null
          fonte_id: string
          id: string
          produto_id: string
          termo_busca: string | null
          termo_busca_alternativo: string | null
          updated_at: string | null
          url_direta: string | null
        }
        Insert: {
          ativo?: boolean | null
          chave_correspondencia?: string | null
          created_at?: string | null
          fonte_id: string
          id?: string
          produto_id: string
          termo_busca?: string | null
          termo_busca_alternativo?: string | null
          updated_at?: string | null
          url_direta?: string | null
        }
        Update: {
          ativo?: boolean | null
          chave_correspondencia?: string | null
          created_at?: string | null
          fonte_id?: string
          id?: string
          produto_id?: string
          termo_busca?: string | null
          termo_busca_alternativo?: string | null
          updated_at?: string | null
          url_direta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_fontes_precos_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "fontes_pesquisa_precos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fontes_precos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_importados: {
        Row: {
          comprimento: string | null
          created_at: string | null
          dados_originais: Json | null
          diametro: string | null
          embalagem: string | null
          estabelecimento_id: string
          gramatura: string | null
          id: string
          largura: string | null
          nome: string
          numero_folhas: number | null
          obs: string | null
          quantidade: number | null
          relatorio_importacao_id: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          comprimento?: string | null
          created_at?: string | null
          dados_originais?: Json | null
          diametro?: string | null
          embalagem?: string | null
          estabelecimento_id: string
          gramatura?: string | null
          id?: string
          largura?: string | null
          nome: string
          numero_folhas?: number | null
          obs?: string | null
          quantidade?: number | null
          relatorio_importacao_id?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          comprimento?: string | null
          created_at?: string | null
          dados_originais?: Json | null
          diametro?: string | null
          embalagem?: string | null
          estabelecimento_id?: string
          gramatura?: string | null
          id?: string
          largura?: string | null
          nome?: string
          numero_folhas?: number | null
          obs?: string | null
          quantidade?: number | null
          relatorio_importacao_id?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_importados_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_importados_relatorio_importacao_id_fkey"
            columns: ["relatorio_importacao_id"]
            isOneToOne: false
            referencedRelation: "relatorios_importacao"
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
      profiles: {
        Row: {
          created_at: string | null
          email: string
          estabelecimento_id: string | null
          grupo_acesso_id: string | null
          id: string
          is_admin: boolean | null
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          estabelecimento_id?: string | null
          grupo_acesso_id?: string | null
          id: string
          is_admin?: boolean | null
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          estabelecimento_id?: string | null
          grupo_acesso_id?: string | null
          id?: string
          is_admin?: boolean | null
          nome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects_b2b: {
        Row: {
          area_busca: Json | null
          busca_id: string | null
          categoria: string | null
          cep: string | null
          cidade: string | null
          created_at: string
          endereco_completo: string | null
          estabelecimento_id: string | null
          estado: string | null
          fonte_dados: string | null
          google_maps_link: string | null
          horario_funcionamento: Json | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          palavra_chave_busca: string | null
          place_id: string
          rating: number | null
          status_lead: string | null
          telefone: string | null
          total_avaliacoes: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          area_busca?: Json | null
          busca_id?: string | null
          categoria?: string | null
          cep?: string | null
          cidade?: string | null
          created_at?: string
          endereco_completo?: string | null
          estabelecimento_id?: string | null
          estado?: string | null
          fonte_dados?: string | null
          google_maps_link?: string | null
          horario_funcionamento?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          palavra_chave_busca?: string | null
          place_id: string
          rating?: number | null
          status_lead?: string | null
          telefone?: string | null
          total_avaliacoes?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          area_busca?: Json | null
          busca_id?: string | null
          categoria?: string | null
          cep?: string | null
          cidade?: string | null
          created_at?: string
          endereco_completo?: string | null
          estabelecimento_id?: string | null
          estado?: string | null
          fonte_dados?: string | null
          google_maps_link?: string | null
          horario_funcionamento?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          palavra_chave_busca?: string | null
          place_id?: string
          rating?: number | null
          status_lead?: string | null
          telefone?: string | null
          total_avaliacoes?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_b2b_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects_b2b_api_log: {
        Row: {
          busca_id: string | null
          created_at: string
          custo_chamada: number | null
          endpoint: string | null
          estabelecimento_id: string | null
          id: string
          parametros: Json | null
          resposta_status: number | null
          resultados_retornados: number | null
          tempo_resposta_ms: number | null
          tipo_chamada: string
        }
        Insert: {
          busca_id?: string | null
          created_at?: string
          custo_chamada?: number | null
          endpoint?: string | null
          estabelecimento_id?: string | null
          id?: string
          parametros?: Json | null
          resposta_status?: number | null
          resultados_retornados?: number | null
          tempo_resposta_ms?: number | null
          tipo_chamada: string
        }
        Update: {
          busca_id?: string | null
          created_at?: string
          custo_chamada?: number | null
          endpoint?: string | null
          estabelecimento_id?: string | null
          id?: string
          parametros?: Json | null
          resposta_status?: number | null
          resultados_retornados?: number | null
          tempo_resposta_ms?: number | null
          tipo_chamada?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_b2b_api_log_busca_id_fkey"
            columns: ["busca_id"]
            isOneToOne: false
            referencedRelation: "prospects_b2b_buscas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_b2b_api_log_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects_b2b_buscas: {
        Row: {
          area_poligono: Json
          bounding_box: Json | null
          chamadas_api: number | null
          created_at: string
          custo_estimado: number | null
          erro_mensagem: string | null
          estabelecimento_id: string | null
          id: string
          palavra_chave: string
          status: string | null
          total_resultados: number | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          area_poligono: Json
          bounding_box?: Json | null
          chamadas_api?: number | null
          created_at?: string
          custo_estimado?: number | null
          erro_mensagem?: string | null
          estabelecimento_id?: string | null
          id?: string
          palavra_chave: string
          status?: string | null
          total_resultados?: number | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          area_poligono?: Json
          bounding_box?: Json | null
          chamadas_api?: number | null
          created_at?: string
          custo_estimado?: number | null
          erro_mensagem?: string | null
          estabelecimento_id?: string | null
          id?: string
          palavra_chave?: string
          status?: string | null
          total_resultados?: number | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_b2b_buscas_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_b2b_buscas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects_b2b_config: {
        Row: {
          api_provider: string | null
          campos_place_details: Json | null
          created_at: string
          custo_por_chamada: number | null
          custo_por_requisicao: number | null
          estabelecimento_id: string | null
          extrair_contatos_website: Json | null
          fonte_dados: string | null
          google_places_api_key: string | null
          id: string
          limite_custo_mensal: number | null
          limite_custo_por_busca: number | null
          limite_resultados_por_busca: number | null
          updated_at: string
        }
        Insert: {
          api_provider?: string | null
          campos_place_details?: Json | null
          created_at?: string
          custo_por_chamada?: number | null
          custo_por_requisicao?: number | null
          estabelecimento_id?: string | null
          extrair_contatos_website?: Json | null
          fonte_dados?: string | null
          google_places_api_key?: string | null
          id?: string
          limite_custo_mensal?: number | null
          limite_custo_por_busca?: number | null
          limite_resultados_por_busca?: number | null
          updated_at?: string
        }
        Update: {
          api_provider?: string | null
          campos_place_details?: Json | null
          created_at?: string
          custo_por_chamada?: number | null
          custo_por_requisicao?: number | null
          estabelecimento_id?: string | null
          extrair_contatos_website?: Json | null
          fonte_dados?: string | null
          google_places_api_key?: string | null
          id?: string
          limite_custo_mensal?: number | null
          limite_custo_por_busca?: number | null
          limite_resultados_por_busca?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_b2b_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      published_pages: {
        Row: {
          config: Json
          created_at: string
          estabelecimento_id: string
          id: string
          nome: string
          publicado: boolean
          sections: Json
          slug: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          estabelecimento_id: string
          id?: string
          nome: string
          publicado?: boolean
          sections?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          estabelecimento_id?: string
          id?: string
          nome?: string
          publicado?: boolean
          sections?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "published_pages_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_avaliacoes: {
        Row: {
          atendente_id: string
          avaliador_id: string
          chat_id: string
          created_at: string | null
          data_avaliacao: string | null
          estabelecimento_id: string
          formulario_id: string
          id: string
          observacoes: string | null
          percentual: number | null
          pontuacao_maxima: number | null
          pontuacao_total: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          atendente_id: string
          avaliador_id: string
          chat_id: string
          created_at?: string | null
          data_avaliacao?: string | null
          estabelecimento_id: string
          formulario_id: string
          id?: string
          observacoes?: string | null
          percentual?: number | null
          pontuacao_maxima?: number | null
          pontuacao_total?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          atendente_id?: string
          avaliador_id?: string
          chat_id?: string
          created_at?: string | null
          data_avaliacao?: string | null
          estabelecimento_id?: string
          formulario_id?: string
          id?: string
          observacoes?: string | null
          percentual?: number | null
          pontuacao_maxima?: number | null
          pontuacao_total?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_avaliacoes_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_avaliacoes_avaliador_id_fkey"
            columns: ["avaliador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_avaliacoes_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_avaliacoes_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_avaliacoes_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "qa_formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_criterios: {
        Row: {
          created_at: string | null
          descricao: string | null
          formulario_id: string
          id: string
          nome: string
          obrigatorio: boolean | null
          opcoes: Json | null
          ordem: number | null
          peso: number | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          formulario_id: string
          id?: string
          nome: string
          obrigatorio?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          peso?: number | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          formulario_id?: string
          id?: string
          nome?: string
          obrigatorio?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          peso?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_criterios_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "qa_formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_formularios: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_formularios_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_metas_atendente: {
        Row: {
          atendente_id: string
          ativo: boolean | null
          avaliacoes_minimas_mes: number | null
          created_at: string | null
          estabelecimento_id: string
          id: string
          meta_percentual: number | null
          periodo_fim: string | null
          periodo_inicio: string
          updated_at: string | null
        }
        Insert: {
          atendente_id: string
          ativo?: boolean | null
          avaliacoes_minimas_mes?: number | null
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          meta_percentual?: number | null
          periodo_fim?: string | null
          periodo_inicio: string
          updated_at?: string | null
        }
        Update: {
          atendente_id?: string
          ativo?: boolean | null
          avaliacoes_minimas_mes?: number | null
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          meta_percentual?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_metas_atendente_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_metas_atendente_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_respostas: {
        Row: {
          avaliacao_id: string
          comentario: string | null
          created_at: string | null
          criterio_id: string
          id: string
          pontuacao: number | null
          valor: Json
        }
        Insert: {
          avaliacao_id: string
          comentario?: string | null
          created_at?: string | null
          criterio_id: string
          id?: string
          pontuacao?: number | null
          valor: Json
        }
        Update: {
          avaliacao_id?: string
          comentario?: string | null
          created_at?: string | null
          criterio_id?: string
          id?: string
          pontuacao?: number | null
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "qa_respostas_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "qa_avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_respostas_criterio_id_fkey"
            columns: ["criterio_id"]
            isOneToOne: false
            referencedRelation: "qa_criterios"
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
          categoria: string | null
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
          categoria?: string | null
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
          categoria?: string | null
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
      quick_reply_categories: {
        Row: {
          created_at: string | null
          estabelecimento_id: string
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_reply_categories_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
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
      relatorios_customizados: {
        Row: {
          agendado: boolean | null
          ativo: boolean | null
          compartilhado_com: Json | null
          created_at: string | null
          descricao: string | null
          destinatarios: Json | null
          dia_execucao: number | null
          dimensoes: Json
          estabelecimento_id: string
          filtros: Json | null
          formato_exportacao: string | null
          frequencia: string | null
          hora_execucao: string | null
          id: string
          incluir_graficos: boolean | null
          incluir_tabelas: boolean | null
          metricas: Json
          nome: string
          proxima_execucao: string | null
          publico: boolean | null
          tipo: string
          ultima_execucao: string | null
          updated_at: string | null
          usuario_criador_id: string | null
        }
        Insert: {
          agendado?: boolean | null
          ativo?: boolean | null
          compartilhado_com?: Json | null
          created_at?: string | null
          descricao?: string | null
          destinatarios?: Json | null
          dia_execucao?: number | null
          dimensoes?: Json
          estabelecimento_id: string
          filtros?: Json | null
          formato_exportacao?: string | null
          frequencia?: string | null
          hora_execucao?: string | null
          id?: string
          incluir_graficos?: boolean | null
          incluir_tabelas?: boolean | null
          metricas?: Json
          nome: string
          proxima_execucao?: string | null
          publico?: boolean | null
          tipo: string
          ultima_execucao?: string | null
          updated_at?: string | null
          usuario_criador_id?: string | null
        }
        Update: {
          agendado?: boolean | null
          ativo?: boolean | null
          compartilhado_com?: Json | null
          created_at?: string | null
          descricao?: string | null
          destinatarios?: Json | null
          dia_execucao?: number | null
          dimensoes?: Json
          estabelecimento_id?: string
          filtros?: Json | null
          formato_exportacao?: string | null
          frequencia?: string | null
          hora_execucao?: string | null
          id?: string
          incluir_graficos?: boolean | null
          incluir_tabelas?: boolean | null
          metricas?: Json
          nome?: string
          proxima_execucao?: string | null
          publico?: boolean | null
          tipo?: string
          ultima_execucao?: string | null
          updated_at?: string | null
          usuario_criador_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_customizados_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_customizados_usuario_criador_id_fkey"
            columns: ["usuario_criador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios_execucoes: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          created_at: string | null
          dados: Json | null
          erro_mensagem: string | null
          executado_em: string | null
          executado_por: string | null
          formato: string | null
          id: string
          parametros: Json | null
          relatorio_id: string
          status: string | null
          tamanho_bytes: number | null
          tempo_execucao_ms: number | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          created_at?: string | null
          dados?: Json | null
          erro_mensagem?: string | null
          executado_em?: string | null
          executado_por?: string | null
          formato?: string | null
          id?: string
          parametros?: Json | null
          relatorio_id: string
          status?: string | null
          tamanho_bytes?: number | null
          tempo_execucao_ms?: number | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          created_at?: string | null
          dados?: Json | null
          erro_mensagem?: string | null
          executado_em?: string | null
          executado_por?: string | null
          formato?: string | null
          id?: string
          parametros?: Json | null
          relatorio_id?: string
          status?: string | null
          tamanho_bytes?: number | null
          tempo_execucao_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_execucoes_executado_por_fkey"
            columns: ["executado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_execucoes_relatorio_id_fkey"
            columns: ["relatorio_id"]
            isOneToOne: false
            referencedRelation: "relatorios_customizados"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios_importacao: {
        Row: {
          api_endpoint: string | null
          ativo: boolean
          configuracao: Json
          created_at: string
          data_criacao: string
          data_validade: string | null
          estabelecimento_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          ativo?: boolean
          configuracao?: Json
          created_at?: string
          data_criacao: string
          data_validade?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          ativo?: boolean
          configuracao?: Json
          created_at?: string
          data_criacao?: string
          data_validade?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_importacao_estabelecimento_id_fkey"
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
      rotas_salvas: {
        Row: {
          coordenadas_json: Json
          created_at: string
          descricao: string | null
          distancia_metros: number | null
          estabelecimento_id: string | null
          id: string
          nome: string
          pontos_parada: Json | null
          tempo_estimado_segundos: number | null
          updated_at: string
        }
        Insert: {
          coordenadas_json: Json
          created_at?: string
          descricao?: string | null
          distancia_metros?: number | null
          estabelecimento_id?: string | null
          id?: string
          nome: string
          pontos_parada?: Json | null
          tempo_estimado_segundos?: number | null
          updated_at?: string
        }
        Update: {
          coordenadas_json?: Json
          created_at?: string
          descricao?: string | null
          distancia_metros?: number | null
          estabelecimento_id?: string | null
          id?: string
          nome?: string
          pontos_parada?: Json | null
          tempo_estimado_segundos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotas_salvas_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_monitor_consent: {
        Row: {
          consent_given: boolean
          consent_given_at: string
          created_at: string
          estabelecimento_id: string
          id: string
          is_sharing: boolean
          last_frame_at: string | null
          sharing_started_at: string | null
          updated_at: string
          usuario_id: string
          viewer_active: boolean | null
          viewer_started_at: string | null
        }
        Insert: {
          consent_given?: boolean
          consent_given_at?: string
          created_at?: string
          estabelecimento_id: string
          id?: string
          is_sharing?: boolean
          last_frame_at?: string | null
          sharing_started_at?: string | null
          updated_at?: string
          usuario_id: string
          viewer_active?: boolean | null
          viewer_started_at?: string | null
        }
        Update: {
          consent_given?: boolean
          consent_given_at?: string
          created_at?: string
          estabelecimento_id?: string
          id?: string
          is_sharing?: boolean
          last_frame_at?: string | null
          sharing_started_at?: string | null
          updated_at?: string
          usuario_id?: string
          viewer_active?: boolean | null
          viewer_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screen_monitor_consent_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_monitor_consent_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_share_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          estabelecimento_id: string
          guest_user_id: string | null
          host_user_id: string
          id: string
          session_code: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          estabelecimento_id: string
          guest_user_id?: string | null
          host_user_id: string
          id?: string
          session_code: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          estabelecimento_id?: string
          guest_user_id?: string | null
          host_user_id?: string
          id?: string
          session_code?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_share_sessions_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_share_sessions_guest_user_id_fkey"
            columns: ["guest_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_share_sessions_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_share_signals: {
        Row: {
          created_at: string
          id: string
          sender_user_id: string
          session_id: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          sender_user_id: string
          session_id: string
          signal_data: Json
          signal_type: string
        }
        Update: {
          created_at?: string
          id?: string
          sender_user_id?: string
          session_id?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_share_signals_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_share_signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "screen_share_sessions"
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
      sentiment_alerts: {
        Row: {
          atendente_id: string
          chat_id: string
          created_at: string | null
          descricao: string
          estabelecimento_id: string
          id: string
          resolvido: boolean | null
          resolvido_em: string | null
          resolvido_por: string | null
          score_sentimento: number | null
          tipo_alerta: string
        }
        Insert: {
          atendente_id: string
          chat_id: string
          created_at?: string | null
          descricao: string
          estabelecimento_id: string
          id?: string
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          score_sentimento?: number | null
          tipo_alerta: string
        }
        Update: {
          atendente_id?: string
          chat_id?: string
          created_at?: string | null
          descricao?: string
          estabelecimento_id?: string
          id?: string
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          score_sentimento?: number | null
          tipo_alerta?: string
        }
        Relationships: [
          {
            foreignKeyName: "sentiment_alerts_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentiment_alerts_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentiment_alerts_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentiment_alerts_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sentiment_analysis: {
        Row: {
          analysis_metadata: Json | null
          chat_id: string
          confidence: number
          created_at: string | null
          emotion: string | null
          estabelecimento_id: string
          id: string
          keywords: Json | null
          message_id: string
          score: number
          sentiment: string
        }
        Insert: {
          analysis_metadata?: Json | null
          chat_id: string
          confidence: number
          created_at?: string | null
          emotion?: string | null
          estabelecimento_id: string
          id?: string
          keywords?: Json | null
          message_id: string
          score: number
          sentiment: string
        }
        Update: {
          analysis_metadata?: Json | null
          chat_id?: string
          confidence?: number
          created_at?: string | null
          emotion?: string | null
          estabelecimento_id?: string
          id?: string
          keywords?: Json | null
          message_id?: string
          score?: number
          sentiment?: string
        }
        Relationships: [
          {
            foreignKeyName: "sentiment_analysis_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentiment_analysis_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentiment_analysis_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      sentiment_config: {
        Row: {
          alerta_sentimento_negativo: boolean | null
          alerta_threshold: number | null
          ativo: boolean | null
          canais_ativos: string[] | null
          created_at: string | null
          escalar_automaticamente: boolean | null
          estabelecimento_id: string
          fila_escalacao_id: string | null
          id: string
          threshold_negativo: number | null
          threshold_positivo: number | null
          updated_at: string | null
        }
        Insert: {
          alerta_sentimento_negativo?: boolean | null
          alerta_threshold?: number | null
          ativo?: boolean | null
          canais_ativos?: string[] | null
          created_at?: string | null
          escalar_automaticamente?: boolean | null
          estabelecimento_id: string
          fila_escalacao_id?: string | null
          id?: string
          threshold_negativo?: number | null
          threshold_positivo?: number | null
          updated_at?: string | null
        }
        Update: {
          alerta_sentimento_negativo?: boolean | null
          alerta_threshold?: number | null
          ativo?: boolean | null
          canais_ativos?: string[] | null
          created_at?: string | null
          escalar_automaticamente?: boolean | null
          estabelecimento_id?: string
          fila_escalacao_id?: string | null
          id?: string
          threshold_negativo?: number | null
          threshold_positivo?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sentiment_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentiment_config_fila_escalacao_id_fkey"
            columns: ["fila_escalacao_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      sentiment_conversation_summary: {
        Row: {
          chat_id: string
          created_at: string | null
          emocoes_predominantes: Json | null
          estabelecimento_id: string
          id: string
          mensagens_negativas: number | null
          mensagens_neutras: number | null
          mensagens_positivas: number | null
          pontos_escalacao: Json | null
          requer_atencao: boolean | null
          score_medio: number
          sentiment_geral: string
          total_mensagens_analisadas: number
          updated_at: string | null
        }
        Insert: {
          chat_id: string
          created_at?: string | null
          emocoes_predominantes?: Json | null
          estabelecimento_id: string
          id?: string
          mensagens_negativas?: number | null
          mensagens_neutras?: number | null
          mensagens_positivas?: number | null
          pontos_escalacao?: Json | null
          requer_atencao?: boolean | null
          score_medio: number
          sentiment_geral: string
          total_mensagens_analisadas: number
          updated_at?: string | null
        }
        Update: {
          chat_id?: string
          created_at?: string | null
          emocoes_predominantes?: Json | null
          estabelecimento_id?: string
          id?: string
          mensagens_negativas?: number | null
          mensagens_neutras?: number | null
          mensagens_positivas?: number | null
          pontos_escalacao?: Json | null
          requer_atencao?: boolean | null
          score_medio?: number
          sentiment_geral?: string
          total_mensagens_analisadas?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sentiment_conversation_summary_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentiment_conversation_summary_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          cor: string | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string
          id: string
          nome: string
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_config: {
        Row: {
          alerta_porcentagem: number | null
          ativo: boolean | null
          aumentar_prioridade_automatica: boolean | null
          considera_horario_comercial: boolean | null
          created_at: string | null
          descricao: string | null
          escalar_automaticamente: boolean | null
          estabelecimento_id: string
          fila_escalacao_id: string | null
          fila_id: string | null
          horario_funcionamento: Json | null
          id: string
          multiplicador_alta: number | null
          multiplicador_baixa: number | null
          multiplicador_normal: number | null
          multiplicador_urgente: number | null
          nome: string
          notificar_supervisor: boolean | null
          supervisor_id: string | null
          tempo_primeira_resposta: number
          tempo_resolucao: number
          tempo_resposta_subsequente: number
          updated_at: string | null
        }
        Insert: {
          alerta_porcentagem?: number | null
          ativo?: boolean | null
          aumentar_prioridade_automatica?: boolean | null
          considera_horario_comercial?: boolean | null
          created_at?: string | null
          descricao?: string | null
          escalar_automaticamente?: boolean | null
          estabelecimento_id: string
          fila_escalacao_id?: string | null
          fila_id?: string | null
          horario_funcionamento?: Json | null
          id?: string
          multiplicador_alta?: number | null
          multiplicador_baixa?: number | null
          multiplicador_normal?: number | null
          multiplicador_urgente?: number | null
          nome: string
          notificar_supervisor?: boolean | null
          supervisor_id?: string | null
          tempo_primeira_resposta?: number
          tempo_resolucao?: number
          tempo_resposta_subsequente?: number
          updated_at?: string | null
        }
        Update: {
          alerta_porcentagem?: number | null
          ativo?: boolean | null
          aumentar_prioridade_automatica?: boolean | null
          considera_horario_comercial?: boolean | null
          created_at?: string | null
          descricao?: string | null
          escalar_automaticamente?: boolean | null
          estabelecimento_id?: string
          fila_escalacao_id?: string | null
          fila_id?: string | null
          horario_funcionamento?: Json | null
          id?: string
          multiplicador_alta?: number | null
          multiplicador_baixa?: number | null
          multiplicador_normal?: number | null
          multiplicador_urgente?: number | null
          nome?: string
          notificar_supervisor?: boolean | null
          supervisor_id?: string | null
          tempo_primeira_resposta?: number
          tempo_resolucao?: number
          tempo_resposta_subsequente?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_config_fila_escalacao_id_fkey"
            columns: ["fila_escalacao_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_config_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_config_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_violations: {
        Row: {
          alerta_enviado: boolean | null
          atendente_id: string | null
          conversation_id: string
          created_at: string | null
          escalado: boolean | null
          escalado_at: string | null
          escalado_para_fila_id: string | null
          fila_id: string | null
          id: string
          notas: string | null
          porcentagem_excedida: number
          prioridade_chat: string | null
          resolvido: boolean | null
          resolvido_at: string | null
          sla_config_id: string
          tempo_esperado: number
          tempo_excedido: number
          tempo_real: number
          tipo_violacao: string
        }
        Insert: {
          alerta_enviado?: boolean | null
          atendente_id?: string | null
          conversation_id: string
          created_at?: string | null
          escalado?: boolean | null
          escalado_at?: string | null
          escalado_para_fila_id?: string | null
          fila_id?: string | null
          id?: string
          notas?: string | null
          porcentagem_excedida: number
          prioridade_chat?: string | null
          resolvido?: boolean | null
          resolvido_at?: string | null
          sla_config_id: string
          tempo_esperado: number
          tempo_excedido: number
          tempo_real: number
          tipo_violacao: string
        }
        Update: {
          alerta_enviado?: boolean | null
          atendente_id?: string | null
          conversation_id?: string
          created_at?: string | null
          escalado?: boolean | null
          escalado_at?: string | null
          escalado_para_fila_id?: string | null
          fila_id?: string | null
          id?: string
          notas?: string | null
          porcentagem_excedida?: number
          prioridade_chat?: string | null
          resolvido?: boolean | null
          resolvido_at?: string | null
          sla_config_id?: string
          tempo_esperado?: number
          tempo_excedido?: number
          tempo_real?: number
          tipo_violacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_violations_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_violations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_violations_escalado_para_fila_id_fkey"
            columns: ["escalado_para_fila_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_violations_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "filas_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_violations_sla_config_id_fkey"
            columns: ["sla_config_id"]
            isOneToOne: false
            referencedRelation: "sla_config"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_agent_configs: {
        Row: {
          agent_card_json: Json | null
          agent_name: string
          agent_type: string
          created_at: string | null
          estabelecimento_id: string
          execution_order: number | null
          id: string
          is_active: boolean | null
          knowledge_base_files: Json | null
          knowledge_base_type: string
          system_prompt: string
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          agent_card_json?: Json | null
          agent_name: string
          agent_type: string
          created_at?: string | null
          estabelecimento_id: string
          execution_order?: number | null
          id?: string
          is_active?: boolean | null
          knowledge_base_files?: Json | null
          knowledge_base_type?: string
          system_prompt: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          agent_card_json?: Json | null
          agent_name?: string
          agent_type?: string
          created_at?: string | null
          estabelecimento_id?: string
          execution_order?: number | null
          id?: string
          is_active?: boolean | null
          knowledge_base_files?: Json | null
          knowledge_base_type?: string
          system_prompt?: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_agent_configs_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_agent_executions: {
        Row: {
          agent_name: string
          agent_type: string
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          project_id: string
          status: string
          updated_at: string | null
          validation_details: Json | null
          validation_score: number | null
        }
        Insert: {
          agent_name: string
          agent_type: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          project_id: string
          status?: string
          updated_at?: string | null
          validation_details?: Json | null
          validation_score?: number | null
        }
        Update: {
          agent_name?: string
          agent_type?: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          project_id?: string
          status?: string
          updated_at?: string | null
          validation_details?: Json | null
          validation_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_agent_executions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "strategy_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_artifact_versions: {
        Row: {
          artifact_id: string
          conteudo: Json
          created_at: string
          id: string
          project_id: string
          status: string
          tipo: string
          titulo: string
          version: number
        }
        Insert: {
          artifact_id: string
          conteudo?: Json
          created_at?: string
          id?: string
          project_id: string
          status?: string
          tipo: string
          titulo: string
          version?: number
        }
        Update: {
          artifact_id?: string
          conteudo?: Json
          created_at?: string
          id?: string
          project_id?: string
          status?: string
          tipo?: string
          titulo?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategy_artifact_versions_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "strategy_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_artifact_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "strategy_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_artifacts: {
        Row: {
          conteudo: Json
          created_at: string | null
          execution_id: string | null
          id: string
          project_id: string
          status: string | null
          tipo: string
          titulo: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          conteudo?: Json
          created_at?: string | null
          execution_id?: string | null
          id?: string
          project_id: string
          status?: string | null
          tipo: string
          titulo: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          conteudo?: Json
          created_at?: string | null
          execution_id?: string | null
          id?: string
          project_id?: string
          status?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_artifacts_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "strategy_agent_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_artifacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "strategy_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_chat_messages: {
        Row: {
          agent_type: string | null
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          project_id: string
          role: string
        }
        Insert: {
          agent_type?: string | null
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          role?: string
        }
        Update: {
          agent_type?: string | null
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "strategy_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_custom_agents: {
        Row: {
          agent_card_json: Json | null
          agent_key: string
          ativo: boolean
          color: string
          created_at: string
          dependencies: string[]
          description: string
          estabelecimento_id: string
          icon: string
          id: string
          knowledge_base_files: Json | null
          knowledge_base_type: string
          name: string
          ordem: number
          output_schema: Json | null
          system_prompt: string
          updated_at: string
        }
        Insert: {
          agent_card_json?: Json | null
          agent_key: string
          ativo?: boolean
          color?: string
          created_at?: string
          dependencies?: string[]
          description?: string
          estabelecimento_id: string
          icon?: string
          id?: string
          knowledge_base_files?: Json | null
          knowledge_base_type?: string
          name: string
          ordem?: number
          output_schema?: Json | null
          system_prompt?: string
          updated_at?: string
        }
        Update: {
          agent_card_json?: Json | null
          agent_key?: string
          ativo?: boolean
          color?: string
          created_at?: string
          dependencies?: string[]
          description?: string
          estabelecimento_id?: string
          icon?: string
          id?: string
          knowledge_base_files?: Json | null
          knowledge_base_type?: string
          name?: string
          ordem?: number
          output_schema?: Json | null
          system_prompt?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_custom_agents_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_projects: {
        Row: {
          created_at: string | null
          descricao_negocio: string
          estabelecimento_id: string
          id: string
          nome: string
          status: string
          strategic_memory: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descricao_negocio: string
          estabelecimento_id: string
          id?: string
          nome: string
          status?: string
          strategic_memory?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          descricao_negocio?: string
          estabelecimento_id?: string
          id?: string
          nome?: string
          status?: string
          strategic_memory?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_projects_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_gallery_images: {
        Row: {
          categoria: string
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          id: string
          image_url: string
          nome: string | null
          pasta: string | null
          storage_path: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          image_url: string
          nome?: string | null
          pasta?: string | null
          storage_path?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          image_url?: string
          nome?: string | null
          pasta?: string | null
          storage_path?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      supervisor_acoes: {
        Row: {
          acao: string
          atendente_afetado_id: string | null
          chat_id: string | null
          created_at: string | null
          detalhes: Json | null
          id: string
          supervisor_id: string
        }
        Insert: {
          acao: string
          atendente_afetado_id?: string | null
          chat_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          supervisor_id: string
        }
        Update: {
          acao?: string
          atendente_afetado_id?: string | null
          chat_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_acoes_atendente_afetado_id_fkey"
            columns: ["atendente_afetado_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_acoes_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_acoes_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      system_visual_config: {
        Row: {
          created_at: string
          estabelecimento_id: string
          id: string
          splash_video_loop: boolean
          splash_video_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          splash_video_loop?: boolean
          splash_video_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          splash_video_loop?: boolean
          splash_video_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_visual_config_estabelecimento_id_fkey"
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
      telegram_config: {
        Row: {
          bot_token: string | null
          bot_username: string | null
          created_at: string
          estabelecimento_id: string
          id: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          bot_token?: string | null
          bot_username?: string | null
          created_at?: string
          estabelecimento_id: string
          id?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          bot_token?: string | null
          bot_username?: string | null
          created_at?: string
          estabelecimento_id?: string
          id?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
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
      ucm_config: {
        Row: {
          conference_room_number: string | null
          conference_room_password: string | null
          created_at: string
          enabled: boolean | null
          estabelecimento_id: string
          id: string
          is_local: boolean | null
          remote_ip: string | null
          ucm_host: string
          ucm_password: string
          ucm_user: string
          updated_at: string
        }
        Insert: {
          conference_room_number?: string | null
          conference_room_password?: string | null
          created_at?: string
          enabled?: boolean | null
          estabelecimento_id: string
          id?: string
          is_local?: boolean | null
          remote_ip?: string | null
          ucm_host: string
          ucm_password: string
          ucm_user: string
          updated_at?: string
        }
        Update: {
          conference_room_number?: string | null
          conference_room_password?: string | null
          created_at?: string
          enabled?: boolean | null
          estabelecimento_id?: string
          id?: string
          is_local?: boolean | null
          remote_ip?: string | null
          ucm_host?: string
          ucm_password?: string
          ucm_user?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ucm_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string | null
          estabelecimento_id: string | null
          id: string
          latitude: number | null
          logradouro: string | null
          longitude: number | null
          nome: string
          numero: string | null
          uf: string | null
          updated_at: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          nome: string
          numero?: string | null
          uf?: string | null
          updated_at?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          nome?: string
          numero?: string | null
          uf?: string | null
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
      user_activity_tracking: {
        Row: {
          created_at: string
          current_page_title: string | null
          current_route: string | null
          estabelecimento_id: string
          id: string
          is_online: boolean | null
          last_activity_at: string
          metadata: Json | null
          session_started_at: string
          total_active_time_seconds: number | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          current_page_title?: string | null
          current_route?: string | null
          estabelecimento_id: string
          id?: string
          is_online?: boolean | null
          last_activity_at?: string
          metadata?: Json | null
          session_started_at?: string
          total_active_time_seconds?: number | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          current_page_title?: string | null
          current_route?: string | null
          estabelecimento_id?: string
          id?: string
          is_online?: boolean | null
          last_activity_at?: string
          metadata?: Json | null
          session_started_at?: string
          total_active_time_seconds?: number | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_tracking_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_tracking_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_atalhos: {
        Row: {
          created_at: string | null
          estabelecimento_id: string
          icone: string
          id: string
          ordem: number | null
          path: string
          titulo: string
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id: string
          icone: string
          id?: string
          ordem?: number | null
          path: string
          titulo: string
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string
          icone?: string
          id?: string
          ordem?: number | null
          path?: string
          titulo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_atalhos_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_atalhos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_macros: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean | null
          estabelecimento_id: string
          id: string
          name: string
          shortcut: string | null
          steps: Json
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          estabelecimento_id: string
          id?: string
          name: string
          shortcut?: string | null
          steps?: Json
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          estabelecimento_id?: string
          id?: string
          name?: string
          shortcut?: string | null
          steps?: Json
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_macros_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_macros_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
          auth_user_id: string | null
          created_at: string | null
          email: string
          estabelecimento_id: string | null
          grupo_acesso_id: string | null
          hora_final: string
          hora_inicial: string
          id: string
          imap: string | null
          nome: string
          pop: string | null
          porta_imap: number | null
          porta_pop: number | null
          porta_smtp: number | null
          ramal: string | null
          ramal_senha: string | null
          segmento_id: string | null
          senha_email: string | null
          senha_hash: string
          senha_sip: string | null
          smtp: string | null
          telefone: string | null
          unidade_id: string | null
          updated_at: string | null
          usar_autenticacao: boolean | null
          usuario_sip: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          estabelecimento_id?: string | null
          grupo_acesso_id?: string | null
          hora_final?: string
          hora_inicial?: string
          id?: string
          imap?: string | null
          nome: string
          pop?: string | null
          porta_imap?: number | null
          porta_pop?: number | null
          porta_smtp?: number | null
          ramal?: string | null
          ramal_senha?: string | null
          segmento_id?: string | null
          senha_email?: string | null
          senha_hash: string
          senha_sip?: string | null
          smtp?: string | null
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string | null
          usar_autenticacao?: boolean | null
          usuario_sip?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          estabelecimento_id?: string | null
          grupo_acesso_id?: string | null
          hora_final?: string
          hora_inicial?: string
          id?: string
          imap?: string | null
          nome?: string
          pop?: string | null
          porta_imap?: number | null
          porta_pop?: number | null
          porta_smtp?: number | null
          ramal?: string | null
          ramal_senha?: string | null
          segmento_id?: string | null
          senha_email?: string | null
          senha_hash?: string
          senha_sip?: string | null
          smtp?: string | null
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string | null
          usar_autenticacao?: boolean | null
          usuario_sip?: string | null
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
            foreignKeyName: "usuarios_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
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
      veiculo_posicoes: {
        Row: {
          created_at: string
          data_hora: string
          direcao: number | null
          id: string
          lat: number
          lng: number
          veiculo_id: string
          velocidade: number | null
        }
        Insert: {
          created_at?: string
          data_hora?: string
          direcao?: number | null
          id?: string
          lat: number
          lng: number
          veiculo_id: string
          velocidade?: number | null
        }
        Update: {
          created_at?: string
          data_hora?: string
          direcao?: number | null
          id?: string
          lat?: number
          lng?: number
          veiculo_id?: string
          velocidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculo_posicoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          estabelecimento_id: string | null
          id: string
          motorista: string | null
          placa: string
          tipo_veiculo: string | null
          traccar_device_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string | null
          id?: string
          motorista?: string | null
          placa: string
          tipo_veiculo?: string | null
          traccar_device_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string | null
          id?: string
          motorista?: string | null
          placa?: string
          tipo_veiculo?: string | null
          traccar_device_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos_custos: {
        Row: {
          adic_hora_extra_perc: number | null
          consumo_cidade: number | null
          consumo_estrada: number | null
          created_at: string
          custo_funcionario_mensal: number | null
          custo_manutencao_mensal: number | null
          estabelecimento_id: string
          extras: number | null
          formula_frete: Json | null
          horas_mensais: number | null
          id: string
          jornada_base_dia: number | null
          observacoes: string | null
          pernoite: number | null
          peso_maximo_kg: number | null
          tipo_combustivel: string
          tipo_veiculo: string
          updated_at: string
          valor_ajudante: number | null
          valor_refeicao: number | null
        }
        Insert: {
          adic_hora_extra_perc?: number | null
          consumo_cidade?: number | null
          consumo_estrada?: number | null
          created_at?: string
          custo_funcionario_mensal?: number | null
          custo_manutencao_mensal?: number | null
          estabelecimento_id: string
          extras?: number | null
          formula_frete?: Json | null
          horas_mensais?: number | null
          id?: string
          jornada_base_dia?: number | null
          observacoes?: string | null
          pernoite?: number | null
          peso_maximo_kg?: number | null
          tipo_combustivel?: string
          tipo_veiculo: string
          updated_at?: string
          valor_ajudante?: number | null
          valor_refeicao?: number | null
        }
        Update: {
          adic_hora_extra_perc?: number | null
          consumo_cidade?: number | null
          consumo_estrada?: number | null
          created_at?: string
          custo_funcionario_mensal?: number | null
          custo_manutencao_mensal?: number | null
          estabelecimento_id?: string
          extras?: number | null
          formula_frete?: Json | null
          horas_mensais?: number | null
          id?: string
          jornada_base_dia?: number | null
          observacoes?: string | null
          pernoite?: number | null
          peso_maximo_kg?: number | null
          tipo_combustivel?: string
          tipo_veiculo?: string
          updated_at?: string
          valor_ajudante?: number | null
          valor_refeicao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_custos_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_atribuidas: {
        Row: {
          anuncio: string | null
          campanha: string | null
          created_at: string | null
          data_venda: string
          estabelecimento_id: string
          id: string
          origem: string | null
          pedido_id: string | null
          plataforma_id: string
          valor_venda: number
        }
        Insert: {
          anuncio?: string | null
          campanha?: string | null
          created_at?: string | null
          data_venda: string
          estabelecimento_id: string
          id?: string
          origem?: string | null
          pedido_id?: string | null
          plataforma_id: string
          valor_venda: number
        }
        Update: {
          anuncio?: string | null
          campanha?: string | null
          created_at?: string | null
          data_venda?: string
          estabelecimento_id?: string
          id?: string
          origem?: string | null
          pedido_id?: string | null
          plataforma_id?: string
          valor_venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_atribuidas_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_atribuidas_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "ad_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      video_projects: {
        Row: {
          created_at: string
          estabelecimento_id: string
          id: string
          nome: string
          thumbnail: string | null
          timeline_data: Json
          updated_at: string
          video_config: Json
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          nome?: string
          thumbnail?: string | null
          timeline_data?: Json
          updated_at?: string
          video_config?: Json
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          nome?: string
          thumbnail?: string | null
          timeline_data?: Json
          updated_at?: string
          video_config?: Json
        }
        Relationships: []
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
      whatsapp_catalogo_config: {
        Row: {
          access_token: string | null
          business_account_id: string | null
          catalog_id: string | null
          created_at: string
          estabelecimento_id: string
          id: string
          nome_conta: string | null
          phone_number_id: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          business_account_id?: string | null
          catalog_id?: string | null
          created_at?: string
          estabelecimento_id: string
          id?: string
          nome_conta?: string | null
          phone_number_id?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          business_account_id?: string | null
          catalog_id?: string | null
          created_at?: string
          estabelecimento_id?: string
          id?: string
          nome_conta?: string | null
          phone_number_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_catalogo_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
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
      check_catalog_expiration: { Args: never; Returns: undefined }
      cleanup_old_agent_chat_sessions: { Args: never; Returns: undefined }
      current_user_is_host: { Args: { host_user_id: string }; Returns: boolean }
      delete_customer_cascade: {
        Args: { p_customer_id: string }
        Returns: boolean
      }
      delete_empresa_cascade: {
        Args: { p_empresa_id: string }
        Returns: boolean
      }
      desativar_automacoes_vencidas: { Args: never; Returns: undefined }
      execute_sql: { Args: { sql_query: string }; Returns: Json }
      generate_orcamento_token: { Args: never; Returns: string }
      get_auth_user_estabelecimento_id: { Args: never; Returns: string }
      get_chat_storage_stats: {
        Args: { p_estabelecimento_id: string }
        Returns: Json
      }
      get_current_usuario_id: { Args: never; Returns: string }
      get_current_usuario_id_safe: { Args: never; Returns: string }
      get_user_conversation_ids: {
        Args: { _auth_uid: string }
        Returns: string[]
      }
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
      is_screen_share_host: { Args: { session_id: string }; Returns: boolean }
      is_screen_share_participant: {
        Args: { session_id: string }
        Returns: boolean
      }
      is_system_admin: { Args: never; Returns: boolean }
      roles_present: { Args: never; Returns: boolean }
      user_in_estabelecimento: { Args: { estab_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "gestor" | "agente"
      atendente_status:
        | "disponivel"
        | "ocupado"
        | "ausente"
        | "offline"
        | "pausa"
      chat_prioridade: "baixa" | "normal" | "alta" | "urgente"
      chat_status:
        | "novo"
        | "em_fila"
        | "em_atendimento"
        | "transferido"
        | "aguardando_cliente"
        | "encerrado"
        | "reaberto"
      tipo_roteamento:
        | "round_robin"
        | "por_skill"
        | "por_disponibilidade"
        | "por_carteira"
        | "por_prioridade"
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
      atendente_status: [
        "disponivel",
        "ocupado",
        "ausente",
        "offline",
        "pausa",
      ],
      chat_prioridade: ["baixa", "normal", "alta", "urgente"],
      chat_status: [
        "novo",
        "em_fila",
        "em_atendimento",
        "transferido",
        "aguardando_cliente",
        "encerrado",
        "reaberto",
      ],
      tipo_roteamento: [
        "round_robin",
        "por_skill",
        "por_disponibilidade",
        "por_carteira",
        "por_prioridade",
      ],
    },
  },
} as const
