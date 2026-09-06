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
    PostgrestVersion: "14.5"
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
      ads_platform_apps: {
        Row: {
          created_at: string
          estabelecimento_id: string
          google_ads_developer_token: string | null
          google_client_id: string | null
          google_client_secret: string | null
          id: string
          meta_app_id: string | null
          meta_app_secret: string | null
          tiktok_app_id: string | null
          tiktok_app_secret: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          google_ads_developer_token?: string | null
          google_client_id?: string | null
          google_client_secret?: string | null
          id?: string
          meta_app_id?: string | null
          meta_app_secret?: string | null
          tiktok_app_id?: string | null
          tiktok_app_secret?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          google_ads_developer_token?: string | null
          google_client_id?: string | null
          google_client_secret?: string | null
          id?: string
          meta_app_id?: string | null
          meta_app_secret?: string | null
          tiktok_app_id?: string | null
          tiktok_app_secret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ads_scheduler_config: {
        Row: {
          ativo: boolean
          created_at: string
          cron_expr: string | null
          estabelecimento_id: string
          frequencia: string
          proxima_execucao: string | null
          ultima_execucao: string | null
          ultimo_erro: string | null
          ultimo_status: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          cron_expr?: string | null
          estabelecimento_id: string
          frequencia?: string
          proxima_execucao?: string | null
          ultima_execucao?: string | null
          ultimo_erro?: string | null
          ultimo_status?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          cron_expr?: string | null
          estabelecimento_id?: string
          frequencia?: string
          proxima_execucao?: string | null
          ultima_execucao?: string | null
          ultimo_erro?: string | null
          ultimo_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_scheduler_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_business_rules: {
        Row: {
          acao: string
          ativo: boolean
          categoria: string
          condicao: string
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          id: string
          nome: string
          prioridade: number
          updated_at: string
        }
        Insert: {
          acao: string
          ativo?: boolean
          categoria: string
          condicao: string
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
          prioridade?: number
          updated_at?: string
        }
        Update: {
          acao?: string
          ativo?: boolean
          categoria?: string
          condicao?: string
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
          prioridade?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_business_rules_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
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
      agent_cross_sell_rules: {
        Row: {
          ativo: boolean
          created_at: string
          estabelecimento_id: string
          id: string
          motivo: string | null
          prioridade: number
          produto_origem: string
          produto_sugerido: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          estabelecimento_id: string
          id?: string
          motivo?: string | null
          prioridade?: number
          produto_origem: string
          produto_sugerido: string
          tipo?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          estabelecimento_id?: string
          id?: string
          motivo?: string | null
          prioridade?: number
          produto_origem?: string
          produto_sugerido?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_cross_sell_rules_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_data_bindings: {
        Row: {
          agent_template_key: string
          api_endpoint_id: string | null
          campo: string
          campo_api: string | null
          coluna_sistema: string | null
          configurado: boolean | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string
          fonte_tipo: string
          id: string
          label: string
          tabela_sistema: string | null
          updated_at: string | null
          valor_manual: string | null
        }
        Insert: {
          agent_template_key: string
          api_endpoint_id?: string | null
          campo: string
          campo_api?: string | null
          coluna_sistema?: string | null
          configurado?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id: string
          fonte_tipo?: string
          id?: string
          label: string
          tabela_sistema?: string | null
          updated_at?: string | null
          valor_manual?: string | null
        }
        Update: {
          agent_template_key?: string
          api_endpoint_id?: string | null
          campo?: string
          campo_api?: string | null
          coluna_sistema?: string | null
          configurado?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          fonte_tipo?: string
          id?: string
          label?: string
          tabela_sistema?: string | null
          updated_at?: string | null
          valor_manual?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_data_bindings_api_endpoint_id_fkey"
            columns: ["api_endpoint_id"]
            isOneToOne: false
            referencedRelation: "api_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_data_bindings_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_decision_logs: {
        Row: {
          agentes_acionados: string[] | null
          confianca: number | null
          contexto_resumido: string | null
          conversation_id: string | null
          created_at: string
          decisao: string | null
          escalonado_humano: boolean | null
          estabelecimento_id: string
          id: string
          intencao_detectada: string | null
          motivo_escalonamento: string | null
          orquestrador_id: string | null
          session_id: string | null
          tempo_resposta_ms: number | null
        }
        Insert: {
          agentes_acionados?: string[] | null
          confianca?: number | null
          contexto_resumido?: string | null
          conversation_id?: string | null
          created_at?: string
          decisao?: string | null
          escalonado_humano?: boolean | null
          estabelecimento_id: string
          id?: string
          intencao_detectada?: string | null
          motivo_escalonamento?: string | null
          orquestrador_id?: string | null
          session_id?: string | null
          tempo_resposta_ms?: number | null
        }
        Update: {
          agentes_acionados?: string[] | null
          confianca?: number | null
          contexto_resumido?: string | null
          conversation_id?: string | null
          created_at?: string
          decisao?: string | null
          escalonado_humano?: boolean | null
          estabelecimento_id?: string
          id?: string
          intencao_detectada?: string | null
          motivo_escalonamento?: string | null
          orquestrador_id?: string | null
          session_id?: string | null
          tempo_resposta_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_decision_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decision_logs_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decision_logs_orquestrador_id_fkey"
            columns: ["orquestrador_id"]
            isOneToOne: false
            referencedRelation: "chat_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decision_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_escalation_events: {
        Row: {
          agent_id: string | null
          categoria: string
          conversation_id: string | null
          created_at: string
          estabelecimento_id: string
          id: string
          motivo: string
          notas: string | null
          resolvido: boolean | null
          resolvido_em: string | null
          resolvido_por: string | null
          session_id: string | null
          severidade: string
        }
        Insert: {
          agent_id?: string | null
          categoria?: string
          conversation_id?: string | null
          created_at?: string
          estabelecimento_id: string
          id?: string
          motivo: string
          notas?: string | null
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          session_id?: string | null
          severidade?: string
        }
        Update: {
          agent_id?: string | null
          categoria?: string
          conversation_id?: string | null
          created_at?: string
          estabelecimento_id?: string
          id?: string
          motivo?: string
          notas?: string | null
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          session_id?: string | null
          severidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_escalation_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "chat_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_escalation_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_escalation_events_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_escalation_events_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_escalation_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_knowledge_bases: {
        Row: {
          ativo: boolean
          conteudo: string
          created_at: string
          dominio: string
          estabelecimento_id: string
          id: string
          ordem: number
          origem: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          conteudo?: string
          created_at?: string
          dominio: string
          estabelecimento_id: string
          id?: string
          ordem?: number
          origem?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          conteudo?: string
          created_at?: string
          dominio?: string
          estabelecimento_id?: string
          id?: string
          ordem?: number
          origem?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_knowledge_bases_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_objections: {
        Row: {
          argumentos: string | null
          ativo: boolean
          categoria: string
          created_at: string
          eficacia_percentual: number | null
          estabelecimento_id: string
          gatilhos_mentais: string | null
          id: string
          objecao: string
          resposta_sugerida: string
          updated_at: string
          vezes_usada: number | null
        }
        Insert: {
          argumentos?: string | null
          ativo?: boolean
          categoria?: string
          created_at?: string
          eficacia_percentual?: number | null
          estabelecimento_id: string
          gatilhos_mentais?: string | null
          id?: string
          objecao: string
          resposta_sugerida: string
          updated_at?: string
          vezes_usada?: number | null
        }
        Update: {
          argumentos?: string | null
          ativo?: boolean
          categoria?: string
          created_at?: string
          eficacia_percentual?: number | null
          estabelecimento_id?: string
          gatilhos_mentais?: string | null
          id?: string
          objecao?: string
          resposta_sugerida?: string
          updated_at?: string
          vezes_usada?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_objections_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_performance_metrics: {
        Row: {
          agent_id: string
          created_at: string
          cross_sell_gerado: number | null
          estabelecimento_id: string
          id: string
          objecoes_recuperadas: number | null
          periodo_fim: string
          periodo_inicio: string
          satisfacao_media: number | null
          taxa_conversao: number | null
          tempo_medio_resposta_ms: number | null
          ticket_medio: number | null
          total_escalonamentos: number | null
          total_interacoes: number | null
          total_resolvido_sem_humano: number | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          cross_sell_gerado?: number | null
          estabelecimento_id: string
          id?: string
          objecoes_recuperadas?: number | null
          periodo_fim: string
          periodo_inicio: string
          satisfacao_media?: number | null
          taxa_conversao?: number | null
          tempo_medio_resposta_ms?: number | null
          ticket_medio?: number | null
          total_escalonamentos?: number | null
          total_interacoes?: number | null
          total_resolvido_sem_humano?: number | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          cross_sell_gerado?: number | null
          estabelecimento_id?: string
          id?: string
          objecoes_recuperadas?: number | null
          periodo_fim?: string
          periodo_inicio?: string
          satisfacao_media?: number | null
          taxa_conversao?: number | null
          tempo_medio_resposta_ms?: number | null
          ticket_medio?: number | null
          total_escalonamentos?: number | null
          total_interacoes?: number | null
          total_resolvido_sem_humano?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_performance_metrics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "chat_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_performance_metrics_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
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
      aip_agent_versions: {
        Row: {
          agent_id: string
          created_at: string
          created_by: string | null
          estabelecimento_id: string
          id: string
          nota: string | null
          snapshot: Json
          updated_at: string
          versao: number
        }
        Insert: {
          agent_id: string
          created_at?: string
          created_by?: string | null
          estabelecimento_id: string
          id?: string
          nota?: string | null
          snapshot?: Json
          updated_at?: string
          versao: number
        }
        Update: {
          agent_id?: string
          created_at?: string
          created_by?: string | null
          estabelecimento_id?: string
          id?: string
          nota?: string | null
          snapshot?: Json
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "aip_agent_versions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "aip_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      aip_agents: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          estabelecimento_id: string
          id: string
          limite_custo: number | null
          limite_tempo_seg: number | null
          mcp_ids: string[]
          modelo_ia: string
          nome: string
          prompt_principal: string
          skill_ids: string[]
          tags: string[]
          tool_ids: string[]
          updated_at: string
          versao: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          limite_custo?: number | null
          limite_tempo_seg?: number | null
          mcp_ids?: string[]
          modelo_ia?: string
          nome: string
          prompt_principal?: string
          skill_ids?: string[]
          tags?: string[]
          tool_ids?: string[]
          updated_at?: string
          versao?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          limite_custo?: number | null
          limite_tempo_seg?: number | null
          mcp_ids?: string[]
          modelo_ia?: string
          nome?: string
          prompt_principal?: string
          skill_ids?: string[]
          tags?: string[]
          tool_ids?: string[]
          updated_at?: string
          versao?: number
        }
        Relationships: []
      }
      aip_api_keys: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          escopos: string[]
          estabelecimento_id: string
          expira_em: string | null
          hash: string
          id: string
          nome: string
          prefixo: string
          ultimo_uso: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          escopos?: string[]
          estabelecimento_id: string
          expira_em?: string | null
          hash: string
          id?: string
          nome: string
          prefixo: string
          ultimo_uso?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          escopos?: string[]
          estabelecimento_id?: string
          expira_em?: string | null
          hash?: string
          id?: string
          nome?: string
          prefixo?: string
          ultimo_uso?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      aip_approvals: {
        Row: {
          comentario: string | null
          created_at: string
          decidido_em: string | null
          decidido_por: string | null
          decidido_por_nome: string | null
          estabelecimento_id: string
          execution_id: string
          id: string
          instrucoes: string | null
          node_id: string | null
          payload: Json
          selecionados: Json
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          decidido_por_nome?: string | null
          estabelecimento_id: string
          execution_id: string
          id?: string
          instrucoes?: string | null
          node_id?: string | null
          payload?: Json
          selecionados?: Json
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Update: {
          comentario?: string | null
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          decidido_por_nome?: string | null
          estabelecimento_id?: string
          execution_id?: string
          id?: string
          instrucoes?: string | null
          node_id?: string | null
          payload?: Json
          selecionados?: Json
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aip_approvals_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "aip_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      aip_asset_versions: {
        Row: {
          asset_id: string
          created_at: string
          created_by: string | null
          estabelecimento_id: string
          id: string
          metadata: Json
          storage_path: string | null
          updated_at: string
          url: string | null
          versao: number
        }
        Insert: {
          asset_id: string
          created_at?: string
          created_by?: string | null
          estabelecimento_id: string
          id?: string
          metadata?: Json
          storage_path?: string | null
          updated_at?: string
          url?: string | null
          versao: number
        }
        Update: {
          asset_id?: string
          created_at?: string
          created_by?: string | null
          estabelecimento_id?: string
          id?: string
          metadata?: Json
          storage_path?: string | null
          updated_at?: string
          url?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "aip_asset_versions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "aip_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      aip_assets: {
        Row: {
          created_at: string
          created_by: string | null
          estabelecimento_id: string
          execution_id: string | null
          id: string
          metadata: Json
          mime_type: string | null
          nome: string
          storage_path: string | null
          tamanho_bytes: number | null
          tipo: string
          updated_at: string
          url: string | null
          versao: number
          workflow_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estabelecimento_id: string
          execution_id?: string | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          nome: string
          storage_path?: string | null
          tamanho_bytes?: number | null
          tipo?: string
          updated_at?: string
          url?: string | null
          versao?: number
          workflow_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estabelecimento_id?: string
          execution_id?: string | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          nome?: string
          storage_path?: string | null
          tamanho_bytes?: number | null
          tipo?: string
          updated_at?: string
          url?: string | null
          versao?: number
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aip_assets_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "aip_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aip_assets_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "aip_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      aip_audit_log: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json
          estabelecimento_id: string
          id: string
          recurso_id: string | null
          recurso_tipo: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json
          estabelecimento_id: string
          id?: string
          recurso_id?: string | null
          recurso_tipo?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json
          estabelecimento_id?: string
          id?: string
          recurso_id?: string | null
          recurso_tipo?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      aip_conectores: {
        Row: {
          categoria: string | null
          created_at: string
          descricao: string | null
          disponivel: boolean
          estabelecimento_id: string
          ferramentas: Json
          icone: string | null
          id: string
          metadados: Json
          nome: string
          origem: string
          ref: string
          status: string
          tipo: string
          ultima_sync: string
          ultimo_erro: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          disponivel?: boolean
          estabelecimento_id: string
          ferramentas?: Json
          icone?: string | null
          id?: string
          metadados?: Json
          nome: string
          origem?: string
          ref: string
          status?: string
          tipo: string
          ultima_sync?: string
          ultimo_erro?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          disponivel?: boolean
          estabelecimento_id?: string
          ferramentas?: Json
          icone?: string | null
          id?: string
          metadados?: Json
          nome?: string
          origem?: string
          ref?: string
          status?: string
          tipo?: string
          ultima_sync?: string
          ultimo_erro?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      aip_credenciais: {
        Row: {
          ambiente: string
          ativo: boolean
          created_at: string
          created_by: string | null
          dados: Json
          descricao: string | null
          estabelecimento_id: string
          expira_em: string | null
          id: string
          mascara: string | null
          nome: string
          provedor: string
          rotacao_dias: number | null
          rotacionado_em: string | null
          rotacionado_por: string | null
          segredo_cifrado: string | null
          ultimo_uso: string | null
          updated_at: string
          versao: number
        }
        Insert: {
          ambiente?: string
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          dados?: Json
          descricao?: string | null
          estabelecimento_id: string
          expira_em?: string | null
          id?: string
          mascara?: string | null
          nome: string
          provedor: string
          rotacao_dias?: number | null
          rotacionado_em?: string | null
          rotacionado_por?: string | null
          segredo_cifrado?: string | null
          ultimo_uso?: string | null
          updated_at?: string
          versao?: number
        }
        Update: {
          ambiente?: string
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          dados?: Json
          descricao?: string | null
          estabelecimento_id?: string
          expira_em?: string | null
          id?: string
          mascara?: string | null
          nome?: string
          provedor?: string
          rotacao_dias?: number | null
          rotacionado_em?: string | null
          rotacionado_por?: string | null
          segredo_cifrado?: string | null
          ultimo_uso?: string | null
          updated_at?: string
          versao?: number
        }
        Relationships: []
      }
      aip_credencial_versoes: {
        Row: {
          created_at: string
          credencial_id: string
          criado_por: string | null
          estabelecimento_id: string
          id: string
          mascara: string | null
          motivo: string | null
          segredo_cifrado: string | null
          versao: number
        }
        Insert: {
          created_at?: string
          credencial_id: string
          criado_por?: string | null
          estabelecimento_id: string
          id?: string
          mascara?: string | null
          motivo?: string | null
          segredo_cifrado?: string | null
          versao: number
        }
        Update: {
          created_at?: string
          credencial_id?: string
          criado_por?: string | null
          estabelecimento_id?: string
          id?: string
          mascara?: string | null
          motivo?: string | null
          segredo_cifrado?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "aip_credencial_versoes_credencial_id_fkey"
            columns: ["credencial_id"]
            isOneToOne: false
            referencedRelation: "aip_credenciais"
            referencedColumns: ["id"]
          },
        ]
      }
      aip_execution_steps: {
        Row: {
          created_at: string
          custo: number
          duracao_ms: number | null
          estabelecimento_id: string
          execution_id: string
          id: string
          input: Json
          logs: string | null
          motivo_interrupcao: string | null
          node_id: string | null
          ordem: number
          output: Json
          status: string
          tentativa: number
          tentativas_max: number
          timeout_ms: number | null
          tipo: string | null
          titulo: string | null
          tokens_input: number
          tokens_output: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo?: number
          duracao_ms?: number | null
          estabelecimento_id: string
          execution_id: string
          id?: string
          input?: Json
          logs?: string | null
          motivo_interrupcao?: string | null
          node_id?: string | null
          ordem?: number
          output?: Json
          status?: string
          tentativa?: number
          tentativas_max?: number
          timeout_ms?: number | null
          tipo?: string | null
          titulo?: string | null
          tokens_input?: number
          tokens_output?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo?: number
          duracao_ms?: number | null
          estabelecimento_id?: string
          execution_id?: string
          id?: string
          input?: Json
          logs?: string | null
          motivo_interrupcao?: string | null
          node_id?: string | null
          ordem?: number
          output?: Json
          status?: string
          tentativa?: number
          tentativas_max?: number
          timeout_ms?: number | null
          tipo?: string | null
          titulo?: string | null
          tokens_input?: number
          tokens_output?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aip_execution_steps_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "aip_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      aip_executions: {
        Row: {
          agent_id: string | null
          cancelado_em: string | null
          cancelado_por: string | null
          cancelamento_solicitado: boolean
          contexto: Json
          created_at: string
          custo: number
          duracao_ms: number | null
          erro: string | null
          estabelecimento_id: string
          etapa_atual: string | null
          finalizado_em: string | null
          id: string
          iniciado_em: string
          input: Json
          modelo: string | null
          motivo_interrupcao: string | null
          origem: string
          pausado_em: string | null
          prompt: string | null
          remote_run_id: string | null
          resposta: string | null
          retentativas: number
          retomado_de_node_id: string | null
          retomado_em: string | null
          retomado_por: string | null
          status: string
          tokens_input: number
          tokens_output: number
          updated_at: string
          usuario_id: string | null
          wizard_id: string | null
          workflow_id: string | null
          workflow_snapshot: Json | null
          workflow_versao: number | null
          workflow_version_id: string | null
        }
        Insert: {
          agent_id?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          cancelamento_solicitado?: boolean
          contexto?: Json
          created_at?: string
          custo?: number
          duracao_ms?: number | null
          erro?: string | null
          estabelecimento_id: string
          etapa_atual?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          input?: Json
          modelo?: string | null
          motivo_interrupcao?: string | null
          origem?: string
          pausado_em?: string | null
          prompt?: string | null
          remote_run_id?: string | null
          resposta?: string | null
          retentativas?: number
          retomado_de_node_id?: string | null
          retomado_em?: string | null
          retomado_por?: string | null
          status?: string
          tokens_input?: number
          tokens_output?: number
          updated_at?: string
          usuario_id?: string | null
          wizard_id?: string | null
          workflow_id?: string | null
          workflow_snapshot?: Json | null
          workflow_versao?: number | null
          workflow_version_id?: string | null
        }
        Update: {
          agent_id?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          cancelamento_solicitado?: boolean
          contexto?: Json
          created_at?: string
          custo?: number
          duracao_ms?: number | null
          erro?: string | null
          estabelecimento_id?: string
          etapa_atual?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          input?: Json
          modelo?: string | null
          motivo_interrupcao?: string | null
          origem?: string
          pausado_em?: string | null
          prompt?: string | null
          remote_run_id?: string | null
          resposta?: string | null
          retentativas?: number
          retomado_de_node_id?: string | null
          retomado_em?: string | null
          retomado_por?: string | null
          status?: string
          tokens_input?: number
          tokens_output?: number
          updated_at?: string
          usuario_id?: string | null
          wizard_id?: string | null
          workflow_id?: string | null
          workflow_snapshot?: Json | null
          workflow_versao?: number | null
          workflow_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aip_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "aip_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aip_executions_wizard_id_fkey"
            columns: ["wizard_id"]
            isOneToOne: false
            referencedRelation: "aip_wizards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aip_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "aip_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aip_executions_workflow_version_id_fkey"
            columns: ["workflow_version_id"]
            isOneToOne: false
            referencedRelation: "aip_workflow_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      aip_mcps: {
        Row: {
          ambiente: string
          created_at: string
          created_by: string | null
          credencial_ref: string | null
          descricao: string | null
          endpoint: string
          estabelecimento_id: string
          ferramentas: Json
          id: string
          nome: string
          status: string
          tipo: string
          ultimo_erro: string | null
          ultimo_handshake: string | null
          updated_at: string
        }
        Insert: {
          ambiente?: string
          created_at?: string
          created_by?: string | null
          credencial_ref?: string | null
          descricao?: string | null
          endpoint: string
          estabelecimento_id: string
          ferramentas?: Json
          id?: string
          nome: string
          status?: string
          tipo?: string
          ultimo_erro?: string | null
          ultimo_handshake?: string | null
          updated_at?: string
        }
        Update: {
          ambiente?: string
          created_at?: string
          created_by?: string | null
          credencial_ref?: string | null
          descricao?: string | null
          endpoint?: string
          estabelecimento_id?: string
          ferramentas?: Json
          id?: string
          nome?: string
          status?: string
          tipo?: string
          ultimo_erro?: string | null
          ultimo_handshake?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      aip_notification_settings: {
        Row: {
          created_at: string
          emails: string[]
          estabelecimento_id: string
          id: string
          notificar_aprovacao: boolean
          notificar_fim: boolean
          notificar_inicio: boolean
          ui_ativo: boolean
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          emails?: string[]
          estabelecimento_id: string
          id?: string
          notificar_aprovacao?: boolean
          notificar_fim?: boolean
          notificar_inicio?: boolean
          ui_ativo?: boolean
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          emails?: string[]
          estabelecimento_id?: string
          id?: string
          notificar_aprovacao?: boolean
          notificar_fim?: boolean
          notificar_inicio?: boolean
          ui_ativo?: boolean
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      aip_notifications: {
        Row: {
          approval_id: string | null
          created_at: string
          estabelecimento_id: string
          evento: string
          execution_id: string | null
          id: string
          lida: boolean
          mensagem: string | null
          nivel: string
          payload: Json
          titulo: string
          updated_at: string
        }
        Insert: {
          approval_id?: string | null
          created_at?: string
          estabelecimento_id: string
          evento: string
          execution_id?: string | null
          id?: string
          lida?: boolean
          mensagem?: string | null
          nivel?: string
          payload?: Json
          titulo: string
          updated_at?: string
        }
        Update: {
          approval_id?: string | null
          created_at?: string
          estabelecimento_id?: string
          evento?: string
          execution_id?: string | null
          id?: string
          lida?: boolean
          mensagem?: string | null
          nivel?: string
          payload?: Json
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      aip_permissions: {
        Row: {
          acoes: string[]
          created_at: string
          estabelecimento_id: string
          id: string
          perfil: string | null
          recurso_id: string | null
          recurso_tipo: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          acoes?: string[]
          created_at?: string
          estabelecimento_id: string
          id?: string
          perfil?: string | null
          recurso_id?: string | null
          recurso_tipo: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          acoes?: string[]
          created_at?: string
          estabelecimento_id?: string
          id?: string
          perfil?: string | null
          recurso_id?: string | null
          recurso_tipo?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      aip_receitas: {
        Row: {
          agenda: Json
          agent_id: string | null
          created_at: string
          criado_por: string | null
          detalhes: string | null
          estabelecimento_id: string
          etapas: Json
          id: string
          mcp_ids: Json
          md_conteudo: string | null
          md_nome: string | null
          modelo: string | null
          modo_execucao: string
          nome: string
          objetivo: string | null
          referencias: Json
          rotina_id: string | null
          skill_ids: Json
          tipo: string
          tool_ids: Json
          updated_at: string
        }
        Insert: {
          agenda?: Json
          agent_id?: string | null
          created_at?: string
          criado_por?: string | null
          detalhes?: string | null
          estabelecimento_id: string
          etapas?: Json
          id?: string
          mcp_ids?: Json
          md_conteudo?: string | null
          md_nome?: string | null
          modelo?: string | null
          modo_execucao?: string
          nome: string
          objetivo?: string | null
          referencias?: Json
          rotina_id?: string | null
          skill_ids?: Json
          tipo?: string
          tool_ids?: Json
          updated_at?: string
        }
        Update: {
          agenda?: Json
          agent_id?: string | null
          created_at?: string
          criado_por?: string | null
          detalhes?: string | null
          estabelecimento_id?: string
          etapas?: Json
          id?: string
          mcp_ids?: Json
          md_conteudo?: string | null
          md_nome?: string | null
          modelo?: string | null
          modo_execucao?: string
          nome?: string
          objetivo?: string | null
          referencias?: Json
          rotina_id?: string | null
          skill_ids?: Json
          tipo?: string
          tool_ids?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aip_receitas_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "aip_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aip_receitas_rotina_id_fkey"
            columns: ["rotina_id"]
            isOneToOne: false
            referencedRelation: "aip_rotinas"
            referencedColumns: ["id"]
          },
        ]
      }
      aip_resources: {
        Row: {
          ativo: boolean
          categoria: string
          config: Json
          config_schema: Json
          created_at: string
          descricao: string | null
          estabelecimento_id: string | null
          icone: string | null
          id: string
          is_padrao: boolean
          nome: string
          slug: string
          subcategoria: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          config?: Json
          config_schema?: Json
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string | null
          icone?: string | null
          id?: string
          is_padrao?: boolean
          nome: string
          slug: string
          subcategoria?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          config?: Json
          config_schema?: Json
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string | null
          icone?: string | null
          id?: string
          is_padrao?: boolean
          nome?: string
          slug?: string
          subcategoria?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      aip_rotina_runs: {
        Row: {
          chave_minuto: string | null
          created_at: string
          detalhes: Json
          duracao_ms: number | null
          erro: string | null
          estabelecimento_id: string
          execution_id: string | null
          finalizado_em: string | null
          id: string
          iniciado_em: string
          motivo_bloqueio: string | null
          origem: string
          rotina_id: string
          status: string
          tentativa: number
          updated_at: string
        }
        Insert: {
          chave_minuto?: string | null
          created_at?: string
          detalhes?: Json
          duracao_ms?: number | null
          erro?: string | null
          estabelecimento_id: string
          execution_id?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          motivo_bloqueio?: string | null
          origem?: string
          rotina_id: string
          status?: string
          tentativa?: number
          updated_at?: string
        }
        Update: {
          chave_minuto?: string | null
          created_at?: string
          detalhes?: Json
          duracao_ms?: number | null
          erro?: string | null
          estabelecimento_id?: string
          execution_id?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          motivo_bloqueio?: string | null
          origem?: string
          rotina_id?: string
          status?: string
          tentativa?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aip_rotina_runs_rotina_id_fkey"
            columns: ["rotina_id"]
            isOneToOne: false
            referencedRelation: "aip_rotinas"
            referencedColumns: ["id"]
          },
        ]
      }
      aip_rotinas: {
        Row: {
          agent_id: string | null
          ativo: boolean
          bloquear_duplicados: boolean
          conectores: Json
          created_at: string
          criado_por: string | null
          cron_expressao: string
          descricao: string | null
          estabelecimento_id: string
          fuso: string
          id: string
          input: Json
          max_concorrencia: number
          modelo: string | null
          nome: string
          prompt: string | null
          proxima_execucao: string | null
          retry_backoff_ms: number
          retry_fator: number
          retry_max: number
          timeout_ms: number
          tipo_alvo: string
          ultima_execucao: string | null
          ultima_execution_id: string | null
          ultimo_erro: string | null
          ultimo_status: string | null
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          agent_id?: string | null
          ativo?: boolean
          bloquear_duplicados?: boolean
          conectores?: Json
          created_at?: string
          criado_por?: string | null
          cron_expressao?: string
          descricao?: string | null
          estabelecimento_id: string
          fuso?: string
          id?: string
          input?: Json
          max_concorrencia?: number
          modelo?: string | null
          nome: string
          prompt?: string | null
          proxima_execucao?: string | null
          retry_backoff_ms?: number
          retry_fator?: number
          retry_max?: number
          timeout_ms?: number
          tipo_alvo?: string
          ultima_execucao?: string | null
          ultima_execution_id?: string | null
          ultimo_erro?: string | null
          ultimo_status?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          agent_id?: string | null
          ativo?: boolean
          bloquear_duplicados?: boolean
          conectores?: Json
          created_at?: string
          criado_por?: string | null
          cron_expressao?: string
          descricao?: string | null
          estabelecimento_id?: string
          fuso?: string
          id?: string
          input?: Json
          max_concorrencia?: number
          modelo?: string | null
          nome?: string
          prompt?: string | null
          proxima_execucao?: string | null
          retry_backoff_ms?: number
          retry_fator?: number
          retry_max?: number
          timeout_ms?: number
          tipo_alvo?: string
          ultima_execucao?: string | null
          ultima_execution_id?: string | null
          ultimo_erro?: string | null
          ultimo_status?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aip_rotinas_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "aip_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aip_rotinas_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "aip_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      aip_server_config: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          chave: string
          enviado_em: string | null
          id: string
          mascara: string | null
          valor_cifrado: string
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave: string
          enviado_em?: string | null
          id?: string
          mascara?: string | null
          valor_cifrado: string
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave?: string
          enviado_em?: string | null
          id?: string
          mascara?: string | null
          valor_cifrado?: string
        }
        Relationships: []
      }
      aip_skill_files: {
        Row: {
          created_at: string
          estabelecimento_id: string
          id: string
          mime_type: string | null
          nome_arquivo: string
          skill_id: string
          storage_path: string
          tamanho_bytes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          skill_id: string
          storage_path: string
          tamanho_bytes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          skill_id?: string
          storage_path?: string
          tamanho_bytes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aip_skill_files_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "aip_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      aip_skill_versions: {
        Row: {
          conteudo_md: string
          created_at: string
          created_by: string | null
          estabelecimento_id: string
          id: string
          nota: string | null
          skill_id: string
          updated_at: string
          versao: number
        }
        Insert: {
          conteudo_md?: string
          created_at?: string
          created_by?: string | null
          estabelecimento_id: string
          id?: string
          nota?: string | null
          skill_id: string
          updated_at?: string
          versao: number
        }
        Update: {
          conteudo_md?: string
          created_at?: string
          created_by?: string | null
          estabelecimento_id?: string
          id?: string
          nota?: string | null
          skill_id?: string
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "aip_skill_versions_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "aip_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      aip_skills: {
        Row: {
          ativo: boolean
          categoria: string | null
          conteudo_md: string
          created_at: string
          created_by: string | null
          descricao: string | null
          estabelecimento_id: string
          id: string
          nome: string
          slug: string | null
          status: string
          tags: string[]
          updated_at: string
          versao: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          conteudo_md?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
          slug?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          versao?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          conteudo_md?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
          slug?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          versao?: number
        }
        Relationships: []
      }
      aip_tools: {
        Row: {
          categoria: string
          created_at: string
          created_by: string | null
          credencial_ref: string | null
          descricao: string | null
          endpoint: string | null
          estabelecimento_id: string
          id: string
          input_schema: Json
          metodo: string
          nome: string
          output_schema: Json
          permissoes: string[]
          retry: number
          status: string
          tags: string[]
          timeout_seg: number
          tipo: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          created_by?: string | null
          credencial_ref?: string | null
          descricao?: string | null
          endpoint?: string | null
          estabelecimento_id: string
          id?: string
          input_schema?: Json
          metodo?: string
          nome: string
          output_schema?: Json
          permissoes?: string[]
          retry?: number
          status?: string
          tags?: string[]
          timeout_seg?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          created_by?: string | null
          credencial_ref?: string | null
          descricao?: string | null
          endpoint?: string | null
          estabelecimento_id?: string
          id?: string
          input_schema?: Json
          metodo?: string
          nome?: string
          output_schema?: Json
          permissoes?: string[]
          retry?: number
          status?: string
          tags?: string[]
          timeout_seg?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      aip_usage_limits: {
        Row: {
          bloquear_ao_exceder: boolean
          created_at: string
          custo_max_dia: number | null
          escopo: string
          estabelecimento_id: string
          execucoes_max_dia: number | null
          id: string
          referencia_id: string | null
          tokens_max_dia: number | null
          updated_at: string
        }
        Insert: {
          bloquear_ao_exceder?: boolean
          created_at?: string
          custo_max_dia?: number | null
          escopo?: string
          estabelecimento_id: string
          execucoes_max_dia?: number | null
          id?: string
          referencia_id?: string | null
          tokens_max_dia?: number | null
          updated_at?: string
        }
        Update: {
          bloquear_ao_exceder?: boolean
          created_at?: string
          custo_max_dia?: number | null
          escopo?: string
          estabelecimento_id?: string
          execucoes_max_dia?: number | null
          id?: string
          referencia_id?: string | null
          tokens_max_dia?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      aip_wizards: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          entrega: Json
          estabelecimento_id: string
          etapas: Json
          icone: string | null
          id: string
          nome: string
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          entrega?: Json
          estabelecimento_id: string
          etapas?: Json
          icone?: string | null
          id?: string
          nome: string
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          entrega?: Json
          estabelecimento_id?: string
          etapas?: Json
          icone?: string | null
          id?: string
          nome?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aip_wizards_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "aip_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      aip_workflow_versions: {
        Row: {
          created_at: string
          created_by: string | null
          estabelecimento_id: string
          flow_data: Json
          id: string
          nota: string | null
          updated_at: string
          versao: number
          workflow_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estabelecimento_id: string
          flow_data?: Json
          id?: string
          nota?: string | null
          updated_at?: string
          versao: number
          workflow_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estabelecimento_id?: string
          flow_data?: Json
          id?: string
          nota?: string | null
          updated_at?: string
          versao?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aip_workflow_versions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "aip_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      aip_workflows: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          estabelecimento_id: string
          flow_data: Json
          id: string
          nome: string
          tags: string[]
          updated_at: string
          versao: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          estabelecimento_id: string
          flow_data?: Json
          id?: string
          nome: string
          tags?: string[]
          updated_at?: string
          versao?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          flow_data?: Json
          id?: string
          nome?: string
          tags?: string[]
          updated_at?: string
          versao?: number
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
      apresentacoes_empresa: {
        Row: {
          ativo: boolean
          created_at: string
          criado_por: string | null
          descricao: string | null
          duracao_padrao_imagem: number
          estabelecimento_id: string
          id: string
          itens: Json
          nome: string
          transicao: string
          updated_at: string
          versao: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          duracao_padrao_imagem?: number
          estabelecimento_id: string
          id?: string
          itens?: Json
          nome: string
          transicao?: string
          updated_at?: string
          versao?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          duracao_padrao_imagem?: number
          estabelecimento_id?: string
          id?: string
          itens?: Json
          nome?: string
          transicao?: string
          updated_at?: string
          versao?: number
        }
        Relationships: []
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
      assistente_voz_comandos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          estabelecimento_id: string
          frase_gatilho: string
          id: string
          payload: Json
          resposta_falada: string | null
          tipo_acao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          estabelecimento_id: string
          frase_gatilho: string
          id?: string
          payload?: Json
          resposta_falada?: string | null
          tipo_acao: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          frase_gatilho?: string
          id?: string
          payload?: Json
          resposta_falada?: string | null
          tipo_acao?: string
          updated_at?: string
        }
        Relationships: []
      }
      assistente_voz_config: {
        Row: {
          auth_user_id: string
          created_at: string
          ferramentas_desativadas: string[]
          frases_customizadas: Json
          id: string
          responder_por_voz: boolean
          updated_at: string
          voz: string
          wake_word: string
          wake_word_ativo: boolean
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          ferramentas_desativadas?: string[]
          frases_customizadas?: Json
          id?: string
          responder_por_voz?: boolean
          updated_at?: string
          voz?: string
          wake_word?: string
          wake_word_ativo?: boolean
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          ferramentas_desativadas?: string[]
          frases_customizadas?: Json
          id?: string
          responder_por_voz?: boolean
          updated_at?: string
          voz?: string
          wake_word?: string
          wake_word_ativo?: boolean
        }
        Relationships: []
      }
      assistente_voz_log: {
        Row: {
          acao: Json | null
          auth_user_id: string
          created_at: string
          erro: string | null
          estabelecimento_id: string | null
          id: string
          resposta: string | null
          sucesso: boolean
          transcricao: string | null
        }
        Insert: {
          acao?: Json | null
          auth_user_id: string
          created_at?: string
          erro?: string | null
          estabelecimento_id?: string | null
          id?: string
          resposta?: string | null
          sucesso?: boolean
          transcricao?: string | null
        }
        Update: {
          acao?: Json | null
          auth_user_id?: string
          created_at?: string
          erro?: string | null
          estabelecimento_id?: string | null
          id?: string
          resposta?: string | null
          sucesso?: boolean
          transcricao?: string | null
        }
        Relationships: []
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
          forward_to_bot_enabled: boolean
          forward_to_bot_id: string | null
          forward_to_numero_id: string | null
          id: string
          name: string
          updated_at: string | null
          whatsapp_numero_id: string | null
          whatsapp_type: string | null
        }
        Insert: {
          active?: boolean | null
          canais?: string[] | null
          created_at?: string | null
          description?: string | null
          estabelecimento_id?: string | null
          flow_data: Json
          forward_to_bot_enabled?: boolean
          forward_to_bot_id?: string | null
          forward_to_numero_id?: string | null
          id?: string
          name: string
          updated_at?: string | null
          whatsapp_numero_id?: string | null
          whatsapp_type?: string | null
        }
        Update: {
          active?: boolean | null
          canais?: string[] | null
          created_at?: string | null
          description?: string | null
          estabelecimento_id?: string | null
          flow_data?: Json
          forward_to_bot_enabled?: boolean
          forward_to_bot_id?: string | null
          forward_to_numero_id?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          whatsapp_numero_id?: string | null
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
          {
            foreignKeyName: "bot_flows_forward_to_bot_id_fkey"
            columns: ["forward_to_bot_id"]
            isOneToOne: false
            referencedRelation: "bot_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_flows_forward_to_numero_id_fkey"
            columns: ["forward_to_numero_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numeros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_flows_whatsapp_numero_id_fkey"
            columns: ["whatsapp_numero_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numeros"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_frase_uso: {
        Row: {
          cursor_key: string
          estabelecimento_id: string
          frase_id: string
          id: string
          used_at: string
        }
        Insert: {
          cursor_key: string
          estabelecimento_id: string
          frase_id: string
          id?: string
          used_at?: string
        }
        Update: {
          cursor_key?: string
          estabelecimento_id?: string
          frase_id?: string
          id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_frase_uso_frase_id_fkey"
            columns: ["frase_id"]
            isOneToOne: false
            referencedRelation: "mensagens_grupo_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_response_tracking: {
        Row: {
          block_id: string | null
          bot_execution_id: string | null
          contato_telefone: string
          created_at: string
          empresa_id: string | null
          enviado_em: string
          estabelecimento_id: string
          expira_em: string
          flow_id: string | null
          flow_nome: string | null
          id: string
          respondido_em: string | null
          resposta_texto: string | null
          status: Database["public"]["Enums"]["bot_response_status"]
          timeout_horas: number
          updated_at: string
        }
        Insert: {
          block_id?: string | null
          bot_execution_id?: string | null
          contato_telefone: string
          created_at?: string
          empresa_id?: string | null
          enviado_em?: string
          estabelecimento_id: string
          expira_em?: string
          flow_id?: string | null
          flow_nome?: string | null
          id?: string
          respondido_em?: string | null
          resposta_texto?: string | null
          status?: Database["public"]["Enums"]["bot_response_status"]
          timeout_horas?: number
          updated_at?: string
        }
        Update: {
          block_id?: string | null
          bot_execution_id?: string | null
          contato_telefone?: string
          created_at?: string
          empresa_id?: string | null
          enviado_em?: string
          estabelecimento_id?: string
          expira_em?: string
          flow_id?: string | null
          flow_nome?: string | null
          id?: string
          respondido_em?: string | null
          resposta_texto?: string | null
          status?: Database["public"]["Enums"]["bot_response_status"]
          timeout_horas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_response_tracking_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_monitor: {
        Row: {
          atual: number
          atual_nome: string | null
          atual_telefone: string | null
          atualizado_em: string
          automation_id: string | null
          bot_flow_id: string | null
          enviados: number
          erro: string | null
          estabelecimento_id: string
          falhas: number
          finalizado_em: string | null
          id: string
          iniciado_em: string
          invalidos: number
          mensagem_base: string | null
          origem: string | null
          pausado_em: string | null
          pulados: number
          status: string
          total: number
        }
        Insert: {
          atual?: number
          atual_nome?: string | null
          atual_telefone?: string | null
          atualizado_em?: string
          automation_id?: string | null
          bot_flow_id?: string | null
          enviados?: number
          erro?: string | null
          estabelecimento_id: string
          falhas?: number
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          invalidos?: number
          mensagem_base?: string | null
          origem?: string | null
          pausado_em?: string | null
          pulados?: number
          status?: string
          total?: number
        }
        Update: {
          atual?: number
          atual_nome?: string | null
          atual_telefone?: string | null
          atualizado_em?: string
          automation_id?: string | null
          bot_flow_id?: string | null
          enviados?: number
          erro?: string | null
          estabelecimento_id?: string
          falhas?: number
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          invalidos?: number
          mensagem_base?: string | null
          origem?: string | null
          pausado_em?: string | null
          pulados?: number
          status?: string
          total?: number
        }
        Relationships: []
      }
      broadcast_monitor_itens: {
        Row: {
          created_at: string
          estabelecimento_id: string
          id: string
          mensagem: string | null
          monitor_id: string
          motivo: string | null
          nome: string | null
          ordem: number
          status: string
          telefone: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          mensagem?: string | null
          monitor_id: string
          motivo?: string | null
          nome?: string | null
          ordem?: number
          status?: string
          telefone?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          mensagem?: string | null
          monitor_id?: string
          motivo?: string | null
          nome?: string | null
          ordem?: number
          status?: string
          telefone?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_monitor_itens_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "broadcast_monitor"
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
      cameras_grupos: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          setor: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          setor?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          setor?: string | null
          updated_at?: string
        }
        Relationships: []
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
          ativo: boolean
          created_at: string | null
          estabelecimento_id: string
          id: string
          telegram_enabled: boolean | null
          updated_at: string | null
          webchat_enabled: boolean | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          estabelecimento_id: string
          id?: string
          telegram_enabled?: boolean | null
          updated_at?: string | null
          webchat_enabled?: boolean | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          ativo?: boolean
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
          pdf_generated_at: string | null
          pdf_url: string | null
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
          pdf_generated_at?: string | null
          pdf_url?: string | null
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
          pdf_generated_at?: string | null
          pdf_url?: string | null
          products_page?: Json | null
          thumbnail?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_agent_custom_fields: {
        Row: {
          agent_id: string
          ativo: boolean
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          id: string
          nome: string
          obrigatorio: boolean
          opcoes: string[] | null
          ordem: number
          tipo: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
          obrigatorio?: boolean
          opcoes?: string[] | null
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
          obrigatorio?: boolean
          opcoes?: string[] | null
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_agent_custom_fields_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "chat_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_agent_custom_fields_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
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
          escopo_agente: string | null
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
          regra_mesclagem: string | null
          regra_mesclagem_ativa: boolean
          regra_sugestao_ativa: boolean
          regra_sugestao_proativa: string | null
          regras_busca_personalizada: string | null
          resposta_formato_tabela: boolean
          restringir_base_conhecimento: boolean
          solicitar_cnpj: boolean | null
          sub_agent_ids: string[] | null
          system_prompt: string
          tipo_agente: string
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
          escopo_agente?: string | null
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
          regra_mesclagem?: string | null
          regra_mesclagem_ativa?: boolean
          regra_sugestao_ativa?: boolean
          regra_sugestao_proativa?: string | null
          regras_busca_personalizada?: string | null
          resposta_formato_tabela?: boolean
          restringir_base_conhecimento?: boolean
          solicitar_cnpj?: boolean | null
          sub_agent_ids?: string[] | null
          system_prompt?: string
          tipo_agente?: string
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
          escopo_agente?: string | null
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
          regra_mesclagem?: string | null
          regra_mesclagem_ativa?: boolean
          regra_sugestao_ativa?: boolean
          regra_sugestao_proativa?: string | null
          regras_busca_personalizada?: string | null
          resposta_formato_tabela?: boolean
          restringir_base_conhecimento?: boolean
          solicitar_cnpj?: boolean | null
          sub_agent_ids?: string[] | null
          system_prompt?: string
          tipo_agente?: string
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
      coletor_dispositivos: {
        Row: {
          comando: string | null
          comando_resultado: string | null
          comando_solicitado_em: string | null
          comando_status: string
          created_at: string
          device_key: string
          estabelecimento_id: string | null
          hostname: string | null
          id: string
          plataforma: string | null
          ultimo_contato: string
          unidade_id: string | null
          unidade_nome: string | null
          updated_at: string
          versao: string | null
        }
        Insert: {
          comando?: string | null
          comando_resultado?: string | null
          comando_solicitado_em?: string | null
          comando_status?: string
          created_at?: string
          device_key: string
          estabelecimento_id?: string | null
          hostname?: string | null
          id?: string
          plataforma?: string | null
          ultimo_contato?: string
          unidade_id?: string | null
          unidade_nome?: string | null
          updated_at?: string
          versao?: string | null
        }
        Update: {
          comando?: string | null
          comando_resultado?: string | null
          comando_solicitado_em?: string | null
          comando_status?: string
          created_at?: string
          device_key?: string
          estabelecimento_id?: string | null
          hostname?: string | null
          id?: string
          plataforma?: string | null
          ultimo_contato?: string
          unidade_id?: string | null
          unidade_nome?: string | null
          updated_at?: string
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coletor_dispositivos_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coletor_dispositivos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
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
      contagens: {
        Row: {
          bounding_boxes: Json | null
          confianca_media: number | null
          created_at: string
          data_analise: string | null
          divergencia: boolean | null
          estabelecimento_id: string
          id: string
          imagem_original_url: string | null
          imagem_url: string | null
          observacoes: string | null
          quantidade_detectada: number | null
          quantidade_esperada: number | null
          resultado_url: string | null
          status: string
          tipo_objeto: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          bounding_boxes?: Json | null
          confianca_media?: number | null
          created_at?: string
          data_analise?: string | null
          divergencia?: boolean | null
          estabelecimento_id: string
          id?: string
          imagem_original_url?: string | null
          imagem_url?: string | null
          observacoes?: string | null
          quantidade_detectada?: number | null
          quantidade_esperada?: number | null
          resultado_url?: string | null
          status?: string
          tipo_objeto?: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          bounding_boxes?: Json | null
          confianca_media?: number | null
          created_at?: string
          data_analise?: string | null
          divergencia?: boolean | null
          estabelecimento_id?: string
          id?: string
          imagem_original_url?: string | null
          imagem_url?: string | null
          observacoes?: string | null
          quantidade_detectada?: number | null
          quantidade_esperada?: number | null
          resultado_url?: string | null
          status?: string
          tipo_objeto?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contagens_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contagens_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
          whatsapp_numero_id: string | null
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
          whatsapp_numero_id?: string | null
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
          whatsapp_numero_id?: string | null
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
          {
            foreignKeyName: "conversations_whatsapp_numero_id_fkey"
            columns: ["whatsapp_numero_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numeros"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_health: {
        Row: {
          created_at: string
          id: string
          poller: string
          total_runs: number
          ultimo_detalhes: Json | null
          ultimo_run_em: string | null
          ultimo_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          poller: string
          total_runs?: number
          ultimo_detalhes?: Json | null
          ultimo_run_em?: string | null
          ultimo_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          poller?: string
          total_runs?: number
          ultimo_detalhes?: Json | null
          ultimo_run_em?: string | null
          ultimo_status?: string | null
          updated_at?: string
        }
        Relationships: []
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
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          created_at: string | null
          custom_fields: Json | null
          data_nascimento: string | null
          email: string
          empresa_id: string | null
          estabelecimento_id: string | null
          estado: string | null
          id: string
          logradouro: string | null
          nome: string
          numero: string | null
          tags: string[] | null
          tel: string | null
          telefone: string
          tipo_operador: boolean | null
          whatsapp_status: Database["public"]["Enums"]["whatsapp_status_enum"]
          whatsapp_status_at: string | null
          whatsapp_status_reason: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          data_nascimento?: string | null
          email: string
          empresa_id?: string | null
          estabelecimento_id?: string | null
          estado?: string | null
          id?: string
          logradouro?: string | null
          nome: string
          numero?: string | null
          tags?: string[] | null
          tel?: string | null
          telefone: string
          tipo_operador?: boolean | null
          whatsapp_status?: Database["public"]["Enums"]["whatsapp_status_enum"]
          whatsapp_status_at?: string | null
          whatsapp_status_reason?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          data_nascimento?: string | null
          email?: string
          empresa_id?: string | null
          estabelecimento_id?: string | null
          estado?: string | null
          id?: string
          logradouro?: string | null
          nome?: string
          numero?: string | null
          tags?: string[] | null
          tel?: string | null
          telefone?: string
          tipo_operador?: boolean | null
          whatsapp_status?: Database["public"]["Enums"]["whatsapp_status_enum"]
          whatsapp_status_at?: string | null
          whatsapp_status_reason?: string | null
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
      cv_cameras: {
        Row: {
          angulo_key: string
          ativo: boolean
          coletor_id: string | null
          created_at: string
          estabelecimento_id: string | null
          filial_id: string | null
          grupo_id: string | null
          host: string
          id: string
          local_descricao: string | null
          marca: string
          modelo: string | null
          modo_manual: boolean
          nome: string
          onvif_pass: string | null
          onvif_porta: number | null
          onvif_user: string | null
          porta: number | null
          protocolo: string
          ptz_velocidade_padrao: number
          rtsp_pass: string | null
          rtsp_path: string | null
          rtsp_porta: number | null
          rtsp_transporte: string | null
          rtsp_user: string | null
          senha: string | null
          snapshot_path: string | null
          tem_audio: boolean
          tem_ptz: boolean
          tipo_rede: string
          ultima_verificacao: string | null
          ultimo_erro: string | null
          ultimo_status: string | null
          updated_at: string
          usuario: string | null
          vehicle_id: string | null
        }
        Insert: {
          angulo_key: string
          ativo?: boolean
          coletor_id?: string | null
          created_at?: string
          estabelecimento_id?: string | null
          filial_id?: string | null
          grupo_id?: string | null
          host: string
          id?: string
          local_descricao?: string | null
          marca: string
          modelo?: string | null
          modo_manual?: boolean
          nome: string
          onvif_pass?: string | null
          onvif_porta?: number | null
          onvif_user?: string | null
          porta?: number | null
          protocolo?: string
          ptz_velocidade_padrao?: number
          rtsp_pass?: string | null
          rtsp_path?: string | null
          rtsp_porta?: number | null
          rtsp_transporte?: string | null
          rtsp_user?: string | null
          senha?: string | null
          snapshot_path?: string | null
          tem_audio?: boolean
          tem_ptz?: boolean
          tipo_rede?: string
          ultima_verificacao?: string | null
          ultimo_erro?: string | null
          ultimo_status?: string | null
          updated_at?: string
          usuario?: string | null
          vehicle_id?: string | null
        }
        Update: {
          angulo_key?: string
          ativo?: boolean
          coletor_id?: string | null
          created_at?: string
          estabelecimento_id?: string | null
          filial_id?: string | null
          grupo_id?: string | null
          host?: string
          id?: string
          local_descricao?: string | null
          marca?: string
          modelo?: string | null
          modo_manual?: boolean
          nome?: string
          onvif_pass?: string | null
          onvif_porta?: number | null
          onvif_user?: string | null
          porta?: number | null
          protocolo?: string
          ptz_velocidade_padrao?: number
          rtsp_pass?: string | null
          rtsp_path?: string | null
          rtsp_porta?: number | null
          rtsp_transporte?: string | null
          rtsp_user?: string | null
          senha?: string | null
          snapshot_path?: string | null
          tem_audio?: boolean
          tem_ptz?: boolean
          tipo_rede?: string
          ultima_verificacao?: string | null
          ultimo_erro?: string | null
          ultimo_status?: string | null
          updated_at?: string
          usuario?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cv_cameras_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_cameras_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "cameras_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_cameras_unidade_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_cameras_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "cv_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_coletor_config: {
        Row: {
          cameras_habilitado: boolean
          created_at: string
          estabelecimento_id: string | null
          id: string
          intervalo_poll_segundos: number
          ponto_habilitado: boolean
          updated_at: string
        }
        Insert: {
          cameras_habilitado?: boolean
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          intervalo_poll_segundos?: number
          ponto_habilitado?: boolean
          updated_at?: string
        }
        Update: {
          cameras_habilitado?: boolean
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          intervalo_poll_segundos?: number
          ponto_habilitado?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_coletor_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_defect_reports: {
        Row: {
          agrupavel: boolean
          cost: number | null
          created_at: string
          damage_points: Json | null
          data_baixa: string | null
          defect_description: string
          defect_type_id: string | null
          driver_id: string | null
          estabelecimento_id: string | null
          id: string
          is_damage_report: boolean
          km_baixa: number | null
          maintenance_plan_id: string | null
          movement_id: string | null
          pecas: string | null
          prioridade: string
          reported_at: string
          reported_by: string | null
          resolved_at: string | null
          resolved_by: string | null
          solution: string | null
          status: Database["public"]["Enums"]["cv_defect_status"]
          updated_at: string
          validated_by: string | null
          vehicle_id: string
          vehicle_km: number | null
        }
        Insert: {
          agrupavel?: boolean
          cost?: number | null
          created_at?: string
          damage_points?: Json | null
          data_baixa?: string | null
          defect_description: string
          defect_type_id?: string | null
          driver_id?: string | null
          estabelecimento_id?: string | null
          id?: string
          is_damage_report?: boolean
          km_baixa?: number | null
          maintenance_plan_id?: string | null
          movement_id?: string | null
          pecas?: string | null
          prioridade?: string
          reported_at?: string
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          solution?: string | null
          status?: Database["public"]["Enums"]["cv_defect_status"]
          updated_at?: string
          validated_by?: string | null
          vehicle_id: string
          vehicle_km?: number | null
        }
        Update: {
          agrupavel?: boolean
          cost?: number | null
          created_at?: string
          damage_points?: Json | null
          data_baixa?: string | null
          defect_description?: string
          defect_type_id?: string | null
          driver_id?: string | null
          estabelecimento_id?: string | null
          id?: string
          is_damage_report?: boolean
          km_baixa?: number | null
          maintenance_plan_id?: string | null
          movement_id?: string | null
          pecas?: string | null
          prioridade?: string
          reported_at?: string
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          solution?: string | null
          status?: Database["public"]["Enums"]["cv_defect_status"]
          updated_at?: string
          validated_by?: string | null
          vehicle_id?: string
          vehicle_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cv_defect_reports_defect_type_id_fkey"
            columns: ["defect_type_id"]
            isOneToOne: false
            referencedRelation: "cv_defect_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_defect_reports_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "cv_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_defect_reports_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_defect_reports_maintenance_plan_id_fkey"
            columns: ["maintenance_plan_id"]
            isOneToOne: false
            referencedRelation: "cv_maintenance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_defect_reports_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "cv_vehicle_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_defect_reports_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "cv_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_defect_types: {
        Row: {
          category: Database["public"]["Enums"]["cv_defect_category"]
          created_at: string
          description: string | null
          estabelecimento_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["cv_defect_category"]
          created_at?: string
          description?: string | null
          estabelecimento_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["cv_defect_category"]
          created_at?: string
          description?: string | null
          estabelecimento_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_defect_types_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_drivers: {
        Row: {
          active: boolean
          created_at: string
          estabelecimento_id: string | null
          id: string
          license: string
          logistica_grupo_id: string | null
          name: string
          phone: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          license: string
          logistica_grupo_id?: string | null
          name: string
          phone?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          license?: string
          logistica_grupo_id?: string | null
          name?: string
          phone?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_drivers_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_drivers_logistica_grupo_id_fkey"
            columns: ["logistica_grupo_id"]
            isOneToOne: false
            referencedRelation: "logistica_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_drivers_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_helpers: {
        Row: {
          active: boolean
          created_at: string
          document: string | null
          estabelecimento_id: string | null
          id: string
          name: string
          phone: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          document?: string | null
          estabelecimento_id?: string | null
          id?: string
          name: string
          phone?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          document?: string | null
          estabelecimento_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_helpers_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_inspection_config: {
        Row: {
          active: boolean
          created_at: string
          entry_ai_analysis: boolean
          entry_photos: Json
          entry_photos_required: boolean
          estabelecimento_id: string | null
          exit_ai_analysis: boolean
          exit_photos: Json
          exit_photos_required: boolean
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          entry_ai_analysis?: boolean
          entry_photos?: Json
          entry_photos_required?: boolean
          estabelecimento_id?: string | null
          exit_ai_analysis?: boolean
          exit_photos?: Json
          exit_photos_required?: boolean
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          entry_ai_analysis?: boolean
          entry_photos?: Json
          entry_photos_required?: boolean
          estabelecimento_id?: string | null
          exit_ai_analysis?: boolean
          exit_photos?: Json
          exit_photos_required?: boolean
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_inspection_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_maintenance_catalog: {
        Row: {
          acao: string
          ativo: boolean
          codigo: string | null
          componente: string
          created_at: string
          criticidade: string
          estabelecimento_id: string | null
          fabricante: string | null
          id: string
          interval_days: number | null
          interval_principal: number | null
          no_roteiro: boolean
          observacoes: string | null
          pecas: string | null
          regra: string
          sistema: string
          tipo_veiculo: string
          tol_days: number
          tol_principal: number
          updated_at: string
        }
        Insert: {
          acao: string
          ativo?: boolean
          codigo?: string | null
          componente: string
          created_at?: string
          criticidade?: string
          estabelecimento_id?: string | null
          fabricante?: string | null
          id?: string
          interval_days?: number | null
          interval_principal?: number | null
          no_roteiro?: boolean
          observacoes?: string | null
          pecas?: string | null
          regra?: string
          sistema: string
          tipo_veiculo: string
          tol_days?: number
          tol_principal?: number
          updated_at?: string
        }
        Update: {
          acao?: string
          ativo?: boolean
          codigo?: string | null
          componente?: string
          created_at?: string
          criticidade?: string
          estabelecimento_id?: string | null
          fabricante?: string | null
          id?: string
          interval_days?: number | null
          interval_principal?: number | null
          no_roteiro?: boolean
          observacoes?: string | null
          pecas?: string | null
          regra?: string
          sistema?: string
          tipo_veiculo?: string
          tol_days?: number
          tol_principal?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_maintenance_catalog_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_maintenance_checklist: {
        Row: {
          catalog_item_id: string | null
          created_at: string
          criticidade: string | null
          defect_report_id: string
          descricao: string
          done_at: string | null
          done_by: string | null
          estabelecimento_id: string | null
          feito: boolean | null
          id: string
          observacao: string | null
          ordem: number
          pecas: string | null
          plan_id: string | null
          updated_at: string
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string
          criticidade?: string | null
          defect_report_id: string
          descricao: string
          done_at?: string | null
          done_by?: string | null
          estabelecimento_id?: string | null
          feito?: boolean | null
          id?: string
          observacao?: string | null
          ordem?: number
          pecas?: string | null
          plan_id?: string | null
          updated_at?: string
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string
          criticidade?: string | null
          defect_report_id?: string
          descricao?: string
          done_at?: string | null
          done_by?: string | null
          estabelecimento_id?: string | null
          feito?: boolean | null
          id?: string
          observacao?: string | null
          ordem?: number
          pecas?: string | null
          plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_maintenance_checklist_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "cv_maintenance_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_maintenance_checklist_defect_report_id_fkey"
            columns: ["defect_report_id"]
            isOneToOne: false
            referencedRelation: "cv_defect_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_maintenance_checklist_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_maintenance_checklist_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cv_maintenance_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_maintenance_plans: {
        Row: {
          active: boolean
          alert_days_antecedencia: number
          alert_km_antecedencia: number
          catalog_item_id: string | null
          created_at: string
          estabelecimento_id: string | null
          id: string
          interval_days: number | null
          interval_km: number | null
          last_done_at: string
          last_done_km: number
          name: string
          origem: string
          pecas: string | null
          tipo: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          active?: boolean
          alert_days_antecedencia?: number
          alert_km_antecedencia?: number
          catalog_item_id?: string | null
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          interval_days?: number | null
          interval_km?: number | null
          last_done_at?: string
          last_done_km?: number
          name: string
          origem?: string
          pecas?: string | null
          tipo?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          active?: boolean
          alert_days_antecedencia?: number
          alert_km_antecedencia?: number
          catalog_item_id?: string | null
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          interval_days?: number | null
          interval_km?: number | null
          last_done_at?: string
          last_done_km?: number
          name?: string
          origem?: string
          pecas?: string | null
          tipo?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_maintenance_plans_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "cv_maintenance_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_maintenance_plans_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_maintenance_plans_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "cv_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_movement_photos: {
        Row: {
          angle_key: string
          angle_label: string
          caption: string | null
          created_at: string
          created_by: string | null
          id: string
          is_extra: boolean
          movement_id: string
          photo_url: string
          stage: string
        }
        Insert: {
          angle_key: string
          angle_label: string
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_extra?: boolean
          movement_id: string
          photo_url: string
          stage: string
        }
        Update: {
          angle_key?: string
          angle_label?: string
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_extra?: boolean
          movement_id?: string
          photo_url?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_movement_photos_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "cv_vehicle_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_vehicle_movements: {
        Row: {
          created_at: string
          damage_notes: string | null
          driver_id: string
          entry_km: number | null
          entry_time: string | null
          estabelecimento_id: string | null
          exit_km: number
          exit_notes: string | null
          exit_time: string
          has_helper: boolean
          helper_id: string | null
          helper_name: string | null
          id: string
          inspected_all_sides: boolean
          inspected_by: string | null
          porteiro_entrada_id: string | null
          porteiro_entrada_nome: string | null
          porteiro_saida_id: string | null
          porteiro_saida_nome: string | null
          reported_defects: string | null
          resolved_at: string | null
          security_guard_id: string | null
          status: Database["public"]["Enums"]["cv_movement_status"]
          unidade_id: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          damage_notes?: string | null
          driver_id: string
          entry_km?: number | null
          entry_time?: string | null
          estabelecimento_id?: string | null
          exit_km?: number
          exit_notes?: string | null
          exit_time?: string
          has_helper?: boolean
          helper_id?: string | null
          helper_name?: string | null
          id?: string
          inspected_all_sides?: boolean
          inspected_by?: string | null
          porteiro_entrada_id?: string | null
          porteiro_entrada_nome?: string | null
          porteiro_saida_id?: string | null
          porteiro_saida_nome?: string | null
          reported_defects?: string | null
          resolved_at?: string | null
          security_guard_id?: string | null
          status?: Database["public"]["Enums"]["cv_movement_status"]
          unidade_id?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          damage_notes?: string | null
          driver_id?: string
          entry_km?: number | null
          entry_time?: string | null
          estabelecimento_id?: string | null
          exit_km?: number
          exit_notes?: string | null
          exit_time?: string
          has_helper?: boolean
          helper_id?: string | null
          helper_name?: string | null
          id?: string
          inspected_all_sides?: boolean
          inspected_by?: string | null
          porteiro_entrada_id?: string | null
          porteiro_entrada_nome?: string | null
          porteiro_saida_id?: string | null
          porteiro_saida_nome?: string | null
          reported_defects?: string | null
          resolved_at?: string | null
          security_guard_id?: string | null
          status?: Database["public"]["Enums"]["cv_movement_status"]
          unidade_id?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_vehicle_movements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "cv_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_vehicle_movements_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_vehicle_movements_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "cv_helpers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_vehicle_movements_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_vehicle_movements_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "cv_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_vehicles: {
        Row: {
          active: boolean
          created_at: string
          current_km: number
          estabelecimento_id: string | null
          fleet_type: string | null
          id: string
          last_oil_change_km: number
          logistica_grupo_id: string | null
          name: string
          next_oil_change_km: number
          oil_change_interval: number
          plate: string
          unidade_id: string | null
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["cv_vehicle_type"]
          veiculo_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_km?: number
          estabelecimento_id?: string | null
          fleet_type?: string | null
          id?: string
          last_oil_change_km?: number
          logistica_grupo_id?: string | null
          name: string
          next_oil_change_km?: number
          oil_change_interval?: number
          plate: string
          unidade_id?: string | null
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["cv_vehicle_type"]
          veiculo_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          current_km?: number
          estabelecimento_id?: string | null
          fleet_type?: string | null
          id?: string
          last_oil_change_km?: number
          logistica_grupo_id?: string | null
          name?: string
          next_oil_change_km?: number
          oil_change_interval?: number
          plate?: string
          unidade_id?: string | null
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["cv_vehicle_type"]
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cv_vehicles_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_vehicles_logistica_grupo_id_fkey"
            columns: ["logistica_grupo_id"]
            isOneToOne: false
            referencedRelation: "logistica_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_vehicles_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_vehicles_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
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
          usuario_id: string | null
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
          usuario_id?: string | null
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
          usuario_id?: string | null
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
            foreignKeyName: "dispositivos_rastreamento_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
      doc_assinaturas: {
        Row: {
          content_html: string
          created_at: string
          estabelecimento_id: string
          id: string
          padrao: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          content_html?: string
          created_at?: string
          estabelecimento_id: string
          id?: string
          padrao?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          content_html?: string
          created_at?: string
          estabelecimento_id?: string
          id?: string
          padrao?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      doc_campos: {
        Row: {
          categoria: string | null
          chave: string
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          formato: string | null
          id: string
          origem_coluna: string | null
          origem_tabela: string | null
          personalizado: boolean
          rotulo: string
          tipo: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          chave: string
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          formato?: string | null
          id?: string
          origem_coluna?: string | null
          origem_tabela?: string | null
          personalizado?: boolean
          rotulo: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          chave?: string
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          formato?: string | null
          id?: string
          origem_coluna?: string | null
          origem_tabela?: string | null
          personalizado?: boolean
          rotulo?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      doc_categorias: {
        Row: {
          cor: string | null
          created_at: string
          estabelecimento_id: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          estabelecimento_id: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          estabelecimento_id?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      doc_form_fields: {
        Row: {
          coluna: string | null
          created_at: string
          estabelecimento_id: string
          fonte: string
          id: string
          label: string
          opcoes: string[]
          tabela: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          coluna?: string | null
          created_at?: string
          estabelecimento_id: string
          fonte?: string
          id?: string
          label: string
          opcoes?: string[]
          tabela?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          coluna?: string | null
          created_at?: string
          estabelecimento_id?: string
          fonte?: string
          id?: string
          label?: string
          opcoes?: string[]
          tabela?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      doc_gerados: {
        Row: {
          content_html: string | null
          content_html_final: string
          content_json: Json | null
          created_at: string
          dados_merge: Json | null
          estabelecimento_id: string
          gerado_por: string | null
          id: string
          merge_config: Json
          modelo_id: string | null
          modelo_versao: number | null
          numero_documento: string | null
          observacoes: string | null
          registro_id: string | null
          registro_tipo: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          content_html?: string | null
          content_html_final?: string
          content_json?: Json | null
          created_at?: string
          dados_merge?: Json | null
          estabelecimento_id: string
          gerado_por?: string | null
          id?: string
          merge_config?: Json
          modelo_id?: string | null
          modelo_versao?: number | null
          numero_documento?: string | null
          observacoes?: string | null
          registro_id?: string | null
          registro_tipo?: string | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          content_html?: string | null
          content_html_final?: string
          content_json?: Json | null
          created_at?: string
          dados_merge?: Json | null
          estabelecimento_id?: string
          gerado_por?: string | null
          id?: string
          merge_config?: Json
          modelo_id?: string | null
          modelo_versao?: number | null
          numero_documento?: string | null
          observacoes?: string | null
          registro_id?: string | null
          registro_tipo?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_gerados_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "doc_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_modelo_versoes: {
        Row: {
          content_html: string | null
          content_json: Json | null
          created_at: string
          criado_por: string | null
          estabelecimento_id: string
          footer_html: string | null
          header_html: string | null
          id: string
          modelo_id: string
          notas: string | null
          versao: number
        }
        Insert: {
          content_html?: string | null
          content_json?: Json | null
          created_at?: string
          criado_por?: string | null
          estabelecimento_id: string
          footer_html?: string | null
          header_html?: string | null
          id?: string
          modelo_id: string
          notas?: string | null
          versao: number
        }
        Update: {
          content_html?: string | null
          content_json?: Json | null
          created_at?: string
          criado_por?: string | null
          estabelecimento_id?: string
          footer_html?: string | null
          header_html?: string | null
          id?: string
          modelo_id?: string
          notas?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "doc_modelo_versoes_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "doc_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_modelos: {
        Row: {
          ativo: boolean
          bloqueado: boolean
          campos_bloqueados: boolean
          categoria_id: string | null
          content_html: string | null
          content_json: Json | null
          created_at: string
          created_by: string | null
          descricao: string | null
          estabelecimento_id: string
          footer_html: string | null
          header_html: string | null
          id: string
          is_modelo: boolean
          merge_config: Json
          owner_user_id: string | null
          page_size: string | null
          titulo: string
          updated_at: string
          updated_by: string | null
          versao_atual: number
        }
        Insert: {
          ativo?: boolean
          bloqueado?: boolean
          campos_bloqueados?: boolean
          categoria_id?: string | null
          content_html?: string | null
          content_json?: Json | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          estabelecimento_id: string
          footer_html?: string | null
          header_html?: string | null
          id?: string
          is_modelo?: boolean
          merge_config?: Json
          owner_user_id?: string | null
          page_size?: string | null
          titulo: string
          updated_at?: string
          updated_by?: string | null
          versao_atual?: number
        }
        Update: {
          ativo?: boolean
          bloqueado?: boolean
          campos_bloqueados?: boolean
          categoria_id?: string | null
          content_html?: string | null
          content_json?: Json | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          footer_html?: string | null
          header_html?: string | null
          id?: string
          is_modelo?: boolean
          merge_config?: Json
          owner_user_id?: string | null
          page_size?: string | null
          titulo?: string
          updated_at?: string
          updated_by?: string | null
          versao_atual?: number
        }
        Relationships: [
          {
            foreignKeyName: "doc_modelos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "doc_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_modelos_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_permissoes: {
        Row: {
          created_at: string
          estabelecimento_id: string
          id: string
          pode_criar_modelo: boolean
          pode_editar_modelo: boolean
          pode_excluir_modelo: boolean
          pode_gerar: boolean
          pode_ver_gerados: boolean
          pode_ver_historico: boolean
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          pode_criar_modelo?: boolean
          pode_editar_modelo?: boolean
          pode_excluir_modelo?: boolean
          pode_gerar?: boolean
          pode_ver_gerados?: boolean
          pode_ver_historico?: boolean
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          pode_criar_modelo?: boolean
          pode_editar_modelo?: boolean
          pode_excluir_modelo?: boolean
          pode_gerar?: boolean
          pode_ver_gerados?: boolean
          pode_ver_historico?: boolean
          updated_at?: string
          usuario_id?: string
        }
        Relationships: []
      }
      ecom_active_carts: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_phone: string | null
          estabelecimento_id: string
          id: string
          item_count: number
          items: Json
          last_activity_at: string
          recovery_triggered_at: string | null
          session_id: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          estabelecimento_id: string
          id?: string
          item_count?: number
          items?: Json
          last_activity_at?: string
          recovery_triggered_at?: string | null
          session_id: string
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          estabelecimento_id?: string
          id?: string
          item_count?: number
          items?: Json
          last_activity_at?: string
          recovery_triggered_at?: string | null
          session_id?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      ecom_usage_events: {
        Row: {
          created_at: string
          customer_id: string | null
          duration_ms: number
          estabelecimento_id: string
          event_type: string
          id: string
          metadata: Json | null
          page_title: string | null
          product_id: string | null
          route: string
          session_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          duration_ms?: number
          estabelecimento_id: string
          event_type?: string
          id?: string
          metadata?: Json | null
          page_title?: string | null
          product_id?: string | null
          route: string
          session_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          duration_ms?: number
          estabelecimento_id?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          page_title?: string | null
          product_id?: string | null
          route?: string
          session_id?: string
        }
        Relationships: []
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
          denuncias_config: Json
          denuncias_enabled: boolean
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
          lgpd_config: Json
          lgpd_enabled: boolean
          logo_url: string | null
          modo_catalogo: boolean
          modo_catalogo_b2b: boolean | null
          modo_catalogo_b2c: boolean | null
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
          denuncias_config?: Json
          denuncias_enabled?: boolean
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
          lgpd_config?: Json
          lgpd_enabled?: boolean
          logo_url?: string | null
          modo_catalogo?: boolean
          modo_catalogo_b2b?: boolean | null
          modo_catalogo_b2c?: boolean | null
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
          denuncias_config?: Json
          denuncias_enabled?: boolean
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
          lgpd_config?: Json
          lgpd_enabled?: boolean
          logo_url?: string | null
          modo_catalogo?: boolean
          modo_catalogo_b2b?: boolean | null
          modo_catalogo_b2c?: boolean | null
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
      ecommerce_config_privado: {
        Row: {
          created_at: string
          denuncias_email_destino: string | null
          estabelecimento_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          denuncias_email_destino?: string | null
          estabelecimento_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          denuncias_email_destino?: string | null
          estabelecimento_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_config_privado_estabelecimento_id_fkey"
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
      ecommerce_denuncias: {
        Row: {
          anonimo: boolean
          categoria: string | null
          created_at: string
          data_ocorrencia: string | null
          descricao: string
          email: string | null
          estabelecimento_id: string
          id: string
          local_ocorrencia: string | null
          nome: string | null
          respondido_em: string | null
          resposta_interna: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          anonimo?: boolean
          categoria?: string | null
          created_at?: string
          data_ocorrencia?: string | null
          descricao: string
          email?: string | null
          estabelecimento_id: string
          id?: string
          local_ocorrencia?: string | null
          nome?: string | null
          respondido_em?: string | null
          resposta_interna?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          anonimo?: boolean
          categoria?: string | null
          created_at?: string
          data_ocorrencia?: string | null
          descricao?: string
          email?: string | null
          estabelecimento_id?: string
          id?: string
          local_ocorrencia?: string | null
          nome?: string | null
          respondido_em?: string | null
          resposta_interna?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
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
          auto_via_vendedor_id: string | null
          created_at: string | null
          empresa_id: string
          estabelecimento_id: string
          id: string
          segmento_id: string | null
          transportadora_id: string | null
          updated_at: string | null
          usuario_id: string | null
          vendedor_id: string | null
        }
        Insert: {
          auto_via_vendedor_id?: string | null
          created_at?: string | null
          empresa_id: string
          estabelecimento_id: string
          id?: string
          segmento_id?: string | null
          transportadora_id?: string | null
          updated_at?: string | null
          usuario_id?: string | null
          vendedor_id?: string | null
        }
        Update: {
          auto_via_vendedor_id?: string | null
          created_at?: string | null
          empresa_id?: string
          estabelecimento_id?: string
          id?: string
          segmento_id?: string | null
          transportadora_id?: string | null
          updated_at?: string | null
          usuario_id?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_vinculos_auto_via_vendedor_id_fkey"
            columns: ["auto_via_vendedor_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "empresa_vinculos_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_vinculos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_vinculos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean
          bairro: string | null
          capital_social: number | null
          cep: string | null
          cidade: string | null
          cnae_descricao: string | null
          cnae_principal: string | null
          cnaes_secundarios: string[] | null
          cnpj: string | null
          complemento: string | null
          contato_cargo: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string | null
          custom_fields: Json | null
          data_fundacao: string | null
          email: string | null
          emails_vinculados: string[] | null
          endereco: string | null
          estabelecimento_id: string | null
          estado: string | null
          faturamento_estimado: string | null
          funcionarios_estimado: string | null
          id: string
          ja_respondeu_whatsapp: boolean
          latitude: number | null
          longitude: number | null
          natureza_juridica: string | null
          nome: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes_internas: string | null
          optante_mei: boolean | null
          optante_simples: boolean | null
          origem_prospeccao: string | null
          pais: string | null
          porte: string | null
          prioridade: string | null
          produtos_interesse: Json | null
          regime_tributario: string | null
          score_motivo: string | null
          score_prospect: number | null
          segmento_id: string | null
          site: string | null
          situacao_cadastral: string | null
          status_comercial: string
          tags: string[] | null
          telefone: string | null
          tipo_cliente: string
          ultima_resposta_bot_em: string | null
          ultima_resposta_bot_nome: string | null
          updated_at: string | null
          whatsapp: string | null
          whatsapp_status: Database["public"]["Enums"]["whatsapp_status_enum"]
          whatsapp_status_at: string | null
          whatsapp_status_reason: string | null
          whatsapps_vinculados: string[] | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cidade?: string | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnaes_secundarios?: string[] | null
          cnpj?: string | null
          complemento?: string | null
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          data_fundacao?: string | null
          email?: string | null
          emails_vinculados?: string[] | null
          endereco?: string | null
          estabelecimento_id?: string | null
          estado?: string | null
          faturamento_estimado?: string | null
          funcionarios_estimado?: string | null
          id?: string
          ja_respondeu_whatsapp?: boolean
          latitude?: number | null
          longitude?: number | null
          natureza_juridica?: string | null
          nome?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes_internas?: string | null
          optante_mei?: boolean | null
          optante_simples?: boolean | null
          origem_prospeccao?: string | null
          pais?: string | null
          porte?: string | null
          prioridade?: string | null
          produtos_interesse?: Json | null
          regime_tributario?: string | null
          score_motivo?: string | null
          score_prospect?: number | null
          segmento_id?: string | null
          site?: string | null
          situacao_cadastral?: string | null
          status_comercial?: string
          tags?: string[] | null
          telefone?: string | null
          tipo_cliente?: string
          ultima_resposta_bot_em?: string | null
          ultima_resposta_bot_nome?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          whatsapp_status?: Database["public"]["Enums"]["whatsapp_status_enum"]
          whatsapp_status_at?: string | null
          whatsapp_status_reason?: string | null
          whatsapps_vinculados?: string[] | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cidade?: string | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnaes_secundarios?: string[] | null
          cnpj?: string | null
          complemento?: string | null
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          data_fundacao?: string | null
          email?: string | null
          emails_vinculados?: string[] | null
          endereco?: string | null
          estabelecimento_id?: string | null
          estado?: string | null
          faturamento_estimado?: string | null
          funcionarios_estimado?: string | null
          id?: string
          ja_respondeu_whatsapp?: boolean
          latitude?: number | null
          longitude?: number | null
          natureza_juridica?: string | null
          nome?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes_internas?: string | null
          optante_mei?: boolean | null
          optante_simples?: boolean | null
          origem_prospeccao?: string | null
          pais?: string | null
          porte?: string | null
          prioridade?: string | null
          produtos_interesse?: Json | null
          regime_tributario?: string | null
          score_motivo?: string | null
          score_prospect?: number | null
          segmento_id?: string | null
          site?: string | null
          situacao_cadastral?: string | null
          status_comercial?: string
          tags?: string[] | null
          telefone?: string | null
          tipo_cliente?: string
          ultima_resposta_bot_em?: string | null
          ultima_resposta_bot_nome?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          whatsapp_status?: Database["public"]["Enums"]["whatsapp_status_enum"]
          whatsapp_status_at?: string | null
          whatsapp_status_reason?: string | null
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
      ferr_companies: {
        Row: {
          approved_until: string | null
          cnpj: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          trial_ends_at: string | null
          updated_at: string
          user_limit: number
        }
        Insert: {
          approved_until?: string | null
          cnpj: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          trial_ends_at?: string | null
          updated_at?: string
          user_limit?: number
        }
        Update: {
          approved_until?: string | null
          cnpj?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_limit?: number
        }
        Relationships: []
      }
      ferr_kit_tools: {
        Row: {
          id: string
          is_required: boolean | null
          kit_id: string
          tool_id: string
        }
        Insert: {
          id?: string
          is_required?: boolean | null
          kit_id: string
          tool_id: string
        }
        Update: {
          id?: string
          is_required?: boolean | null
          kit_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferr_kit_tools_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "ferr_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_kit_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "ferr_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      ferr_kits: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferr_kits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ferr_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ferr_loan_renewals: {
        Row: {
          approval_date: string | null
          approved_by: string | null
          created_at: string
          id: string
          loan_id: string
          new_due_date: string
          reason: string | null
          request_date: string
          requested_by: string
          status: Database["public"]["Enums"]["ferr_renewal_status"]
        }
        Insert: {
          approval_date?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          loan_id: string
          new_due_date: string
          reason?: string | null
          request_date?: string
          requested_by: string
          status?: Database["public"]["Enums"]["ferr_renewal_status"]
        }
        Update: {
          approval_date?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          loan_id?: string
          new_due_date?: string
          reason?: string | null
          request_date?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["ferr_renewal_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ferr_loan_renewals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "ferr_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_loan_renewals_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "ferr_loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_loan_renewals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "ferr_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ferr_loan_request_items: {
        Row: {
          created_at: string
          id: string
          is_kit_item: boolean | null
          request_id: string
          tool_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_kit_item?: boolean | null
          request_id: string
          tool_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_kit_item?: boolean | null
          request_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferr_loan_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "ferr_loan_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_loan_request_items_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "ferr_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      ferr_loan_requests: {
        Row: {
          company_id: string | null
          created_at: string
          custom_due_date: string | null
          due_days: number
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          custom_due_date?: string | null
          due_days?: number
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          custom_due_date?: string | null
          due_days?: number
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferr_loan_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ferr_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_loan_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "ferr_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_loan_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ferr_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_loan_requests_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "ferr_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      ferr_loans: {
        Row: {
          company_id: string | null
          created_at: string
          due_date: string
          id: string
          loan_date: string
          notes: string | null
          registered_by: string | null
          return_date: string | null
          return_photo_url: string | null
          returned_by: string | null
          status: Database["public"]["Enums"]["ferr_loan_status"]
          tool_id: string
          updated_at: string
          user_id: string
          warehouse_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          loan_date?: string
          notes?: string | null
          registered_by?: string | null
          return_date?: string | null
          return_photo_url?: string | null
          returned_by?: string | null
          status?: Database["public"]["Enums"]["ferr_loan_status"]
          tool_id: string
          updated_at?: string
          user_id: string
          warehouse_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          loan_date?: string
          notes?: string | null
          registered_by?: string | null
          return_date?: string | null
          return_photo_url?: string | null
          returned_by?: string | null
          status?: Database["public"]["Enums"]["ferr_loan_status"]
          tool_id?: string
          updated_at?: string
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferr_loans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ferr_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_loans_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "ferr_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_loans_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "ferr_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_loans_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "ferr_tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_loans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ferr_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_loans_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "ferr_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      ferr_notifications: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          loan_id: string | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          loan_id?: string | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          loan_id?: string | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferr_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ferr_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_notifications_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "ferr_loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ferr_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ferr_profiles: {
        Row: {
          allow_relend: boolean | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          last_location_lat: number | null
          last_location_lng: number | null
          last_location_updated_at: string | null
          phone: string | null
          qr_code: string | null
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          allow_relend?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          is_approved?: boolean | null
          last_location_lat?: number | null
          last_location_lng?: number | null
          last_location_updated_at?: string | null
          phone?: string | null
          qr_code?: string | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          allow_relend?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          last_location_lat?: number | null
          last_location_lng?: number | null
          last_location_updated_at?: string | null
          phone?: string | null
          qr_code?: string | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferr_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ferr_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_profiles_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "ferr_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      ferr_return_issues: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          discount_resolved: boolean
          id: string
          issue_type: Database["public"]["Enums"]["ferr_return_issue_type"]
          loan_id: string | null
          reported_by: string
          requires_discount: boolean
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["ferr_issue_status"]
          tool_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          discount_resolved?: boolean
          id?: string
          issue_type: Database["public"]["Enums"]["ferr_return_issue_type"]
          loan_id?: string | null
          reported_by: string
          requires_discount?: boolean
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["ferr_issue_status"]
          tool_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          discount_resolved?: boolean
          id?: string
          issue_type?: Database["public"]["Enums"]["ferr_return_issue_type"]
          loan_id?: string | null
          reported_by?: string
          requires_discount?: boolean
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["ferr_issue_status"]
          tool_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferr_return_issues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ferr_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_return_issues_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "ferr_loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_return_issues_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "ferr_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_return_issues_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "ferr_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_return_issues_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "ferr_tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_return_issues_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ferr_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ferr_role_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          id: string
          role: string
          route: string
          updated_at: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          id?: string
          role: string
          route: string
          updated_at?: string
        }
        Update: {
          can_access?: boolean
          created_at?: string
          id?: string
          role?: string
          route?: string
          updated_at?: string
        }
        Relationships: []
      }
      ferr_supplies: {
        Row: {
          company_id: string | null
          created_at: string
          current_stock: number
          description: string | null
          group_id: string | null
          id: string
          is_active: boolean
          min_stock: number
          name: string
          photo_url: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          current_stock?: number
          description?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          photo_url?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          current_stock?: number
          description?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          photo_url?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferr_supplies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ferr_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_supplies_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "ferr_supply_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      ferr_supply_groups: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferr_supply_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ferr_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ferr_supply_movements: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          movement_type: string
          notes: string | null
          performed_by: string
          quantity: number
          supply_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          movement_type: string
          notes?: string | null
          performed_by: string
          quantity: number
          supply_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          movement_type?: string
          notes?: string | null
          performed_by?: string
          quantity?: number
          supply_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferr_supply_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ferr_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_supply_movements_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "ferr_supplies"
            referencedColumns: ["id"]
          },
        ]
      }
      ferr_tools: {
        Row: {
          allow_relend: boolean | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_maintenance: boolean | null
          kit_id: string | null
          name: string
          photo_url: string | null
          purchase_date: string | null
          purchase_value: number | null
          qr_code: string | null
          requires_kit: boolean | null
          requires_return_photo: boolean | null
          serial_number: string | null
          type: Database["public"]["Enums"]["ferr_tool_type"]
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          allow_relend?: boolean | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_maintenance?: boolean | null
          kit_id?: string | null
          name: string
          photo_url?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          qr_code?: string | null
          requires_kit?: boolean | null
          requires_return_photo?: boolean | null
          serial_number?: string | null
          type?: Database["public"]["Enums"]["ferr_tool_type"]
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          allow_relend?: boolean | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_maintenance?: boolean | null
          kit_id?: string | null
          name?: string
          photo_url?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          qr_code?: string | null
          requires_kit?: boolean | null
          requires_return_photo?: boolean | null
          serial_number?: string | null
          type?: Database["public"]["Enums"]["ferr_tool_type"]
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferr_tools_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ferr_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_tools_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "ferr_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_tools_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "ferr_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      ferr_user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["ferr_app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["ferr_app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["ferr_app_role"]
          user_id?: string
        }
        Relationships: []
      }
      ferr_user_warehouses: {
        Row: {
          created_at: string
          id: string
          user_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferr_user_warehouses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ferr_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferr_user_warehouses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "ferr_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      ferr_warehouses: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferr_warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ferr_companies"
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
      flow_templates: {
        Row: {
          created_at: string
          description: string | null
          edges: Json
          estabelecimento_id: string
          id: string
          name: string
          nodes: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          edges?: Json
          estabelecimento_id: string
          id?: string
          name: string
          nodes?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          edges?: Json
          estabelecimento_id?: string
          id?: string
          name?: string
          nodes?: Json
          updated_at?: string
          user_id?: string | null
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
      gerente_vendedores: {
        Row: {
          created_at: string
          estabelecimento_id: string
          gerente_usuario_id: string
          id: string
          updated_at: string
          vendedor_empresa_id: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          gerente_usuario_id: string
          id?: string
          updated_at?: string
          vendedor_empresa_id: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          gerente_usuario_id?: string
          id?: string
          updated_at?: string
          vendedor_empresa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gerente_vendedores_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gerente_vendedores_gerente_usuario_id_fkey"
            columns: ["gerente_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gerente_vendedores_vendedor_empresa_id_fkey"
            columns: ["vendedor_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      global_variables: {
        Row: {
          created_at: string
          default_value: Json | null
          description: string | null
          estabelecimento_id: string | null
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
          estabelecimento_id?: string | null
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
          estabelecimento_id?: string | null
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
          perfil: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          menus_permitidos?: Json | null
          nome: string
          perfil?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          menus_permitidos?: Json | null
          nome?: string
          perfil?: string
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
      heatmap_config: {
        Row: {
          created_at: string
          enabled: boolean
          estabelecimento_id: string
          id: string
          scope: string
          track_click: boolean
          track_dead_click: boolean
          track_form_field: boolean
          track_move: boolean
          track_quick_back: boolean
          track_rage_click: boolean
          track_scroll: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          estabelecimento_id: string
          id?: string
          scope: string
          track_click?: boolean
          track_dead_click?: boolean
          track_form_field?: boolean
          track_move?: boolean
          track_quick_back?: boolean
          track_rage_click?: boolean
          track_scroll?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          estabelecimento_id?: string
          id?: string
          scope?: string
          track_click?: boolean
          track_dead_click?: boolean
          track_form_field?: boolean
          track_move?: boolean
          track_quick_back?: boolean
          track_rage_click?: boolean
          track_scroll?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      heatmap_screenshots: {
        Row: {
          created_at: string
          estabelecimento_id: string | null
          id: string
          image_url: string
          route: string
          scope: string
          updated_at: string
          vh: number
          vw: number
        }
        Insert: {
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          image_url: string
          route: string
          scope?: string
          updated_at?: string
          vh?: number
          vw?: number
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          image_url?: string
          route?: string
          scope?: string
          updated_at?: string
          vh?: number
          vw?: number
        }
        Relationships: []
      }
      heatmap_triggers: {
        Row: {
          acao: Json
          ativo: boolean
          config: Json
          created_at: string
          escopo: string
          estabelecimento_id: string
          id: string
          nome: string
          tipo: string
          total_disparos: number
          ultima_execucao_at: string | null
          updated_at: string
        }
        Insert: {
          acao?: Json
          ativo?: boolean
          config?: Json
          created_at?: string
          escopo?: string
          estabelecimento_id: string
          id?: string
          nome: string
          tipo: string
          total_disparos?: number
          ultima_execucao_at?: string | null
          updated_at?: string
        }
        Update: {
          acao?: Json
          ativo?: boolean
          config?: Json
          created_at?: string
          escopo?: string
          estabelecimento_id?: string
          id?: string
          nome?: string
          tipo?: string
          total_disparos?: number
          ultima_execucao_at?: string | null
          updated_at?: string
        }
        Relationships: []
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
      ia_prospec_keys: {
        Row: {
          anthropic_api_key: string | null
          created_at: string
          openai_api_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anthropic_api_key?: string | null
          created_at?: string
          openai_api_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anthropic_api_key?: string | null
          created_at?: string
          openai_api_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      interaction_aggregates_daily: {
        Row: {
          avg_scroll_depth: number | null
          created_at: string
          day: string
          dead_count: number
          device: string
          estabelecimento_id: string
          event_type: string
          grid_data: Json | null
          id: string
          quick_back_count: number
          rage_count: number
          route: string
          scope: string
          total_count: number
          unique_sessions: number
        }
        Insert: {
          avg_scroll_depth?: number | null
          created_at?: string
          day: string
          dead_count?: number
          device?: string
          estabelecimento_id: string
          event_type: string
          grid_data?: Json | null
          id?: string
          quick_back_count?: number
          rage_count?: number
          route: string
          scope: string
          total_count?: number
          unique_sessions?: number
        }
        Update: {
          avg_scroll_depth?: number | null
          created_at?: string
          day?: string
          dead_count?: number
          device?: string
          estabelecimento_id?: string
          event_type?: string
          grid_data?: Json | null
          id?: string
          quick_back_count?: number
          rage_count?: number
          route?: string
          scope?: string
          total_count?: number
          unique_sessions?: number
        }
        Relationships: []
      }
      interaction_events: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          device: string | null
          element_selector: string | null
          element_text: string | null
          estabelecimento_id: string
          event_type: string
          id: string
          is_new_visitor: boolean | null
          metadata: Json | null
          referrer: string | null
          route: string
          scope: string
          scroll_depth: number | null
          session_id: string
          usuario_id: string | null
          vh: number | null
          vw: number | null
          x: number | null
          y: number | null
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          element_selector?: string | null
          element_text?: string | null
          estabelecimento_id: string
          event_type: string
          id?: string
          is_new_visitor?: boolean | null
          metadata?: Json | null
          referrer?: string | null
          route: string
          scope?: string
          scroll_depth?: number | null
          session_id: string
          usuario_id?: string | null
          vh?: number | null
          vw?: number | null
          x?: number | null
          y?: number | null
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          element_selector?: string | null
          element_text?: string | null
          estabelecimento_id?: string
          event_type?: string
          id?: string
          is_new_visitor?: boolean | null
          metadata?: Json | null
          referrer?: string | null
          route?: string
          scope?: string
          scroll_depth?: number | null
          session_id?: string
          usuario_id?: string | null
          vh?: number | null
          vw?: number | null
          x?: number | null
          y?: number | null
        }
        Relationships: []
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
      kb_lacunas: {
        Row: {
          agent_id: string | null
          agent_nome: string | null
          aprovada_em: string | null
          aprovada_por: string | null
          contexto: Json | null
          created_at: string
          estabelecimento_id: string
          id: string
          kb_id_criada: string | null
          motivo: string
          pergunta: string
          resposta_editada: string | null
          resposta_sugerida: string | null
          score_kb: number | null
          session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          agent_nome?: string | null
          aprovada_em?: string | null
          aprovada_por?: string | null
          contexto?: Json | null
          created_at?: string
          estabelecimento_id: string
          id?: string
          kb_id_criada?: string | null
          motivo?: string
          pergunta: string
          resposta_editada?: string | null
          resposta_sugerida?: string | null
          score_kb?: number | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          agent_nome?: string | null
          aprovada_em?: string | null
          aprovada_por?: string | null
          contexto?: Json | null
          created_at?: string
          estabelecimento_id?: string
          id?: string
          kb_id_criada?: string | null
          motivo?: string
          pergunta?: string
          resposta_editada?: string | null
          resposta_sugerida?: string | null
          score_kb?: number | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_lacunas_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "chat_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_lacunas_aprovada_por_fkey"
            columns: ["aprovada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_lacunas_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_lacunas_kb_id_criada_fkey"
            columns: ["kb_id_criada"]
            isOneToOne: false
            referencedRelation: "agent_knowledge_bases"
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
      livro_encomendas: {
        Row: {
          assinatura_url: string | null
          codigo_rastreio: string | null
          created_at: string
          data_entrega: string | null
          data_recebimento: string
          descricao: string | null
          destinatario: string
          documento_retirada: string | null
          estabelecimento_id: string | null
          foto_url: string | null
          id: string
          numero: number
          observacoes: string | null
          peso: number | null
          porteiro_id: string | null
          quantidade_volumes: number | null
          recebido_por: string | null
          registrado_por: string | null
          remetente: string | null
          retirado_por: string | null
          status: string
          tipo_encomenda: string | null
          transportadora: string | null
          unidade: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          assinatura_url?: string | null
          codigo_rastreio?: string | null
          created_at?: string
          data_entrega?: string | null
          data_recebimento?: string
          descricao?: string | null
          destinatario: string
          documento_retirada?: string | null
          estabelecimento_id?: string | null
          foto_url?: string | null
          id?: string
          numero?: number
          observacoes?: string | null
          peso?: number | null
          porteiro_id?: string | null
          quantidade_volumes?: number | null
          recebido_por?: string | null
          registrado_por?: string | null
          remetente?: string | null
          retirado_por?: string | null
          status?: string
          tipo_encomenda?: string | null
          transportadora?: string | null
          unidade?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          assinatura_url?: string | null
          codigo_rastreio?: string | null
          created_at?: string
          data_entrega?: string | null
          data_recebimento?: string
          descricao?: string | null
          destinatario?: string
          documento_retirada?: string | null
          estabelecimento_id?: string | null
          foto_url?: string | null
          id?: string
          numero?: number
          observacoes?: string | null
          peso?: number | null
          porteiro_id?: string | null
          quantidade_volumes?: number | null
          recebido_por?: string | null
          registrado_por?: string | null
          remetente?: string | null
          retirado_por?: string | null
          status?: string
          tipo_encomenda?: string | null
          transportadora?: string | null
          unidade?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "livro_encomendas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      livro_ocorrencias: {
        Row: {
          acao_tomada: string | null
          anexos: Json | null
          created_at: string
          data_hora: string
          descricao: string
          envolvidos: string | null
          estabelecimento_id: string | null
          gravidade: string
          id: string
          local: string | null
          numero: number
          observacao_resolucao: string | null
          observacoes: string | null
          porteiro_id: string | null
          registrado_por: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          responsavel: string | null
          status: string
          tipo: string
          turno: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          acao_tomada?: string | null
          anexos?: Json | null
          created_at?: string
          data_hora?: string
          descricao: string
          envolvidos?: string | null
          estabelecimento_id?: string | null
          gravidade?: string
          id?: string
          local?: string | null
          numero?: number
          observacao_resolucao?: string | null
          observacoes?: string | null
          porteiro_id?: string | null
          registrado_por?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          responsavel?: string | null
          status?: string
          tipo: string
          turno?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          acao_tomada?: string | null
          anexos?: Json | null
          created_at?: string
          data_hora?: string
          descricao?: string
          envolvidos?: string | null
          estabelecimento_id?: string | null
          gravidade?: string
          id?: string
          local?: string | null
          numero?: number
          observacao_resolucao?: string | null
          observacoes?: string | null
          porteiro_id?: string | null
          registrado_por?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          responsavel?: string | null
          status?: string
          tipo?: string
          turno?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "livro_ocorrencias_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      livro_palavras_chave: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          observacao: string | null
          palavra: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          observacao?: string | null
          palavra: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          observacao?: string | null
          palavra?: string
          updated_at?: string
        }
        Relationships: []
      }
      logistica_automacao_estado: {
        Row: {
          chave: string
          created_at: string
          estabelecimento_id: string
          expira_em: string | null
          id: string
          updated_at: string
          valor: Json
        }
        Insert: {
          chave: string
          created_at?: string
          estabelecimento_id: string
          expira_em?: string | null
          id?: string
          updated_at?: string
          valor?: Json
        }
        Update: {
          chave?: string
          created_at?: string
          estabelecimento_id?: string
          expira_em?: string | null
          id?: string
          updated_at?: string
          valor?: Json
        }
        Relationships: []
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
          limite_velocidade_global: number
          limites_velocidade_tipo: Json
          token_rastreamento: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          heigit_api_key?: string | null
          id?: string
          limite_velocidade_global?: number
          limites_velocidade_tipo?: Json
          token_rastreamento?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          heigit_api_key?: string | null
          id?: string
          limite_velocidade_global?: number
          limites_velocidade_tipo?: Json
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
      logistica_grupos: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          descricao: string | null
          estabelecimento_id: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
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
          endereco: string | null
          estabelecimento_id: string
          icone_parada: string | null
          id: string
          lat: number
          legenda_parada: string | null
          lng: number
          mostrar_endereco: boolean
          mostrar_tempo: boolean
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
          endereco?: string | null
          estabelecimento_id: string
          icone_parada?: string | null
          id?: string
          lat: number
          legenda_parada?: string | null
          lng: number
          mostrar_endereco?: boolean
          mostrar_tempo?: boolean
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
          endereco?: string | null
          estabelecimento_id?: string
          icone_parada?: string | null
          id?: string
          lat?: number
          legenda_parada?: string | null
          lng?: number
          mostrar_endereco?: boolean
          mostrar_tempo?: boolean
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
      logistica_workflow_state: {
        Row: {
          ativa_desde: string
          automacao_id: string | null
          chave: string
          condicao: string
          ultimo_disparo_em: string | null
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          ativa_desde?: string
          automacao_id?: string | null
          chave: string
          condicao: string
          ultimo_disparo_em?: string | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          ativa_desde?: string
          automacao_id?: string | null
          chave?: string
          condicao?: string
          ultimo_disparo_em?: string | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Relationships: []
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
      marketing_automation_execution_logs: {
        Row: {
          automation_id: string
          created_at: string
          error_message: string | null
          estabelecimento_id: string
          executed_at: string
          id: string
          items: Json
          metodo: string | null
          raw_result: Json | null
          recipients: Json
          status: string
          totals: Json
        }
        Insert: {
          automation_id: string
          created_at?: string
          error_message?: string | null
          estabelecimento_id: string
          executed_at?: string
          id?: string
          items?: Json
          metodo?: string | null
          raw_result?: Json | null
          recipients?: Json
          status?: string
          totals?: Json
        }
        Update: {
          automation_id?: string
          created_at?: string
          error_message?: string | null
          estabelecimento_id?: string
          executed_at?: string
          id?: string
          items?: Json
          metodo?: string | null
          raw_result?: Json | null
          recipients?: Json
          status?: string
          totals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "marketing_automation_execution_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "marketing_automations"
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
      mcp_tabelas_expostas: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          tabela: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          tabela: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          tabela?: string
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
          published_channels: Json
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
          published_channels?: Json
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
          published_channels?: Json
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
      mensagens_grupo_produto: {
        Row: {
          ativo: boolean
          created_at: string
          estabelecimento_id: string
          frase: string
          grupo_id: string | null
          id: string
          ordem: number
          tema: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          estabelecimento_id: string
          frase: string
          grupo_id?: string | null
          id?: string
          ordem?: number
          tema: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          estabelecimento_id?: string
          frase?: string
          grupo_id?: string | null
          id?: string
          ordem?: number
          tema?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_grupo_produto_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "produto_grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_customizacoes: {
        Row: {
          created_at: string
          estabelecimento_id: string
          id: string
          payload: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          payload: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          payload?: Json
          updated_at?: string
          updated_by?: string | null
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
      nota_links: {
        Row: {
          created_at: string
          destino_id: string | null
          destino_titulo: string
          id: string
          origem_id: string
        }
        Insert: {
          created_at?: string
          destino_id?: string | null
          destino_titulo: string
          id?: string
          origem_id: string
        }
        Update: {
          created_at?: string
          destino_id?: string | null
          destino_titulo?: string
          id?: string
          origem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nota_links_destino_id_fkey"
            columns: ["destino_id"]
            isOneToOne: false
            referencedRelation: "notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_links_origem_id_fkey"
            columns: ["origem_id"]
            isOneToOne: false
            referencedRelation: "notas"
            referencedColumns: ["id"]
          },
        ]
      }
      notas: {
        Row: {
          autor_id: string | null
          conteudo: string
          created_at: string
          entidade_id: string | null
          entidade_tipo: string | null
          estabelecimento_id: string | null
          favorito: boolean
          id: string
          tags: string[]
          titulo: string
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          conteudo?: string
          created_at?: string
          entidade_id?: string | null
          entidade_tipo?: string | null
          estabelecimento_id?: string | null
          favorito?: boolean
          id?: string
          tags?: string[]
          titulo: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          conteudo?: string
          created_at?: string
          entidade_id?: string | null
          entidade_tipo?: string | null
          estabelecimento_id?: string | null
          favorito?: boolean
          id?: string
          tags?: string[]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
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
      op_absences: {
        Row: {
          absence_date: string
          created_at: string
          establishment_id: string | null
          id: string
          is_planned: boolean | null
          reason: string | null
          user_id: string
        }
        Insert: {
          absence_date: string
          created_at?: string
          establishment_id?: string | null
          id?: string
          is_planned?: boolean | null
          reason?: string | null
          user_id: string
        }
        Update: {
          absence_date?: string
          created_at?: string
          establishment_id?: string | null
          id?: string
          is_planned?: boolean | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_absences_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      op_access_levels: {
        Row: {
          allowed_menus: string[]
          base_role: Database["public"]["Enums"]["op_app_role"]
          created_at: string
          establishment_id: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          allowed_menus?: string[]
          base_role?: Database["public"]["Enums"]["op_app_role"]
          created_at?: string
          establishment_id?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          allowed_menus?: string[]
          base_role?: Database["public"]["Enums"]["op_app_role"]
          created_at?: string
          establishment_id?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_access_levels_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      op_alerts: {
        Row: {
          created_at: string
          establishment_id: string | null
          id: string
          is_read: boolean | null
          message: string
          related_entity_id: string | null
          related_entity_type: string | null
          severity: string | null
          type: string
        }
        Insert: {
          created_at?: string
          establishment_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          severity?: string | null
          type: string
        }
        Update: {
          created_at?: string
          establishment_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          severity?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_alerts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      op_daily_attendance: {
        Row: {
          attendance_date: string
          checked_in_at: string | null
          checked_out_at: string | null
          created_at: string
          establishment_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          user_id: string
        }
        Insert: {
          attendance_date?: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          establishment_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          user_id: string
        }
        Update: {
          attendance_date?: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          establishment_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_daily_attendance_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      op_establishments: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      op_frequencies: {
        Row: {
          created_at: string
          description: string | null
          establishment_id: string | null
          id: string
          interval_days: number | null
          is_active: boolean
          is_system: boolean
          label: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          interval_days?: number | null
          is_active?: boolean
          is_system?: boolean
          label: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          interval_days?: number | null
          is_active?: boolean
          is_system?: boolean
          label?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_frequencies_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      op_function_departures: {
        Row: {
          created_at: string
          departure_date: string
          id: string
          observations: string | null
          reason: string
          tasks_redistributed: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          departure_date?: string
          id?: string
          observations?: string | null
          reason: string
          tasks_redistributed?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          departure_date?: string
          id?: string
          observations?: string | null
          reason?: string
          tasks_redistributed?: number | null
          user_id?: string
        }
        Relationships: []
      }
      op_incidents: {
        Row: {
          created_at: string
          description: string | null
          establishment_id: string | null
          id: string
          reported_by_user_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          sector_id: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          reported_by_user_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          sector_id?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          reported_by_user_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          sector_id?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_incidents_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_incidents_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "op_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      op_irregularities: {
        Row: {
          assigned_user_ids: string[] | null
          created_at: string
          description: string | null
          dispatch_priority: number | null
          dispatched_at: string | null
          dispatched_by: string | null
          establishment_id: string | null
          estimated_time_minutes: number | null
          id: string
          location_description: string | null
          photo_url: string
          reported_by_user_id: string | null
          scheduled_dates: string[] | null
          sector_id: string | null
          status: string
          task_execution_id: string | null
          task_name: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_user_ids?: string[] | null
          created_at?: string
          description?: string | null
          dispatch_priority?: number | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          establishment_id?: string | null
          estimated_time_minutes?: number | null
          id?: string
          location_description?: string | null
          photo_url: string
          reported_by_user_id?: string | null
          scheduled_dates?: string[] | null
          sector_id?: string | null
          status?: string
          task_execution_id?: string | null
          task_name?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_user_ids?: string[] | null
          created_at?: string
          description?: string | null
          dispatch_priority?: number | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          establishment_id?: string | null
          estimated_time_minutes?: number | null
          id?: string
          location_description?: string | null
          photo_url?: string
          reported_by_user_id?: string | null
          scheduled_dates?: string[] | null
          sector_id?: string | null
          status?: string
          task_execution_id?: string | null
          task_name?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_irregularities_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_irregularities_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "op_sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_irregularities_task_execution_id_fkey"
            columns: ["task_execution_id"]
            isOneToOne: false
            referencedRelation: "op_task_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      op_job_functions: {
        Row: {
          created_at: string
          description: string | null
          establishment_id: string | null
          id: string
          name: string
          sector_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          name: string
          sector_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          name?: string
          sector_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_job_functions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_job_functions_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "op_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      op_material_consumption: {
        Row: {
          consumed_at: string
          establishment_id: string | null
          id: string
          material_id: string
          notes: string | null
          quantity_used: number
          task_execution_id: string | null
          user_id: string | null
        }
        Insert: {
          consumed_at?: string
          establishment_id?: string | null
          id?: string
          material_id: string
          notes?: string | null
          quantity_used: number
          task_execution_id?: string | null
          user_id?: string | null
        }
        Update: {
          consumed_at?: string
          establishment_id?: string | null
          id?: string
          material_id?: string
          notes?: string | null
          quantity_used?: number
          task_execution_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "op_material_consumption_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_material_consumption_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "op_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_material_consumption_task_execution_id_fkey"
            columns: ["task_execution_id"]
            isOneToOne: false
            referencedRelation: "op_task_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      op_material_movements: {
        Row: {
          created_at: string
          establishment_id: string | null
          id: string
          material_id: string
          movement_type: string
          notes: string | null
          quantity: number
          reason: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          establishment_id?: string | null
          id?: string
          material_id: string
          movement_type: string
          notes?: string | null
          quantity: number
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          establishment_id?: string | null
          id?: string
          material_id?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "op_material_movements_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_material_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "op_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      op_materials: {
        Row: {
          created_at: string
          current_stock: number | null
          establishment_id: string | null
          id: string
          min_stock: number | null
          name: string
          sector_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stock?: number | null
          establishment_id?: string | null
          id?: string
          min_stock?: number | null
          name: string
          sector_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stock?: number | null
          establishment_id?: string | null
          id?: string
          min_stock?: number | null
          name?: string
          sector_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_materials_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_materials_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "op_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      op_operational_conditions: {
        Row: {
          affected_sectors: string[] | null
          affects_outdoor_tasks: boolean | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          establishment_id: string | null
          expected_end_at: string | null
          id: string
          is_active: boolean | null
          name: string
          severity: string
          started_at: string | null
          type: string
          updated_at: string
        }
        Insert: {
          affected_sectors?: string[] | null
          affects_outdoor_tasks?: boolean | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          establishment_id?: string | null
          expected_end_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          severity?: string
          started_at?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          affected_sectors?: string[] | null
          affects_outdoor_tasks?: boolean | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          establishment_id?: string | null
          expected_end_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          severity?: string
          started_at?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_operational_conditions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      op_productivity_metrics: {
        Row: {
          average_quality_score: number | null
          created_at: string
          establishment_id: string | null
          id: string
          metric_date: string
          on_time_percentage: number | null
          tasks_completed: number | null
          tasks_not_done: number | null
          total_time_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_quality_score?: number | null
          created_at?: string
          establishment_id?: string | null
          id?: string
          metric_date?: string
          on_time_percentage?: number | null
          tasks_completed?: number | null
          tasks_not_done?: number | null
          total_time_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_quality_score?: number | null
          created_at?: string
          establishment_id?: string | null
          id?: string
          metric_date?: string
          on_time_percentage?: number | null
          tasks_completed?: number | null
          tasks_not_done?: number | null
          total_time_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_productivity_metrics_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      op_profiles: {
        Row: {
          access_level_id: string | null
          avatar_url: string | null
          can_approve_irregularities: boolean
          can_delete_incidents: boolean
          created_at: string
          establishment_id: string | null
          full_name: string
          id: string
          is_active: boolean | null
          is_on_vacation: boolean
          job_function_id: string | null
          login_email: string | null
          phone: string | null
          shift_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level_id?: string | null
          avatar_url?: string | null
          can_approve_irregularities?: boolean
          can_delete_incidents?: boolean
          created_at?: string
          establishment_id?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          is_on_vacation?: boolean
          job_function_id?: string | null
          login_email?: string | null
          phone?: string | null
          shift_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level_id?: string | null
          avatar_url?: string | null
          can_approve_irregularities?: boolean
          can_delete_incidents?: boolean
          created_at?: string
          establishment_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_on_vacation?: boolean
          job_function_id?: string | null
          login_email?: string | null
          phone?: string | null
          shift_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_profiles_access_level_id_fkey"
            columns: ["access_level_id"]
            isOneToOne: false
            referencedRelation: "op_access_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_profiles_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_profiles_job_function_id_fkey"
            columns: ["job_function_id"]
            isOneToOne: false
            referencedRelation: "op_job_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_profiles_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "op_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      op_sectors: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          establishment_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_sectors_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      op_shifts: {
        Row: {
          created_at: string
          day_schedules: Json
          end_time: string
          establishment_id: string | null
          id: string
          lunch_end: string | null
          lunch_start: string | null
          name: string
          start_time: string
          work_days: number[]
        }
        Insert: {
          created_at?: string
          day_schedules?: Json
          end_time: string
          establishment_id?: string | null
          id?: string
          lunch_end?: string | null
          lunch_start?: string | null
          name: string
          start_time: string
          work_days?: number[]
        }
        Update: {
          created_at?: string
          day_schedules?: Json
          end_time?: string
          establishment_id?: string | null
          id?: string
          lunch_end?: string | null
          lunch_start?: string | null
          name?: string
          start_time?: string
          work_days?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "op_shifts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      op_task_dependencies: {
        Row: {
          created_at: string
          depends_on_template_id: string
          id: string
          task_template_id: string
        }
        Insert: {
          created_at?: string
          depends_on_template_id: string
          id?: string
          task_template_id: string
        }
        Update: {
          created_at?: string
          depends_on_template_id?: string
          id?: string
          task_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_task_dependencies_depends_on_template_id_fkey"
            columns: ["depends_on_template_id"]
            isOneToOne: false
            referencedRelation: "op_task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_task_dependencies_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "op_task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      op_task_executions: {
        Row: {
          actual_start_time: string | null
          assigned_user_id: string | null
          blocked_by_condition_id: string | null
          carried_over: boolean | null
          checklist_progress: Json | null
          completed_at: string | null
          created_at: string
          establishment_id: string | null
          executed_by_user_id: string | null
          expected_latitude: number | null
          expected_longitude: number | null
          id: string
          irregularity_id: string | null
          is_outdoor_task: boolean | null
          is_suspicious: boolean | null
          latitude: number | null
          location_radius_meters: number | null
          longitude: number | null
          observations: string | null
          original_assigned_user_id: string | null
          pause_count: number | null
          pause_reason: string | null
          paused_at: string | null
          photo_after_url: string | null
          photo_before_url: string | null
          photo_completion_url: string | null
          photo_hash: string | null
          planned_start_time: string | null
          previous_execution_id: string | null
          priority_score: number | null
          quality_score: number | null
          scheduled_date: string
          started_at: string | null
          status: Database["public"]["Enums"]["op_task_status"] | null
          suspicious_reason: string | null
          target_sector_id: string | null
          task_template_id: string | null
          time_spent_minutes: number | null
          total_pause_minutes: number | null
          updated_at: string
          was_redistributed: boolean | null
        }
        Insert: {
          actual_start_time?: string | null
          assigned_user_id?: string | null
          blocked_by_condition_id?: string | null
          carried_over?: boolean | null
          checklist_progress?: Json | null
          completed_at?: string | null
          created_at?: string
          establishment_id?: string | null
          executed_by_user_id?: string | null
          expected_latitude?: number | null
          expected_longitude?: number | null
          id?: string
          irregularity_id?: string | null
          is_outdoor_task?: boolean | null
          is_suspicious?: boolean | null
          latitude?: number | null
          location_radius_meters?: number | null
          longitude?: number | null
          observations?: string | null
          original_assigned_user_id?: string | null
          pause_count?: number | null
          pause_reason?: string | null
          paused_at?: string | null
          photo_after_url?: string | null
          photo_before_url?: string | null
          photo_completion_url?: string | null
          photo_hash?: string | null
          planned_start_time?: string | null
          previous_execution_id?: string | null
          priority_score?: number | null
          quality_score?: number | null
          scheduled_date?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["op_task_status"] | null
          suspicious_reason?: string | null
          target_sector_id?: string | null
          task_template_id?: string | null
          time_spent_minutes?: number | null
          total_pause_minutes?: number | null
          updated_at?: string
          was_redistributed?: boolean | null
        }
        Update: {
          actual_start_time?: string | null
          assigned_user_id?: string | null
          blocked_by_condition_id?: string | null
          carried_over?: boolean | null
          checklist_progress?: Json | null
          completed_at?: string | null
          created_at?: string
          establishment_id?: string | null
          executed_by_user_id?: string | null
          expected_latitude?: number | null
          expected_longitude?: number | null
          id?: string
          irregularity_id?: string | null
          is_outdoor_task?: boolean | null
          is_suspicious?: boolean | null
          latitude?: number | null
          location_radius_meters?: number | null
          longitude?: number | null
          observations?: string | null
          original_assigned_user_id?: string | null
          pause_count?: number | null
          pause_reason?: string | null
          paused_at?: string | null
          photo_after_url?: string | null
          photo_before_url?: string | null
          photo_completion_url?: string | null
          photo_hash?: string | null
          planned_start_time?: string | null
          previous_execution_id?: string | null
          priority_score?: number | null
          quality_score?: number | null
          scheduled_date?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["op_task_status"] | null
          suspicious_reason?: string | null
          target_sector_id?: string | null
          task_template_id?: string | null
          time_spent_minutes?: number | null
          total_pause_minutes?: number | null
          updated_at?: string
          was_redistributed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "op_task_executions_blocked_by_condition_id_fkey"
            columns: ["blocked_by_condition_id"]
            isOneToOne: false
            referencedRelation: "op_operational_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_task_executions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_task_executions_irregularity_id_fkey"
            columns: ["irregularity_id"]
            isOneToOne: false
            referencedRelation: "op_irregularities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_task_executions_target_sector_id_fkey"
            columns: ["target_sector_id"]
            isOneToOne: false
            referencedRelation: "op_sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_task_executions_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "op_task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      op_task_template_materials: {
        Row: {
          id: string
          material_id: string
          quantity_needed: number | null
          task_template_id: string
        }
        Insert: {
          id?: string
          material_id: string
          quantity_needed?: number | null
          task_template_id: string
        }
        Update: {
          id?: string
          material_id?: string
          quantity_needed?: number | null
          task_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_task_template_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "op_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_task_template_materials_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "op_task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      op_task_template_tools: {
        Row: {
          id: string
          task_template_id: string
          tool_id: string
        }
        Insert: {
          id?: string
          task_template_id: string
          tool_id: string
        }
        Update: {
          id?: string
          task_template_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_task_template_tools_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "op_task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_task_template_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "op_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      op_task_templates: {
        Row: {
          additional_assigned_user_ids: string[] | null
          approval_status: string
          approved_at: string | null
          approved_by_user_id: string | null
          checklist: Json | null
          created_at: string
          created_by_user_id: string | null
          default_assigned_user_id: string | null
          description: string | null
          establishment_id: string | null
          estimated_time_minutes: number | null
          frequency: string
          id: string
          is_active: boolean | null
          is_irregularity_template: boolean | null
          is_outdoor: boolean | null
          job_function_id: string | null
          location_photos: string[] | null
          min_execution_minutes: number | null
          name: string
          priority: number | null
          priority_order: number | null
          rejection_reason: string | null
          required_materials_check: boolean | null
          required_workers: number
          requires_before_after_photo: boolean | null
          requires_photo: boolean | null
          requires_rest_after: boolean
          rest_minutes_after: number | null
          sector_id: string | null
          sla_minutes: number | null
          updated_at: string
          work_days: number[] | null
        }
        Insert: {
          additional_assigned_user_ids?: string[] | null
          approval_status?: string
          approved_at?: string | null
          approved_by_user_id?: string | null
          checklist?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          default_assigned_user_id?: string | null
          description?: string | null
          establishment_id?: string | null
          estimated_time_minutes?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          is_irregularity_template?: boolean | null
          is_outdoor?: boolean | null
          job_function_id?: string | null
          location_photos?: string[] | null
          min_execution_minutes?: number | null
          name: string
          priority?: number | null
          priority_order?: number | null
          rejection_reason?: string | null
          required_materials_check?: boolean | null
          required_workers?: number
          requires_before_after_photo?: boolean | null
          requires_photo?: boolean | null
          requires_rest_after?: boolean
          rest_minutes_after?: number | null
          sector_id?: string | null
          sla_minutes?: number | null
          updated_at?: string
          work_days?: number[] | null
        }
        Update: {
          additional_assigned_user_ids?: string[] | null
          approval_status?: string
          approved_at?: string | null
          approved_by_user_id?: string | null
          checklist?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          default_assigned_user_id?: string | null
          description?: string | null
          establishment_id?: string | null
          estimated_time_minutes?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          is_irregularity_template?: boolean | null
          is_outdoor?: boolean | null
          job_function_id?: string | null
          location_photos?: string[] | null
          min_execution_minutes?: number | null
          name?: string
          priority?: number | null
          priority_order?: number | null
          rejection_reason?: string | null
          required_materials_check?: boolean | null
          required_workers?: number
          requires_before_after_photo?: boolean | null
          requires_photo?: boolean | null
          requires_rest_after?: boolean
          rest_minutes_after?: number | null
          sector_id?: string | null
          sla_minutes?: number | null
          updated_at?: string
          work_days?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "op_task_templates_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_task_templates_job_function_id_fkey"
            columns: ["job_function_id"]
            isOneToOne: false
            referencedRelation: "op_job_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_task_templates_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "op_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      op_tools: {
        Row: {
          created_at: string
          description: string | null
          establishment_id: string | null
          id: string
          is_available: boolean
          name: string
          needs_repair: boolean
          repair_notes: string | null
          repair_reported_at: string | null
          repair_reported_by_user_id: string | null
          sector_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          is_available?: boolean
          name: string
          needs_repair?: boolean
          repair_notes?: string | null
          repair_reported_at?: string | null
          repair_reported_by_user_id?: string | null
          sector_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          is_available?: boolean
          name?: string
          needs_repair?: boolean
          repair_notes?: string | null
          repair_reported_at?: string | null
          repair_reported_by_user_id?: string | null
          sector_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_tools_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_tools_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "op_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      op_user_establishments: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_user_establishments_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "op_establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      op_user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["op_app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["op_app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["op_app_role"]
          user_id?: string
        }
        Relationships: []
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
      pilar_cam_cameras: {
        Row: {
          ativo: boolean
          created_at: string
          device_id: string
          empresa_ponto_id: string | null
          estabelecimento_id: string | null
          filial_id: string | null
          finalidade: string
          id: string
          nome: string
          obrigatoria: boolean
          ordem: number
          rtsp_url: string
          senha: string | null
          updated_at: string
          usuario: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          device_id: string
          empresa_ponto_id?: string | null
          estabelecimento_id?: string | null
          filial_id?: string | null
          finalidade?: string
          id?: string
          nome: string
          obrigatoria?: boolean
          ordem?: number
          rtsp_url: string
          senha?: string | null
          updated_at?: string
          usuario?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          device_id?: string
          empresa_ponto_id?: string | null
          estabelecimento_id?: string | null
          filial_id?: string | null
          finalidade?: string
          id?: string
          nome?: string
          obrigatoria?: boolean
          ordem?: number
          rtsp_url?: string
          senha?: string | null
          updated_at?: string
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pilar_cam_cameras_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "sms_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      pilar_hub_snapshots: {
        Row: {
          created_at: string
          device_id: string | null
          estabelecimento_id: string
          id: string
          meta: Json
          origem: string
          referencia_id: string | null
          storage_path: string
          url_publica: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          estabelecimento_id: string
          id?: string
          meta?: Json
          origem?: string
          referencia_id?: string | null
          storage_path: string
          url_publica?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          estabelecimento_id?: string
          id?: string
          meta?: Json
          origem?: string
          referencia_id?: string | null
          storage_path?: string
          url_publica?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pilar_hub_snapshots_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "sms_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilar_hub_snapshots_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          category_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          keywords: string[]
          ordem: number
          responsible: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          keywords?: string[]
          ordem?: number
          responsible?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          keywords?: string[]
          ordem?: number
          responsible?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "policy_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_ai_queries: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          policies_used: Json
          question: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          policies_used?: Json
          question: string
          user_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          policies_used?: Json
          question?: string
          user_id?: string
        }
        Relationships: []
      }
      policy_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          policy_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          policy_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_attachments_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          ordem: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      policy_chunks: {
        Row: {
          chunk_order: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          policy_id: string
          updated_at: string
        }
        Insert: {
          chunk_order?: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          policy_id: string
          updated_at?: string
        }
        Update: {
          chunk_order?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          policy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_chunks_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_acordos_coletivos: {
        Row: {
          adicional_noturno_percentual: number | null
          arquivo_url: string | null
          ativo: boolean
          banco_horas_limite_diario_min: number | null
          banco_horas_prazo_meses: number | null
          created_at: string
          dsr_percentual: number | null
          he_faixas_customizadas: Json
          he_multiplicador_100: number | null
          he_multiplicador_50: number | null
          hora_noturna_minutos: number | null
          id: string
          intervalo_maximo_min: number | null
          intervalo_minimo_min: number | null
          nome: string
          noturno_hora_fim: string | null
          noturno_hora_inicio: string | null
          numero_registro_mte: string | null
          observacoes: string | null
          sindicato_cnpj: string | null
          sindicato_nome: string | null
          sobreaviso_percentual: number | null
          tipo: string
          updated_at: string
          vigencia_fim: string
          vigencia_inicio: string
        }
        Insert: {
          adicional_noturno_percentual?: number | null
          arquivo_url?: string | null
          ativo?: boolean
          banco_horas_limite_diario_min?: number | null
          banco_horas_prazo_meses?: number | null
          created_at?: string
          dsr_percentual?: number | null
          he_faixas_customizadas?: Json
          he_multiplicador_100?: number | null
          he_multiplicador_50?: number | null
          hora_noturna_minutos?: number | null
          id?: string
          intervalo_maximo_min?: number | null
          intervalo_minimo_min?: number | null
          nome: string
          noturno_hora_fim?: string | null
          noturno_hora_inicio?: string | null
          numero_registro_mte?: string | null
          observacoes?: string | null
          sindicato_cnpj?: string | null
          sindicato_nome?: string | null
          sobreaviso_percentual?: number | null
          tipo?: string
          updated_at?: string
          vigencia_fim: string
          vigencia_inicio: string
        }
        Update: {
          adicional_noturno_percentual?: number | null
          arquivo_url?: string | null
          ativo?: boolean
          banco_horas_limite_diario_min?: number | null
          banco_horas_prazo_meses?: number | null
          created_at?: string
          dsr_percentual?: number | null
          he_faixas_customizadas?: Json
          he_multiplicador_100?: number | null
          he_multiplicador_50?: number | null
          hora_noturna_minutos?: number | null
          id?: string
          intervalo_maximo_min?: number | null
          intervalo_minimo_min?: number | null
          nome?: string
          noturno_hora_fim?: string | null
          noturno_hora_inicio?: string | null
          numero_registro_mte?: string | null
          observacoes?: string | null
          sindicato_cnpj?: string | null
          sindicato_nome?: string | null
          sobreaviso_percentual?: number | null
          tipo?: string
          updated_at?: string
          vigencia_fim?: string
          vigencia_inicio?: string
        }
        Relationships: []
      }
      ponto_acordos_vinculos: {
        Row: {
          acordo_id: string
          created_at: string
          escopo: string
          escopo_id: string
          id: string
        }
        Insert: {
          acordo_id: string
          created_at?: string
          escopo: string
          escopo_id: string
          id?: string
        }
        Update: {
          acordo_id?: string
          created_at?: string
          escopo?: string
          escopo_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_acordos_vinculos_acordo_id_fkey"
            columns: ["acordo_id"]
            isOneToOne: false
            referencedRelation: "ponto_acordos_coletivos"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_afd_arquivos: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          empresa_id: string
          gerado_por: string | null
          hash_arquivo: string | null
          id: string
          nsr_final: number | null
          nsr_inicial: number | null
          storage_path: string | null
          total_registros: number | null
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio: string
          empresa_id: string
          gerado_por?: string | null
          hash_arquivo?: string | null
          id?: string
          nsr_final?: number | null
          nsr_inicial?: number | null
          storage_path?: string | null
          total_registros?: number | null
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          empresa_id?: string
          gerado_por?: string | null
          hash_arquivo?: string | null
          id?: string
          nsr_final?: number | null
          nsr_inicial?: number | null
          storage_path?: string | null
          total_registros?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_afd_arquivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_afd_arquivos_gerado_por_fkey"
            columns: ["gerado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_afd_importacoes: {
        Row: {
          cnpj_cabecalho: string | null
          created_at: string
          empresa_id: string
          equipamento_id: string | null
          erros: Json
          estabelecimento_id: string
          filial_id: string | null
          formato: string
          id: string
          importado_por: string | null
          marcacoes_duplicadas: number
          marcacoes_erro: number
          marcacoes_importadas: number
          nome_arquivo: string
          status: string
          total_linhas: number
          total_marcacoes: number
          updated_at: string
        }
        Insert: {
          cnpj_cabecalho?: string | null
          created_at?: string
          empresa_id: string
          equipamento_id?: string | null
          erros?: Json
          estabelecimento_id: string
          filial_id?: string | null
          formato?: string
          id?: string
          importado_por?: string | null
          marcacoes_duplicadas?: number
          marcacoes_erro?: number
          marcacoes_importadas?: number
          nome_arquivo: string
          status?: string
          total_linhas?: number
          total_marcacoes?: number
          updated_at?: string
        }
        Update: {
          cnpj_cabecalho?: string | null
          created_at?: string
          empresa_id?: string
          equipamento_id?: string | null
          erros?: Json
          estabelecimento_id?: string
          filial_id?: string | null
          formato?: string
          id?: string
          importado_por?: string | null
          marcacoes_duplicadas?: number
          marcacoes_erro?: number
          marcacoes_importadas?: number
          nome_arquivo?: string
          status?: string
          total_linhas?: number
          total_marcacoes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_afd_importacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_afd_importacoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "ponto_equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_afd_importacoes_unidade_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_ajustes: {
        Row: {
          anexo_url: string | null
          aprovacoes: Json
          aprovado_em: string | null
          aprovador_id: string | null
          comentario: string | null
          created_at: string
          data: string
          funcionario_id: string
          id: string
          motivo: string
          nivel_aprovacao_atual: number
          nivel_aprovacao_max: number
          solicitado_por: string | null
          status: string
          tipo: string
          updated_at: string
          valor_proposto: Json | null
        }
        Insert: {
          anexo_url?: string | null
          aprovacoes?: Json
          aprovado_em?: string | null
          aprovador_id?: string | null
          comentario?: string | null
          created_at?: string
          data: string
          funcionario_id: string
          id?: string
          motivo: string
          nivel_aprovacao_atual?: number
          nivel_aprovacao_max?: number
          solicitado_por?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_proposto?: Json | null
        }
        Update: {
          anexo_url?: string | null
          aprovacoes?: Json
          aprovado_em?: string | null
          aprovador_id?: string | null
          comentario?: string | null
          created_at?: string
          data?: string
          funcionario_id?: string
          id?: string
          motivo?: string
          nivel_aprovacao_atual?: number
          nivel_aprovacao_max?: number
          solicitado_por?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_proposto?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_ajustes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_ajustes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_alertas: {
        Row: {
          categoria: string
          created_at: string
          descricao: string
          detalhes: Json | null
          empresa_id: string
          funcionario_id: string | null
          id: string
          nivel: string
          registro_id: string | null
          resolvido: boolean
          resolvido_em: string | null
          resolvido_por: string | null
        }
        Insert: {
          categoria: string
          created_at?: string
          descricao: string
          detalhes?: Json | null
          empresa_id: string
          funcionario_id?: string | null
          id?: string
          nivel?: string
          registro_id?: string | null
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string
          detalhes?: Json | null
          empresa_id?: string
          funcionario_id?: string | null
          id?: string
          nivel?: string
          registro_id?: string | null
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_alertas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_alertas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_alertas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_alertas_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "ponto_registros"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_anexos: {
        Row: {
          arquivo_nome: string | null
          arquivo_tamanho: number | null
          arquivo_tipo: string | null
          arquivo_url: string
          contexto: string
          created_at: string
          funcionario_id: string | null
          hash_sha256: string | null
          id: string
          referencia_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_tamanho?: number | null
          arquivo_tipo?: string | null
          arquivo_url: string
          contexto: string
          created_at?: string
          funcionario_id?: string | null
          hash_sha256?: string | null
          id?: string
          referencia_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_tamanho?: number | null
          arquivo_tipo?: string | null
          arquivo_url?: string
          contexto?: string
          created_at?: string
          funcionario_id?: string | null
          hash_sha256?: string | null
          id?: string
          referencia_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_anexos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_anexos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_anomalias: {
        Row: {
          acao_aprovacao: string | null
          created_at: string
          data: string
          descricao: string
          detalhes: Json | null
          empresa_id: string
          funcionario_id: string | null
          id: string
          resolvida: boolean
          resolvida_em: string | null
          resolvida_por: string | null
          severidade: string
          tipo: string
        }
        Insert: {
          acao_aprovacao?: string | null
          created_at?: string
          data: string
          descricao: string
          detalhes?: Json | null
          empresa_id: string
          funcionario_id?: string | null
          id?: string
          resolvida?: boolean
          resolvida_em?: string | null
          resolvida_por?: string | null
          severidade?: string
          tipo: string
        }
        Update: {
          acao_aprovacao?: string | null
          created_at?: string
          data?: string
          descricao?: string
          detalhes?: Json | null
          empresa_id?: string
          funcionario_id?: string | null
          id?: string
          resolvida?: boolean
          resolvida_em?: string | null
          resolvida_por?: string | null
          severidade?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_anomalias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_anomalias_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_anomalias_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_aprovacao_config: {
        Row: {
          created_at: string
          empresa_id: string
          entidade: string
          id: string
          niveis: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          entidade: string
          id?: string
          niveis?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          entidade?: string
          id?: string
          niveis?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_aprovacao_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_aprovacao_fluxo: {
        Row: {
          aprovador_atual_id: string | null
          created_at: string
          empresa_id: string
          escalado_em: string | null
          id: string
          niveis_executados: Json
          nivel_atual: number
          nivel_total: number
          observacao: string | null
          origem: string
          origem_id: string
          papel_atual: string | null
          prazo_em: string | null
          regra_id: string | null
          sla_horas: number
          status: string
          updated_at: string
        }
        Insert: {
          aprovador_atual_id?: string | null
          created_at?: string
          empresa_id: string
          escalado_em?: string | null
          id?: string
          niveis_executados?: Json
          nivel_atual?: number
          nivel_total?: number
          observacao?: string | null
          origem: string
          origem_id: string
          papel_atual?: string | null
          prazo_em?: string | null
          regra_id?: string | null
          sla_horas?: number
          status?: string
          updated_at?: string
        }
        Update: {
          aprovador_atual_id?: string | null
          created_at?: string
          empresa_id?: string
          escalado_em?: string | null
          id?: string
          niveis_executados?: Json
          nivel_atual?: number
          nivel_total?: number
          observacao?: string | null
          origem?: string
          origem_id?: string
          papel_atual?: string | null
          prazo_em?: string | null
          regra_id?: string | null
          sla_horas?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_aprovacao_fluxo_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "ponto_aprovacao_regras"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_aprovacao_regras: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          niveis: Json
          nome: string
          prioridade: number
          tipo_anomalia: string
          updated_at: string
          valor_max_min: number | null
          valor_min_min: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          niveis?: Json
          nome: string
          prioridade?: number
          tipo_anomalia: string
          updated_at?: string
          valor_max_min?: number | null
          valor_min_min?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          niveis?: Json
          nome?: string
          prioridade?: number
          tipo_anomalia?: string
          updated_at?: string
          valor_max_min?: number | null
          valor_min_min?: number
        }
        Relationships: []
      }
      ponto_aprovador_2fa: {
        Row: {
          canal: string
          codigo: string
          contexto: string | null
          created_at: string
          expira_em: string
          id: string
          ip: unknown
          tentativas: number
          user_agent: string | null
          usuario_id: string
          validado_em: string | null
        }
        Insert: {
          canal?: string
          codigo: string
          contexto?: string | null
          created_at?: string
          expira_em: string
          id?: string
          ip?: unknown
          tentativas?: number
          user_agent?: string | null
          usuario_id: string
          validado_em?: string | null
        }
        Update: {
          canal?: string
          codigo?: string
          contexto?: string | null
          created_at?: string
          expira_em?: string
          id?: string
          ip?: unknown
          tentativas?: number
          user_agent?: string | null
          usuario_id?: string
          validado_em?: string | null
        }
        Relationships: []
      }
      ponto_assinatura_tokens: {
        Row: {
          canal_2fa: string
          codigo_2fa: string
          created_at: string
          espelho_id: string | null
          expira_em: string
          funcionario_id: string
          id: string
          ip_validacao: unknown
          max_tentativas: number
          tentativas: number
          token_hash: string
          user_agent_validacao: string | null
          validado_em: string | null
        }
        Insert: {
          canal_2fa?: string
          codigo_2fa: string
          created_at?: string
          espelho_id?: string | null
          expira_em: string
          funcionario_id: string
          id?: string
          ip_validacao?: unknown
          max_tentativas?: number
          tentativas?: number
          token_hash: string
          user_agent_validacao?: string | null
          validado_em?: string | null
        }
        Update: {
          canal_2fa?: string
          codigo_2fa?: string
          created_at?: string
          espelho_id?: string | null
          expira_em?: string
          funcionario_id?: string
          id?: string
          ip_validacao?: unknown
          max_tentativas?: number
          tentativas?: number
          token_hash?: string
          user_agent_validacao?: string | null
          validado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_assinatura_tokens_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_assinatura_tokens_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_assinaturas_espelho: {
        Row: {
          algoritmo: string | null
          assinado_em: string
          assinatura_digital_base64: string | null
          certificado_serial: string | null
          certificado_titular: string | null
          created_at: string
          funcionario_id: string
          geo_lat: number | null
          geo_lon: number | null
          hash: string
          hash_documento: string | null
          id: string
          ip: string | null
          mes_referencia: string
        }
        Insert: {
          algoritmo?: string | null
          assinado_em?: string
          assinatura_digital_base64?: string | null
          certificado_serial?: string | null
          certificado_titular?: string | null
          created_at?: string
          funcionario_id: string
          geo_lat?: number | null
          geo_lon?: number | null
          hash: string
          hash_documento?: string | null
          id?: string
          ip?: string | null
          mes_referencia: string
        }
        Update: {
          algoritmo?: string | null
          assinado_em?: string
          assinatura_digital_base64?: string | null
          certificado_serial?: string | null
          certificado_titular?: string | null
          created_at?: string
          funcionario_id?: string
          geo_lat?: number | null
          geo_lon?: number | null
          hash?: string
          hash_documento?: string | null
          id?: string
          ip?: string | null
          mes_referencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_assinaturas_espelho_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_assinaturas_espelho_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_atestados: {
        Row: {
          arquivo_url: string
          cid: string | null
          created_at: string
          data_fim: string
          data_inicio: string
          funcionario_id: string
          id: string
          observacao: string | null
          revisado_em: string | null
          revisado_por: string | null
          status: string
          updated_at: string
        }
        Insert: {
          arquivo_url: string
          cid?: string | null
          created_at?: string
          data_fim: string
          data_inicio: string
          funcionario_id: string
          id?: string
          observacao?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string
          cid?: string | null
          created_at?: string
          data_fim?: string
          data_inicio?: string
          funcionario_id?: string
          id?: string
          observacao?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_atestados_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_atestados_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_auditoria: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          empresa_id: string | null
          entidade: string
          entidade_id: string | null
          hash_anterior: string | null
          hash_atual: string | null
          id: string
          ip: string | null
          user_agent: string | null
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_id?: string | null
          entidade: string
          entidade_id?: string | null
          hash_anterior?: string | null
          hash_atual?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_id?: string | null
          entidade?: string
          entidade_id?: string | null
          hash_anterior?: string | null
          hash_atual?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_auditoria_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_backups: {
        Row: {
          arquivo_url: string
          competencia: string | null
          created_at: string
          created_by: string | null
          destino: string
          empresa_id: string | null
          hash_sha256: string
          id: string
          retencao_ate: string
          tamanho_bytes: number | null
          tipo: string
        }
        Insert: {
          arquivo_url: string
          competencia?: string | null
          created_at?: string
          created_by?: string | null
          destino?: string
          empresa_id?: string | null
          hash_sha256: string
          id?: string
          retencao_ate: string
          tamanho_bytes?: number | null
          tipo: string
        }
        Update: {
          arquivo_url?: string
          competencia?: string | null
          created_at?: string
          created_by?: string | null
          destino?: string
          empresa_id?: string | null
          hash_sha256?: string
          id?: string
          retencao_ate?: string
          tamanho_bytes?: number | null
          tipo?: string
        }
        Relationships: []
      }
      ponto_banco_horas_lancamentos: {
        Row: {
          compensado: boolean
          compensado_em: string | null
          created_at: string
          created_by: string | null
          data: string
          espelho_id: string | null
          estabelecimento_id: string
          expirado: boolean
          expirado_em: string | null
          funcionario_id: string
          id: string
          minutos: number
          observacao: string | null
          origem: string | null
          saldo_id: string
          tipo: string
        }
        Insert: {
          compensado?: boolean
          compensado_em?: string | null
          created_at?: string
          created_by?: string | null
          data: string
          espelho_id?: string | null
          estabelecimento_id: string
          expirado?: boolean
          expirado_em?: string | null
          funcionario_id: string
          id?: string
          minutos: number
          observacao?: string | null
          origem?: string | null
          saldo_id: string
          tipo: string
        }
        Update: {
          compensado?: boolean
          compensado_em?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          espelho_id?: string | null
          estabelecimento_id?: string
          expirado?: boolean
          expirado_em?: string | null
          funcionario_id?: string
          id?: string
          minutos?: number
          observacao?: string | null
          origem?: string | null
          saldo_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_banco_horas_lancamentos_saldo_id_fkey"
            columns: ["saldo_id"]
            isOneToOne: false
            referencedRelation: "ponto_banco_horas_saldos"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_banco_horas_saldos: {
        Row: {
          ativo: boolean
          created_at: string
          data_expiracao: string | null
          data_inicio: string
          estabelecimento_id: string
          funcionario_id: string
          id: string
          prazo_compensacao_dias: number
          saldo_minutos: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_expiracao?: string | null
          data_inicio?: string
          estabelecimento_id: string
          funcionario_id: string
          id?: string
          prazo_compensacao_dias?: number
          saldo_minutos?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_expiracao?: string | null
          data_inicio?: string
          estabelecimento_id?: string
          funcionario_id?: string
          id?: string
          prazo_compensacao_dias?: number
          saldo_minutos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_banco_horas_saldos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_banco_horas_saldos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_cargos: {
        Row: {
          ativo: boolean
          cbo: string | null
          created_at: string
          descricao: string | null
          empresa_id: string | null
          filial_id: string | null
          global: boolean
          id: string
          nome: string
          salario_base: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cbo?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          filial_id?: string | null
          global?: boolean
          id?: string
          nome: string
          salario_base?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cbo?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          filial_id?: string | null
          global?: boolean
          id?: string
          nome?: string
          salario_base?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_cargos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_cargos_unidade_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_clt_config: {
        Row: {
          acao_dsr_violado: string
          acao_he_acima_limite: string
          acao_interjornada_violada: string
          acao_intervalo_violado: string
          acao_jornada_acima_limite: string
          adic_noturno_fim: string
          adic_noturno_hora_ficta_min: number
          adic_noturno_inicio: string
          adic_noturno_percentual: number
          banco_horas_acao_expirado: string
          banco_horas_alerta_dias_antes: number
          banco_horas_auto_expirar: boolean
          banco_horas_prazo_dias: number
          banco_horas_prazo_meses: number
          created_at: string
          detectar_batida_simultanea: boolean
          detectar_padrao_suspeito: boolean
          dsr_max_dias_seguidos: number
          empresa_id: string
          escalonamento_max_niveis: number
          escalonamento_sla_horas: number
          exigir_anexo_he_acima_min: number
          exigir_dupla_aprovacao_acima_min: number
          exigir_motivo_he_acima_min: number
          ferias_abono_max_dias: number
          ferias_aviso_dias_minimo: number
          ferias_aviso_minimo_dias: number
          ferias_fracionamento_max: number
          ferias_max_fracionamentos: number
          ferias_minimo_periodo_dias: number
          ferias_periodo_minimo_dias: number
          ferias_periodo_secundario_min_dias: number
          geofence_violado_marca_revisao: boolean
          horas_trabalho_para_intra_curto: number
          horas_trabalho_para_intra_longo: number
          id: string
          interjornada_min_horas: number
          intervalo_intra_min_curto: number
          intervalo_intra_min_obrigatorio: number
          intervalo_min_entre_batidas_min: number
          max_aprovacoes_em_lote: number
          max_horas_extras_dia_min: number
          max_jornada_total_dia_min: number
          menor_jornada_max_dia_min: number
          menor_proibir_extras: boolean
          notificar_email: boolean
          notificar_funcionario_alteracao: boolean
          notificar_push: boolean
          proibir_auto_aprovacao: boolean
          prontidao_percentual: number
          reflexo_dsr_he: boolean
          reflexo_dsr_noturno: boolean
          sobreaviso_percentual: number
          time_lock_ajuste_horas: number
          updated_at: string
        }
        Insert: {
          acao_dsr_violado?: string
          acao_he_acima_limite?: string
          acao_interjornada_violada?: string
          acao_intervalo_violado?: string
          acao_jornada_acima_limite?: string
          adic_noturno_fim?: string
          adic_noturno_hora_ficta_min?: number
          adic_noturno_inicio?: string
          adic_noturno_percentual?: number
          banco_horas_acao_expirado?: string
          banco_horas_alerta_dias_antes?: number
          banco_horas_auto_expirar?: boolean
          banco_horas_prazo_dias?: number
          banco_horas_prazo_meses?: number
          created_at?: string
          detectar_batida_simultanea?: boolean
          detectar_padrao_suspeito?: boolean
          dsr_max_dias_seguidos?: number
          empresa_id: string
          escalonamento_max_niveis?: number
          escalonamento_sla_horas?: number
          exigir_anexo_he_acima_min?: number
          exigir_dupla_aprovacao_acima_min?: number
          exigir_motivo_he_acima_min?: number
          ferias_abono_max_dias?: number
          ferias_aviso_dias_minimo?: number
          ferias_aviso_minimo_dias?: number
          ferias_fracionamento_max?: number
          ferias_max_fracionamentos?: number
          ferias_minimo_periodo_dias?: number
          ferias_periodo_minimo_dias?: number
          ferias_periodo_secundario_min_dias?: number
          geofence_violado_marca_revisao?: boolean
          horas_trabalho_para_intra_curto?: number
          horas_trabalho_para_intra_longo?: number
          id?: string
          interjornada_min_horas?: number
          intervalo_intra_min_curto?: number
          intervalo_intra_min_obrigatorio?: number
          intervalo_min_entre_batidas_min?: number
          max_aprovacoes_em_lote?: number
          max_horas_extras_dia_min?: number
          max_jornada_total_dia_min?: number
          menor_jornada_max_dia_min?: number
          menor_proibir_extras?: boolean
          notificar_email?: boolean
          notificar_funcionario_alteracao?: boolean
          notificar_push?: boolean
          proibir_auto_aprovacao?: boolean
          prontidao_percentual?: number
          reflexo_dsr_he?: boolean
          reflexo_dsr_noturno?: boolean
          sobreaviso_percentual?: number
          time_lock_ajuste_horas?: number
          updated_at?: string
        }
        Update: {
          acao_dsr_violado?: string
          acao_he_acima_limite?: string
          acao_interjornada_violada?: string
          acao_intervalo_violado?: string
          acao_jornada_acima_limite?: string
          adic_noturno_fim?: string
          adic_noturno_hora_ficta_min?: number
          adic_noturno_inicio?: string
          adic_noturno_percentual?: number
          banco_horas_acao_expirado?: string
          banco_horas_alerta_dias_antes?: number
          banco_horas_auto_expirar?: boolean
          banco_horas_prazo_dias?: number
          banco_horas_prazo_meses?: number
          created_at?: string
          detectar_batida_simultanea?: boolean
          detectar_padrao_suspeito?: boolean
          dsr_max_dias_seguidos?: number
          empresa_id?: string
          escalonamento_max_niveis?: number
          escalonamento_sla_horas?: number
          exigir_anexo_he_acima_min?: number
          exigir_dupla_aprovacao_acima_min?: number
          exigir_motivo_he_acima_min?: number
          ferias_abono_max_dias?: number
          ferias_aviso_dias_minimo?: number
          ferias_aviso_minimo_dias?: number
          ferias_fracionamento_max?: number
          ferias_max_fracionamentos?: number
          ferias_minimo_periodo_dias?: number
          ferias_periodo_minimo_dias?: number
          ferias_periodo_secundario_min_dias?: number
          geofence_violado_marca_revisao?: boolean
          horas_trabalho_para_intra_curto?: number
          horas_trabalho_para_intra_longo?: number
          id?: string
          interjornada_min_horas?: number
          intervalo_intra_min_curto?: number
          intervalo_intra_min_obrigatorio?: number
          intervalo_min_entre_batidas_min?: number
          max_aprovacoes_em_lote?: number
          max_horas_extras_dia_min?: number
          max_jornada_total_dia_min?: number
          menor_jornada_max_dia_min?: number
          menor_proibir_extras?: boolean
          notificar_email?: boolean
          notificar_funcionario_alteracao?: boolean
          notificar_push?: boolean
          proibir_auto_aprovacao?: boolean
          prontidao_percentual?: number
          reflexo_dsr_he?: boolean
          reflexo_dsr_noturno?: boolean
          sobreaviso_percentual?: number
          time_lock_ajuste_horas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_clt_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_compensacao_acordos: {
        Row: {
          anexo_url: string | null
          aprovado_em: string | null
          aprovado_por: string | null
          base_legal: string | null
          created_at: string
          criado_por: string | null
          data_fim_compensacao: string
          data_inicio_compensacao: string
          dias_compensacao: Json
          dias_dispensados: Json
          empresa_id: string
          feriado_data: string | null
          id: string
          minutos_dispensados: number | null
          minutos_por_dia: number
          modalidade: string
          motivo: string
          observacoes: string | null
          quorum_percentual: number
          status: string
          termo_ciencia_url: string | null
          tipo_dispensa: string | null
          titulo: string
          total_elegiveis: number
          total_minutos_a_compensar: number
          total_votos_nao: number
          total_votos_sim: number
          updated_at: string
          usa_banco_horas: boolean
          votacao_abre_em: string | null
          votacao_ativa: boolean
          votacao_fecha_em: string | null
          votacao_finalizada_em: string | null
          votacao_resultado: string | null
        }
        Insert: {
          anexo_url?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          base_legal?: string | null
          created_at?: string
          criado_por?: string | null
          data_fim_compensacao: string
          data_inicio_compensacao: string
          dias_compensacao?: Json
          dias_dispensados?: Json
          empresa_id: string
          feriado_data?: string | null
          id?: string
          minutos_dispensados?: number | null
          minutos_por_dia?: number
          modalidade?: string
          motivo?: string
          observacoes?: string | null
          quorum_percentual?: number
          status?: string
          termo_ciencia_url?: string | null
          tipo_dispensa?: string | null
          titulo: string
          total_elegiveis?: number
          total_minutos_a_compensar?: number
          total_votos_nao?: number
          total_votos_sim?: number
          updated_at?: string
          usa_banco_horas?: boolean
          votacao_abre_em?: string | null
          votacao_ativa?: boolean
          votacao_fecha_em?: string | null
          votacao_finalizada_em?: string | null
          votacao_resultado?: string | null
        }
        Update: {
          anexo_url?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          base_legal?: string | null
          created_at?: string
          criado_por?: string | null
          data_fim_compensacao?: string
          data_inicio_compensacao?: string
          dias_compensacao?: Json
          dias_dispensados?: Json
          empresa_id?: string
          feriado_data?: string | null
          id?: string
          minutos_dispensados?: number | null
          minutos_por_dia?: number
          modalidade?: string
          motivo?: string
          observacoes?: string | null
          quorum_percentual?: number
          status?: string
          termo_ciencia_url?: string | null
          tipo_dispensa?: string | null
          titulo?: string
          total_elegiveis?: number
          total_minutos_a_compensar?: number
          total_votos_nao?: number
          total_votos_sim?: number
          updated_at?: string
          usa_banco_horas?: boolean
          votacao_abre_em?: string | null
          votacao_ativa?: boolean
          votacao_fecha_em?: string | null
          votacao_finalizada_em?: string | null
          votacao_resultado?: string | null
        }
        Relationships: []
      }
      ponto_compensacao_participantes: {
        Row: {
          aceito_em: string | null
          acordo_id: string
          assinatura_token: string | null
          created_at: string
          funcionario_id: string
          id: string
          observacoes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aceito_em?: string | null
          acordo_id: string
          assinatura_token?: string | null
          created_at?: string
          funcionario_id: string
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aceito_em?: string | null
          acordo_id?: string
          assinatura_token?: string | null
          created_at?: string
          funcionario_id?: string
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_compensacao_participantes_acordo_id_fkey"
            columns: ["acordo_id"]
            isOneToOne: false
            referencedRelation: "ponto_compensacao_acordos"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_compensacao_votos: {
        Row: {
          acordo_id: string
          created_at: string
          funcionario_id: string
          id: string
          ip: string | null
          justificativa: string | null
          user_agent: string | null
          voto: string
        }
        Insert: {
          acordo_id: string
          created_at?: string
          funcionario_id: string
          id?: string
          ip?: string | null
          justificativa?: string | null
          user_agent?: string | null
          voto: string
        }
        Update: {
          acordo_id?: string
          created_at?: string
          funcionario_id?: string
          id?: string
          ip?: string | null
          justificativa?: string | null
          user_agent?: string | null
          voto?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_compensacao_votos_acordo_id_fkey"
            columns: ["acordo_id"]
            isOneToOne: false
            referencedRelation: "ponto_compensacao_acordos"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_departamentos: {
        Row: {
          ativo: boolean
          centro_custo: string | null
          created_at: string
          descricao: string | null
          empresa_id: string | null
          filial_id: string | null
          global: boolean
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          centro_custo?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          filial_id?: string | null
          global?: boolean
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          centro_custo?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          filial_id?: string | null
          global?: boolean
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_departamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_departamentos_unidade_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_dispositivos_autorizados: {
        Row: {
          ativo: boolean
          created_at: string
          device_id: string
          funcionario_id: string
          id: string
          modelo: string | null
          plataforma: string | null
          ultimo_uso: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          device_id: string
          funcionario_id: string
          id?: string
          modelo?: string | null
          plataforma?: string | null
          ultimo_uso?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          device_id?: string
          funcionario_id?: string
          id?: string
          modelo?: string | null
          plataforma?: string | null
          ultimo_uso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_dispositivos_autorizados_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_dispositivos_autorizados_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_empresas: {
        Row: {
          antifraude_ativo: boolean
          ativo: boolean
          cep: string | null
          cidade: string | null
          cnpj: string
          codigo_dominio: string | null
          coletor_cameras_habilitado: boolean
          created_at: string
          endereco: string | null
          estabelecimento_id: string
          geofence_obrigatorio_app: boolean
          id: string
          inscricao_estadual: string | null
          nome_fantasia: string | null
          razao_social: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          antifraude_ativo?: boolean
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj: string
          codigo_dominio?: string | null
          coletor_cameras_habilitado?: boolean
          created_at?: string
          endereco?: string | null
          estabelecimento_id: string
          geofence_obrigatorio_app?: boolean
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          razao_social: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          antifraude_ativo?: boolean
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          codigo_dominio?: string | null
          coletor_cameras_habilitado?: boolean
          created_at?: string
          endereco?: string | null
          estabelecimento_id?: string
          geofence_obrigatorio_app?: boolean
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ponto_equipamentos: {
        Row: {
          acesso_dados: string | null
          ativo: boolean
          chave_comunicacao: string | null
          cnpj_fornecedor: string | null
          codigo: string | null
          created_at: string
          data_inicio_coleta: string | null
          emails_notificacao: string | null
          empresa_id: string
          filial_id: string | null
          firmware: string | null
          id: string
          ip: string | null
          marca: string | null
          modelo: string | null
          nome: string
          nome_local: string | null
          numero_fabricacao: string | null
          porta: number | null
          protocolo: string | null
          resultado_teste: string | null
          senha: string | null
          serial: string | null
          solicitar_teste: boolean
          status: string | null
          tipo_relogio: string | null
          ultima_sync: string | null
          ultimo_erro: string | null
          updated_at: string
          usa_https: boolean
          usuario: string | null
        }
        Insert: {
          acesso_dados?: string | null
          ativo?: boolean
          chave_comunicacao?: string | null
          cnpj_fornecedor?: string | null
          codigo?: string | null
          created_at?: string
          data_inicio_coleta?: string | null
          emails_notificacao?: string | null
          empresa_id: string
          filial_id?: string | null
          firmware?: string | null
          id?: string
          ip?: string | null
          marca?: string | null
          modelo?: string | null
          nome: string
          nome_local?: string | null
          numero_fabricacao?: string | null
          porta?: number | null
          protocolo?: string | null
          resultado_teste?: string | null
          senha?: string | null
          serial?: string | null
          solicitar_teste?: boolean
          status?: string | null
          tipo_relogio?: string | null
          ultima_sync?: string | null
          ultimo_erro?: string | null
          updated_at?: string
          usa_https?: boolean
          usuario?: string | null
        }
        Update: {
          acesso_dados?: string | null
          ativo?: boolean
          chave_comunicacao?: string | null
          cnpj_fornecedor?: string | null
          codigo?: string | null
          created_at?: string
          data_inicio_coleta?: string | null
          emails_notificacao?: string | null
          empresa_id?: string
          filial_id?: string | null
          firmware?: string | null
          id?: string
          ip?: string | null
          marca?: string | null
          modelo?: string | null
          nome?: string
          nome_local?: string | null
          numero_fabricacao?: string | null
          porta?: number | null
          protocolo?: string | null
          resultado_teste?: string | null
          senha?: string | null
          serial?: string | null
          solicitar_teste?: boolean
          status?: string | null
          tipo_relogio?: string | null
          ultima_sync?: string | null
          ultimo_erro?: string | null
          updated_at?: string
          usa_https?: boolean
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_equipamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_equipamentos_unidade_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_equipe_membros: {
        Row: {
          created_at: string
          equipe_id: string
          funcionario_id: string
          id: string
        }
        Insert: {
          created_at?: string
          equipe_id: string
          funcionario_id: string
          id?: string
        }
        Update: {
          created_at?: string
          equipe_id?: string
          funcionario_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_equipe_membros_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "ponto_equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_equipe_membros_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_equipe_membros_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_equipes: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          departamento_id: string | null
          descricao: string | null
          empresa_id: string | null
          filial_id: string | null
          global: boolean
          id: string
          lider_funcionario_id: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          departamento_id?: string | null
          descricao?: string | null
          empresa_id?: string | null
          filial_id?: string | null
          global?: boolean
          id?: string
          lider_funcionario_id?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          departamento_id?: string | null
          descricao?: string | null
          empresa_id?: string | null
          filial_id?: string | null
          global?: boolean
          id?: string
          lider_funcionario_id?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_equipes_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "ponto_departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_equipes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_equipes_lider_funcionario_id_fkey"
            columns: ["lider_funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_equipes_lider_funcionario_id_fkey"
            columns: ["lider_funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_equipes_unidade_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_escala_sugestoes: {
        Row: {
          aplicada: boolean
          aplicada_em: string | null
          carga_estimada: number | null
          created_at: string
          created_by: string | null
          data: string
          departamento_id: string | null
          empresa_id: string | null
          filial_id: string | null
          funcionarios_sugeridos: string[] | null
          fundamentacao: string | null
          id: string
          turno: string | null
        }
        Insert: {
          aplicada?: boolean
          aplicada_em?: string | null
          carga_estimada?: number | null
          created_at?: string
          created_by?: string | null
          data: string
          departamento_id?: string | null
          empresa_id?: string | null
          filial_id?: string | null
          funcionarios_sugeridos?: string[] | null
          fundamentacao?: string | null
          id?: string
          turno?: string | null
        }
        Update: {
          aplicada?: boolean
          aplicada_em?: string | null
          carga_estimada?: number | null
          created_at?: string
          created_by?: string | null
          data?: string
          departamento_id?: string | null
          empresa_id?: string | null
          filial_id?: string | null
          funcionarios_sugeridos?: string[] | null
          fundamentacao?: string | null
          id?: string
          turno?: string | null
        }
        Relationships: []
      }
      ponto_escalas: {
        Row: {
          aplicar_tolerancia_flexivel: boolean
          ativo: boolean
          carga_semanal_minutos: number | null
          codigo: string | null
          controlar_nr17: boolean
          created_at: string
          descricao: string | null
          empresa_id: string
          hora_desconto_dsr: string | null
          id: string
          ignorar_afastamento_ciclico: boolean
          ignorar_feriados: boolean
          intervalo_flexivel: boolean
          intervalo_minutos: number | null
          intervalo_preassinalado: Json
          intrajornada_config: Json
          jornada: Json
          jornada_feriados: Json
          jornada_flexivel: boolean
          marcacao_excecao: boolean
          nome: string
          noturna: boolean | null
          tipo: string
          updated_at: string
        }
        Insert: {
          aplicar_tolerancia_flexivel?: boolean
          ativo?: boolean
          carga_semanal_minutos?: number | null
          codigo?: string | null
          controlar_nr17?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id: string
          hora_desconto_dsr?: string | null
          id?: string
          ignorar_afastamento_ciclico?: boolean
          ignorar_feriados?: boolean
          intervalo_flexivel?: boolean
          intervalo_minutos?: number | null
          intervalo_preassinalado?: Json
          intrajornada_config?: Json
          jornada?: Json
          jornada_feriados?: Json
          jornada_flexivel?: boolean
          marcacao_excecao?: boolean
          nome: string
          noturna?: boolean | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          aplicar_tolerancia_flexivel?: boolean
          ativo?: boolean
          carga_semanal_minutos?: number | null
          codigo?: string | null
          controlar_nr17?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          hora_desconto_dsr?: string | null
          id?: string
          ignorar_afastamento_ciclico?: boolean
          ignorar_feriados?: boolean
          intervalo_flexivel?: boolean
          intervalo_minutos?: number | null
          intervalo_preassinalado?: Json
          intrajornada_config?: Json
          jornada?: Json
          jornada_feriados?: Json
          jornada_flexivel?: boolean
          marcacao_excecao?: boolean
          nome?: string
          noturna?: boolean | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_escalas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_esocial_eventos: {
        Row: {
          created_at: string
          enviado_em: string | null
          estabelecimento_id: string
          evento: string
          funcionario_id: string | null
          id: string
          payload: Json
          protocolo: string | null
          recibo: string | null
          referencia_id: string | null
          resposta: Json | null
          status: string
          updated_at: string
          xml: string | null
        }
        Insert: {
          created_at?: string
          enviado_em?: string | null
          estabelecimento_id: string
          evento: string
          funcionario_id?: string | null
          id?: string
          payload?: Json
          protocolo?: string | null
          recibo?: string | null
          referencia_id?: string | null
          resposta?: Json | null
          status?: string
          updated_at?: string
          xml?: string | null
        }
        Update: {
          created_at?: string
          enviado_em?: string | null
          estabelecimento_id?: string
          evento?: string
          funcionario_id?: string | null
          id?: string
          payload?: Json
          protocolo?: string | null
          recibo?: string | null
          referencia_id?: string | null
          resposta?: Json | null
          status?: string
          updated_at?: string
          xml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_esocial_eventos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_esocial_eventos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_esocial_fila: {
        Row: {
          created_at: string
          evento_id: string | null
          id: string
          max_tentativas: number
          movido_dlq_em: string | null
          payload: Json
          processado_em: string | null
          proxima_tentativa: string
          status: string
          tentativas: number
          tipo_evento: string
          ultimo_codigo: string | null
          ultimo_erro: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          evento_id?: string | null
          id?: string
          max_tentativas?: number
          movido_dlq_em?: string | null
          payload: Json
          processado_em?: string | null
          proxima_tentativa?: string
          status?: string
          tentativas?: number
          tipo_evento: string
          ultimo_codigo?: string | null
          ultimo_erro?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          evento_id?: string | null
          id?: string
          max_tentativas?: number
          movido_dlq_em?: string | null
          payload?: Json
          processado_em?: string | null
          proxima_tentativa?: string
          status?: string
          tentativas?: number
          tipo_evento?: string
          ultimo_codigo?: string | null
          ultimo_erro?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_esocial_fila_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "ponto_esocial_eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_espelho_diario: {
        Row: {
          abono_min: number | null
          afastamento_id: string | null
          atestado_id: string | null
          atraso_min: number | null
          calculado_em: string | null
          created_at: string
          data: string
          dsr_min: number | null
          entrada: string | null
          extra_min: number | null
          falta: boolean | null
          funcionario_id: string
          id: string
          minutos_trabalhados: number | null
          noturno_min: number | null
          noturno_min_reduzido: number | null
          retorno_intervalo: string | null
          saida: string | null
          saida_antec_min: number | null
          saida_intervalo: string | null
          saldo_banco_min: number | null
          tipo_dia: string | null
          updated_at: string
        }
        Insert: {
          abono_min?: number | null
          afastamento_id?: string | null
          atestado_id?: string | null
          atraso_min?: number | null
          calculado_em?: string | null
          created_at?: string
          data: string
          dsr_min?: number | null
          entrada?: string | null
          extra_min?: number | null
          falta?: boolean | null
          funcionario_id: string
          id?: string
          minutos_trabalhados?: number | null
          noturno_min?: number | null
          noturno_min_reduzido?: number | null
          retorno_intervalo?: string | null
          saida?: string | null
          saida_antec_min?: number | null
          saida_intervalo?: string | null
          saldo_banco_min?: number | null
          tipo_dia?: string | null
          updated_at?: string
        }
        Update: {
          abono_min?: number | null
          afastamento_id?: string | null
          atestado_id?: string | null
          atraso_min?: number | null
          calculado_em?: string | null
          created_at?: string
          data?: string
          dsr_min?: number | null
          entrada?: string | null
          extra_min?: number | null
          falta?: boolean | null
          funcionario_id?: string
          id?: string
          minutos_trabalhados?: number | null
          noturno_min?: number | null
          noturno_min_reduzido?: number | null
          retorno_intervalo?: string | null
          saida?: string | null
          saida_antec_min?: number | null
          saida_intervalo?: string | null
          saldo_banco_min?: number | null
          tipo_dia?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_espelho_diario_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_espelho_diario_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_espelho_envios: {
        Row: {
          created_at: string
          enviado_em: string | null
          funcionario_id: string
          hash_espelho: string | null
          id: string
          mes_referencia: string
          motivo_rejeicao: string | null
          respondido_em: string | null
          status: string
          token: string
          updated_at: string
          visualizado_em: string | null
        }
        Insert: {
          created_at?: string
          enviado_em?: string | null
          funcionario_id: string
          hash_espelho?: string | null
          id?: string
          mes_referencia: string
          motivo_rejeicao?: string | null
          respondido_em?: string | null
          status?: string
          token?: string
          updated_at?: string
          visualizado_em?: string | null
        }
        Update: {
          created_at?: string
          enviado_em?: string | null
          funcionario_id?: string
          hash_espelho?: string | null
          id?: string
          mes_referencia?: string
          motivo_rejeicao?: string | null
          respondido_em?: string | null
          status?: string
          token?: string
          updated_at?: string
          visualizado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_espelho_envios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_espelho_envios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_export_layouts: {
        Row: {
          ativo: boolean
          considerar_abono_parcial: boolean
          considerar_banco_horas: boolean
          considerar_comissionistas: boolean
          considerar_suspensao: boolean
          created_at: string
          desconsiderar_ignoradas_bh: boolean
          descricao: string
          empresa_id: string
          eventos: Json
          filtrar_por: string
          filtro_fechamento: string | null
          formato_horas: string
          id: string
          incluir_dias_falta: boolean
          periodo_fim: string | null
          periodo_inicio: string | null
          software: string
          tamanho_matricula: number
          token_integracao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          considerar_abono_parcial?: boolean
          considerar_banco_horas?: boolean
          considerar_comissionistas?: boolean
          considerar_suspensao?: boolean
          created_at?: string
          desconsiderar_ignoradas_bh?: boolean
          descricao: string
          empresa_id: string
          eventos?: Json
          filtrar_por?: string
          filtro_fechamento?: string | null
          formato_horas?: string
          id?: string
          incluir_dias_falta?: boolean
          periodo_fim?: string | null
          periodo_inicio?: string | null
          software?: string
          tamanho_matricula?: number
          token_integracao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          considerar_abono_parcial?: boolean
          considerar_banco_horas?: boolean
          considerar_comissionistas?: boolean
          considerar_suspensao?: boolean
          created_at?: string
          desconsiderar_ignoradas_bh?: boolean
          descricao?: string
          empresa_id?: string
          eventos?: Json
          filtrar_por?: string
          filtro_fechamento?: string | null
          formato_horas?: string
          id?: string
          incluir_dias_falta?: boolean
          periodo_fim?: string | null
          periodo_inicio?: string | null
          software?: string
          tamanho_matricula?: number
          token_integracao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_export_layouts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_export_logs: {
        Row: {
          arquivo_conteudo: string | null
          arquivo_url: string | null
          created_at: string
          empresa_id: string
          erros_json: Json | null
          formato: string
          gerado_por: string | null
          id: string
          layout: string | null
          observacao: string | null
          periodo_fim: string
          periodo_inicio: string
          status: string
          total_funcionarios: number | null
          total_registros: number | null
        }
        Insert: {
          arquivo_conteudo?: string | null
          arquivo_url?: string | null
          created_at?: string
          empresa_id: string
          erros_json?: Json | null
          formato?: string
          gerado_por?: string | null
          id?: string
          layout?: string | null
          observacao?: string | null
          periodo_fim: string
          periodo_inicio: string
          status?: string
          total_funcionarios?: number | null
          total_registros?: number | null
        }
        Update: {
          arquivo_conteudo?: string | null
          arquivo_url?: string | null
          created_at?: string
          empresa_id?: string
          erros_json?: Json | null
          formato?: string
          gerado_por?: string | null
          id?: string
          layout?: string | null
          observacao?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
          total_funcionarios?: number | null
          total_registros?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_export_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_feriados: {
        Row: {
          created_at: string
          data: string
          empresa_id: string
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          created_at?: string
          data: string
          empresa_id: string
          id?: string
          nome: string
          tipo?: string
        }
        Update: {
          created_at?: string
          data?: string
          empresa_id?: string
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_feriados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_ferias_afastamentos: {
        Row: {
          abono_pecuniario_dias: number
          aprovacoes: Json
          bloqueia_marcacao: boolean
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          dias: number | null
          documento_url: string | null
          esocial_enviado_em: string | null
          esocial_evento: string | null
          estabelecimento_id: string
          funcionario_id: string
          id: string
          motivo: string | null
          nivel_aprovacao_atual: number
          nivel_aprovacao_max: number
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          abono_pecuniario_dias?: number
          aprovacoes?: Json
          bloqueia_marcacao?: boolean
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          dias?: number | null
          documento_url?: string | null
          esocial_enviado_em?: string | null
          esocial_evento?: string | null
          estabelecimento_id: string
          funcionario_id: string
          id?: string
          motivo?: string | null
          nivel_aprovacao_atual?: number
          nivel_aprovacao_max?: number
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          abono_pecuniario_dias?: number
          aprovacoes?: Json
          bloqueia_marcacao?: boolean
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          dias?: number | null
          documento_url?: string | null
          esocial_enviado_em?: string | null
          esocial_evento?: string | null
          estabelecimento_id?: string
          funcionario_id?: string
          id?: string
          motivo?: string | null
          nivel_aprovacao_atual?: number
          nivel_aprovacao_max?: number
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_ferias_afastamentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_ferias_afastamentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_filiais: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          cnpj: string | null
          codigo_dominio: string | null
          created_at: string
          empresa_id: string
          endereco: string | null
          gps_lat: number | null
          gps_lon: number | null
          id: string
          inscricao_estadual: string | null
          nome: string
          raio_metros: number | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo_dominio?: string | null
          created_at?: string
          empresa_id: string
          endereco?: string | null
          gps_lat?: number | null
          gps_lon?: number | null
          id?: string
          inscricao_estadual?: string | null
          nome: string
          raio_metros?: number | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo_dominio?: string | null
          created_at?: string
          empresa_id?: string
          endereco?: string | null
          gps_lat?: number | null
          gps_lon?: number | null
          id?: string
          inscricao_estadual?: string | null
          nome?: string
          raio_metros?: number | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_filiais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_funcionario_dependentes: {
        Row: {
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          deduz_irrf: boolean
          funcionario_id: string
          id: string
          nome: string
          previdenciario: boolean
          salario_familia: boolean
          tipo: string
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          deduz_irrf?: boolean
          funcionario_id: string
          id?: string
          nome: string
          previdenciario?: boolean
          salario_familia?: boolean
          tipo: string
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          deduz_irrf?: boolean
          funcionario_id?: string
          id?: string
          nome?: string
          previdenciario?: boolean
          salario_familia?: boolean
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_funcionario_dependentes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_funcionario_dependentes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_funcionario_documentos: {
        Row: {
          arquivo_url: string | null
          created_at: string
          data_expedicao: string | null
          funcionario_id: string
          id: string
          numero: string
          orgao_expedidor: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          data_expedicao?: string | null
          funcionario_id: string
          id?: string
          numero: string
          orgao_expedidor?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          data_expedicao?: string | null
          funcionario_id?: string
          id?: string
          numero?: string
          orgao_expedidor?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_funcionario_documentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_funcionario_documentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_funcionario_escala_historico: {
        Row: {
          alterado_por: string | null
          cargo_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          departamento_id: string | null
          empresa_id: string | null
          escala_id: string | null
          filial_id: string | null
          funcionario_id: string
          id: string
          jornada_contratada_horas: number | null
          motivo: string | null
          valor_hora: number | null
        }
        Insert: {
          alterado_por?: string | null
          cargo_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          departamento_id?: string | null
          empresa_id?: string | null
          escala_id?: string | null
          filial_id?: string | null
          funcionario_id: string
          id?: string
          jornada_contratada_horas?: number | null
          motivo?: string | null
          valor_hora?: number | null
        }
        Update: {
          alterado_por?: string | null
          cargo_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          departamento_id?: string | null
          empresa_id?: string | null
          escala_id?: string | null
          filial_id?: string | null
          funcionario_id?: string
          id?: string
          jornada_contratada_horas?: number | null
          motivo?: string | null
          valor_hora?: number | null
        }
        Relationships: []
      }
      ponto_funcionario_geofences: {
        Row: {
          created_at: string
          funcionario_id: string
          geofence_id: string
          id: string
        }
        Insert: {
          created_at?: string
          funcionario_id: string
          geofence_id: string
          id?: string
        }
        Update: {
          created_at?: string
          funcionario_id?: string
          geofence_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_funcionario_geofences_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_funcionario_geofences_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_funcionario_geofences_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "ponto_geofences"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_funcionario_metodos: {
        Row: {
          created_at: string
          exige_face: boolean
          exige_gps: boolean
          exige_rede_autorizada: boolean
          funcionario_id: string
          observacao: string | null
          permite_app: boolean
          permite_catraca: boolean
          permite_kiosk: boolean
          permite_offline: boolean
          permite_qr: boolean
          permite_web: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          exige_face?: boolean
          exige_gps?: boolean
          exige_rede_autorizada?: boolean
          funcionario_id: string
          observacao?: string | null
          permite_app?: boolean
          permite_catraca?: boolean
          permite_kiosk?: boolean
          permite_offline?: boolean
          permite_qr?: boolean
          permite_web?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          exige_face?: boolean
          exige_gps?: boolean
          exige_rede_autorizada?: boolean
          funcionario_id?: string
          observacao?: string | null
          permite_app?: boolean
          permite_catraca?: boolean
          permite_kiosk?: boolean
          permite_offline?: boolean
          permite_qr?: boolean
          permite_web?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_funcionario_metodos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: true
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_funcionario_metodos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: true
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_funcionario_notif_prefs: {
        Row: {
          aceita_email: boolean
          aceita_push: boolean
          aceita_sms: boolean
          aceita_whatsapp: boolean
          canais_preferidos: string[]
          estabelecimento_id: string
          funcionario_id: string
          updated_at: string
        }
        Insert: {
          aceita_email?: boolean
          aceita_push?: boolean
          aceita_sms?: boolean
          aceita_whatsapp?: boolean
          canais_preferidos?: string[]
          estabelecimento_id: string
          funcionario_id: string
          updated_at?: string
        }
        Update: {
          aceita_email?: boolean
          aceita_push?: boolean
          aceita_sms?: boolean
          aceita_whatsapp?: boolean
          canais_preferidos?: string[]
          estabelecimento_id?: string
          funcionario_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ponto_funcionario_vinculos: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          data_admissao: string | null
          data_demissao: string | null
          estabelecimento_id: string
          filial_id: string | null
          funcionario_id: string
          id: string
          matricula: string | null
          ponto_empresa_id: string
          principal: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          estabelecimento_id: string
          filial_id?: string | null
          funcionario_id: string
          id?: string
          matricula?: string | null
          ponto_empresa_id: string
          principal?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          estabelecimento_id?: string
          filial_id?: string | null
          funcionario_id?: string
          id?: string
          matricula?: string | null
          ponto_empresa_id?: string
          principal?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_funcionario_vinculos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_funcionario_vinculos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_funcionario_vinculos_ponto_empresa_id_fkey"
            columns: ["ponto_empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_funcionario_vinculos_unidade_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_funcionarios: {
        Row: {
          admissao: string | null
          auth_user_id: string | null
          bairro: string | null
          cargo: string | null
          cargo_id: string | null
          centro_custo: string | null
          cep: string | null
          cidade: string | null
          cidade_nascimento: string | null
          codigo_dominio: string | null
          complemento: string | null
          config_controle_ponto: string | null
          cpf: string
          created_at: string
          data_inicio_ponto: string | null
          data_nascimento: string | null
          deficiencia_auditiva: boolean
          deficiencia_fisica: boolean
          deficiencia_intelectual: boolean
          deficiencia_mental: boolean
          deficiencia_visual: boolean
          demissao: string | null
          departamento_id: string | null
          eh_aposentado: boolean
          eh_clt: boolean
          email: string | null
          email_alt: string | null
          empresa_id: string
          endereco: string | null
          escala_id: string | null
          escolaridade: string | null
          estado_civil: string | null
          etnia: string | null
          face_enrolled_at: string | null
          face_match_threshold: number
          face_url: string | null
          filial_id: string | null
          foto_referencia_url: string | null
          foto_url: string | null
          genero: string | null
          id: string
          jornada_contratada_horas: number | null
          layout_exportacao_id: string | null
          matricula: string | null
          matricula_esocial: string | null
          nome: string
          nome_mae: string | null
          nome_pai: string | null
          notas: string | null
          notas_especiais: string | null
          numero: string | null
          pais_nascimento: string | null
          permitir_localizacao: string | null
          permitir_offline: string | null
          permitir_qualquer_dispositivo: boolean
          pin: string | null
          pis: string | null
          reabilitado: boolean
          registra_ponto: boolean
          sobrenome: string | null
          status: string
          telefone: string | null
          telefone_alt: string | null
          tipo_contrato: string | null
          tipo_local: string | null
          tipo_registro_ponto: string | null
          uf: string | null
          updated_at: string
          valor_hora: number | null
        }
        Insert: {
          admissao?: string | null
          auth_user_id?: string | null
          bairro?: string | null
          cargo?: string | null
          cargo_id?: string | null
          centro_custo?: string | null
          cep?: string | null
          cidade?: string | null
          cidade_nascimento?: string | null
          codigo_dominio?: string | null
          complemento?: string | null
          config_controle_ponto?: string | null
          cpf: string
          created_at?: string
          data_inicio_ponto?: string | null
          data_nascimento?: string | null
          deficiencia_auditiva?: boolean
          deficiencia_fisica?: boolean
          deficiencia_intelectual?: boolean
          deficiencia_mental?: boolean
          deficiencia_visual?: boolean
          demissao?: string | null
          departamento_id?: string | null
          eh_aposentado?: boolean
          eh_clt?: boolean
          email?: string | null
          email_alt?: string | null
          empresa_id: string
          endereco?: string | null
          escala_id?: string | null
          escolaridade?: string | null
          estado_civil?: string | null
          etnia?: string | null
          face_enrolled_at?: string | null
          face_match_threshold?: number
          face_url?: string | null
          filial_id?: string | null
          foto_referencia_url?: string | null
          foto_url?: string | null
          genero?: string | null
          id?: string
          jornada_contratada_horas?: number | null
          layout_exportacao_id?: string | null
          matricula?: string | null
          matricula_esocial?: string | null
          nome: string
          nome_mae?: string | null
          nome_pai?: string | null
          notas?: string | null
          notas_especiais?: string | null
          numero?: string | null
          pais_nascimento?: string | null
          permitir_localizacao?: string | null
          permitir_offline?: string | null
          permitir_qualquer_dispositivo?: boolean
          pin?: string | null
          pis?: string | null
          reabilitado?: boolean
          registra_ponto?: boolean
          sobrenome?: string | null
          status?: string
          telefone?: string | null
          telefone_alt?: string | null
          tipo_contrato?: string | null
          tipo_local?: string | null
          tipo_registro_ponto?: string | null
          uf?: string | null
          updated_at?: string
          valor_hora?: number | null
        }
        Update: {
          admissao?: string | null
          auth_user_id?: string | null
          bairro?: string | null
          cargo?: string | null
          cargo_id?: string | null
          centro_custo?: string | null
          cep?: string | null
          cidade?: string | null
          cidade_nascimento?: string | null
          codigo_dominio?: string | null
          complemento?: string | null
          config_controle_ponto?: string | null
          cpf?: string
          created_at?: string
          data_inicio_ponto?: string | null
          data_nascimento?: string | null
          deficiencia_auditiva?: boolean
          deficiencia_fisica?: boolean
          deficiencia_intelectual?: boolean
          deficiencia_mental?: boolean
          deficiencia_visual?: boolean
          demissao?: string | null
          departamento_id?: string | null
          eh_aposentado?: boolean
          eh_clt?: boolean
          email?: string | null
          email_alt?: string | null
          empresa_id?: string
          endereco?: string | null
          escala_id?: string | null
          escolaridade?: string | null
          estado_civil?: string | null
          etnia?: string | null
          face_enrolled_at?: string | null
          face_match_threshold?: number
          face_url?: string | null
          filial_id?: string | null
          foto_referencia_url?: string | null
          foto_url?: string | null
          genero?: string | null
          id?: string
          jornada_contratada_horas?: number | null
          layout_exportacao_id?: string | null
          matricula?: string | null
          matricula_esocial?: string | null
          nome?: string
          nome_mae?: string | null
          nome_pai?: string | null
          notas?: string | null
          notas_especiais?: string | null
          numero?: string | null
          pais_nascimento?: string | null
          permitir_localizacao?: string | null
          permitir_offline?: string | null
          permitir_qualquer_dispositivo?: boolean
          pin?: string | null
          pis?: string | null
          reabilitado?: boolean
          registra_ponto?: boolean
          sobrenome?: string | null
          status?: string
          telefone?: string | null
          telefone_alt?: string | null
          tipo_contrato?: string | null
          tipo_local?: string | null
          tipo_registro_ponto?: string | null
          uf?: string | null
          updated_at?: string
          valor_hora?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_funcionarios_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "ponto_cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_funcionarios_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "ponto_departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_funcionarios_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "ponto_escalas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_funcionarios_layout_exportacao_id_fkey"
            columns: ["layout_exportacao_id"]
            isOneToOne: false
            referencedRelation: "ponto_export_layouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_funcionarios_unidade_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_geofences: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          filial_id: string | null
          id: string
          lat: number
          lng: number
          nome: string
          raio_metros: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          filial_id?: string | null
          id?: string
          lat: number
          lng: number
          nome: string
          raio_metros?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          filial_id?: string | null
          id?: string
          lat?: number
          lng?: number
          nome?: string
          raio_metros?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_geofences_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_geofences_unidade_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_importacoes: {
        Row: {
          arquivo_nome: string | null
          created_at: string
          created_by: string | null
          erros: Json | null
          estabelecimento_id: string
          id: string
          status: string
          tipo: string
          total_erro: number | null
          total_linhas: number | null
          total_sucesso: number | null
          updated_at: string
        }
        Insert: {
          arquivo_nome?: string | null
          created_at?: string
          created_by?: string | null
          erros?: Json | null
          estabelecimento_id: string
          id?: string
          status?: string
          tipo: string
          total_erro?: number | null
          total_linhas?: number | null
          total_sucesso?: number | null
          updated_at?: string
        }
        Update: {
          arquivo_nome?: string | null
          created_at?: string
          created_by?: string | null
          erros?: Json | null
          estabelecimento_id?: string
          id?: string
          status?: string
          tipo?: string
          total_erro?: number | null
          total_linhas?: number | null
          total_sucesso?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ponto_kiosk_sessoes: {
        Row: {
          ativo: boolean
          created_at: string
          device_fingerprint: string
          equipamento_id: string | null
          geofence_id: string | null
          id: string
          ip_permitido: unknown[] | null
          modo: string
          pin_hash: string
          ultimo_heartbeat: string | null
          updated_at: string
          versao_app: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          device_fingerprint: string
          equipamento_id?: string | null
          geofence_id?: string | null
          id?: string
          ip_permitido?: unknown[] | null
          modo?: string
          pin_hash: string
          ultimo_heartbeat?: string | null
          updated_at?: string
          versao_app?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          device_fingerprint?: string
          equipamento_id?: string | null
          geofence_id?: string | null
          id?: string
          ip_permitido?: unknown[] | null
          modo?: string
          pin_hash?: string
          ultimo_heartbeat?: string | null
          updated_at?: string
          versao_app?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_kiosk_sessoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "ponto_equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_lgpd_solicitacoes: {
        Row: {
          arquivo_resultado_url: string | null
          created_at: string
          funcionario_id: string
          id: string
          motivo: string | null
          prazo_resposta: string | null
          respondido_em: string | null
          respondido_por: string | null
          resposta: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          arquivo_resultado_url?: string | null
          created_at?: string
          funcionario_id: string
          id?: string
          motivo?: string | null
          prazo_resposta?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          resposta?: string | null
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          arquivo_resultado_url?: string | null
          created_at?: string
          funcionario_id?: string
          id?: string
          motivo?: string | null
          prazo_resposta?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          resposta?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_lgpd_solicitacoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_lgpd_solicitacoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_notif_workflows: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          evento_gatilho: string
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
          evento_gatilho: string
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
          evento_gatilho?: string
          flow_data?: Json
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      ponto_notificacoes_config: {
        Row: {
          bypass_quiet_hours_tipos: Json
          canais: Json
          canais_por_evento: Json
          created_at: string
          dedupe_janela_horas: number
          destinatarios_emails: Json
          destinatarios_telefones: Json
          dias_aviso_expiracao: number
          email_ativo: boolean
          enviar_fins_de_semana: boolean
          escalonamento_ativo: boolean
          escalonamento_emails: Json
          escalonamento_horas: number
          escalonamento_telefones: Json
          estabelecimento_id: string
          id: string
          mensagens_template: Json
          mensagens_template_lider: Json
          notif_atestado_pendente: boolean
          notif_atraso: boolean
          notif_banco_horas_expirar: boolean
          notif_falta: boolean
          notif_fraude: boolean
          notif_he_pendente: boolean
          notificar_funcionario: boolean
          push_ativo: boolean
          quiet_hours_fim: string | null
          quiet_hours_inicio: string | null
          rate_limit_por_hora: number
          resumo_canal: string | null
          resumo_diario_ativo: boolean
          resumo_diario_hora: string | null
          sms_ativo: boolean
          updated_at: string
          webhook_url: string | null
          whatsapp_ativo: boolean
          whatsapp_permite_confirmacao: boolean
        }
        Insert: {
          bypass_quiet_hours_tipos?: Json
          canais?: Json
          canais_por_evento?: Json
          created_at?: string
          dedupe_janela_horas?: number
          destinatarios_emails?: Json
          destinatarios_telefones?: Json
          dias_aviso_expiracao?: number
          email_ativo?: boolean
          enviar_fins_de_semana?: boolean
          escalonamento_ativo?: boolean
          escalonamento_emails?: Json
          escalonamento_horas?: number
          escalonamento_telefones?: Json
          estabelecimento_id: string
          id?: string
          mensagens_template?: Json
          mensagens_template_lider?: Json
          notif_atestado_pendente?: boolean
          notif_atraso?: boolean
          notif_banco_horas_expirar?: boolean
          notif_falta?: boolean
          notif_fraude?: boolean
          notif_he_pendente?: boolean
          notificar_funcionario?: boolean
          push_ativo?: boolean
          quiet_hours_fim?: string | null
          quiet_hours_inicio?: string | null
          rate_limit_por_hora?: number
          resumo_canal?: string | null
          resumo_diario_ativo?: boolean
          resumo_diario_hora?: string | null
          sms_ativo?: boolean
          updated_at?: string
          webhook_url?: string | null
          whatsapp_ativo?: boolean
          whatsapp_permite_confirmacao?: boolean
        }
        Update: {
          bypass_quiet_hours_tipos?: Json
          canais?: Json
          canais_por_evento?: Json
          created_at?: string
          dedupe_janela_horas?: number
          destinatarios_emails?: Json
          destinatarios_telefones?: Json
          dias_aviso_expiracao?: number
          email_ativo?: boolean
          enviar_fins_de_semana?: boolean
          escalonamento_ativo?: boolean
          escalonamento_emails?: Json
          escalonamento_horas?: number
          escalonamento_telefones?: Json
          estabelecimento_id?: string
          id?: string
          mensagens_template?: Json
          mensagens_template_lider?: Json
          notif_atestado_pendente?: boolean
          notif_atraso?: boolean
          notif_banco_horas_expirar?: boolean
          notif_falta?: boolean
          notif_fraude?: boolean
          notif_he_pendente?: boolean
          notificar_funcionario?: boolean
          push_ativo?: boolean
          quiet_hours_fim?: string | null
          quiet_hours_inicio?: string | null
          rate_limit_por_hora?: number
          resumo_canal?: string | null
          resumo_diario_ativo?: boolean
          resumo_diario_hora?: string | null
          sms_ativo?: boolean
          updated_at?: string
          webhook_url?: string | null
          whatsapp_ativo?: boolean
          whatsapp_permite_confirmacao?: boolean
        }
        Relationships: []
      }
      ponto_notificacoes_envios: {
        Row: {
          canal: string
          confirmado_em: string | null
          confirmado_via: string | null
          created_at: string
          custo_estimado: number | null
          dedupe_hash: string | null
          destinatario: string | null
          erro: string | null
          estabelecimento_id: string
          funcionario_id: string | null
          id: string
          mensagem: string | null
          status: string
          tipo: string
          titulo: string | null
        }
        Insert: {
          canal: string
          confirmado_em?: string | null
          confirmado_via?: string | null
          created_at?: string
          custo_estimado?: number | null
          dedupe_hash?: string | null
          destinatario?: string | null
          erro?: string | null
          estabelecimento_id: string
          funcionario_id?: string | null
          id?: string
          mensagem?: string | null
          status: string
          tipo: string
          titulo?: string | null
        }
        Update: {
          canal?: string
          confirmado_em?: string | null
          confirmado_via?: string | null
          created_at?: string
          custo_estimado?: number | null
          dedupe_hash?: string | null
          destinatario?: string | null
          erro?: string | null
          estabelecimento_id?: string
          funcionario_id?: string | null
          id?: string
          mensagem?: string | null
          status?: string
          tipo?: string
          titulo?: string | null
        }
        Relationships: []
      }
      ponto_nsr_seq: {
        Row: {
          empresa_id: string
          ultimo_nsr: number
          updated_at: string
        }
        Insert: {
          empresa_id: string
          ultimo_nsr?: number
          updated_at?: string
        }
        Update: {
          empresa_id?: string
          ultimo_nsr?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_nsr_seq_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_periodos_fechamento: {
        Row: {
          created_at: string
          empresa_id: string
          fechado_em: string
          fechado_por: string | null
          id: string
          mes_referencia: string
          observacao: string | null
          total_faltas: number | null
          total_funcionarios: number | null
          total_he_min: number | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          fechado_em?: string
          fechado_por?: string | null
          id?: string
          mes_referencia: string
          observacao?: string | null
          total_faltas?: number | null
          total_funcionarios?: number | null
          total_he_min?: number | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          fechado_em?: string
          fechado_por?: string | null
          id?: string
          mes_referencia?: string
          observacao?: string | null
          total_faltas?: number | null
          total_funcionarios?: number | null
          total_he_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_periodos_fechamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_permissoes: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string | null
          filial_id: string | null
          id: string
          perfil: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string | null
          filial_id?: string | null
          id?: string
          perfil?: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string | null
          filial_id?: string | null
          id?: string
          perfil?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_permissoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_permissoes_unidade_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_predicoes_ia: {
        Row: {
          created_at: string
          fatores: Json | null
          funcionario_id: string
          id: string
          modelo: string | null
          nivel: string
          periodo_analisado: unknown
          recomendacoes: string[] | null
          score: number
          tipo: string
        }
        Insert: {
          created_at?: string
          fatores?: Json | null
          funcionario_id: string
          id?: string
          modelo?: string | null
          nivel: string
          periodo_analisado?: unknown
          recomendacoes?: string[] | null
          score: number
          tipo: string
        }
        Update: {
          created_at?: string
          fatores?: Json | null
          funcionario_id?: string
          id?: string
          modelo?: string | null
          nivel?: string
          periodo_analisado?: unknown
          recomendacoes?: string[] | null
          score?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_predicoes_ia_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_predicoes_ia_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_push_subscriptions: {
        Row: {
          ativo: boolean
          auth: string
          created_at: string
          endpoint: string
          funcionario_id: string
          id: string
          p256dh: string
          ultimo_uso: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          ativo?: boolean
          auth: string
          created_at?: string
          endpoint: string
          funcionario_id: string
          id?: string
          p256dh: string
          ultimo_uso?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          ativo?: boolean
          auth?: string
          created_at?: string
          endpoint?: string
          funcionario_id?: string
          id?: string
          p256dh?: string
          ultimo_uso?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_push_subscriptions_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_push_subscriptions_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_redes_autorizadas: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_id: string
          filial_id: string | null
          id: string
          tipo: string
          updated_at: string
          valor: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id: string
          filial_id?: string | null
          id?: string
          tipo: string
          updated_at?: string
          valor: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          filial_id?: string | null
          id?: string
          tipo?: string
          updated_at?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_redes_autorizadas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_redes_autorizadas_unidade_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_registros: {
        Row: {
          comprovante_gerado_em: string | null
          comprovante_hash: string | null
          created_at: string
          data_hora: string
          device_hash: string | null
          dispositivo_info: Json | null
          equipamento_id: string | null
          face_match_score: number | null
          fatores_validacao: Json | null
          foto_url: string | null
          funcionario_id: string
          geofence_ok: boolean | null
          gps_lat: number | null
          gps_lon: number | null
          gps_precisao: number | null
          hash_assinatura: string | null
          id: string
          ip: string | null
          liveness_ok: boolean | null
          nsr: number | null
          observacao: string | null
          origem: string
          qr_token: string | null
          rede_ok: boolean | null
          score_confianca: number | null
          score_fraude: number | null
          tipo: string
          user_agent: string | null
        }
        Insert: {
          comprovante_gerado_em?: string | null
          comprovante_hash?: string | null
          created_at?: string
          data_hora: string
          device_hash?: string | null
          dispositivo_info?: Json | null
          equipamento_id?: string | null
          face_match_score?: number | null
          fatores_validacao?: Json | null
          foto_url?: string | null
          funcionario_id: string
          geofence_ok?: boolean | null
          gps_lat?: number | null
          gps_lon?: number | null
          gps_precisao?: number | null
          hash_assinatura?: string | null
          id?: string
          ip?: string | null
          liveness_ok?: boolean | null
          nsr?: number | null
          observacao?: string | null
          origem?: string
          qr_token?: string | null
          rede_ok?: boolean | null
          score_confianca?: number | null
          score_fraude?: number | null
          tipo?: string
          user_agent?: string | null
        }
        Update: {
          comprovante_gerado_em?: string | null
          comprovante_hash?: string | null
          created_at?: string
          data_hora?: string
          device_hash?: string | null
          dispositivo_info?: Json | null
          equipamento_id?: string | null
          face_match_score?: number | null
          fatores_validacao?: Json | null
          foto_url?: string | null
          funcionario_id?: string
          geofence_ok?: boolean | null
          gps_lat?: number | null
          gps_lon?: number | null
          gps_precisao?: number | null
          hash_assinatura?: string | null
          id?: string
          ip?: string | null
          liveness_ok?: boolean | null
          nsr?: number | null
          observacao?: string | null
          origem?: string
          qr_token?: string | null
          rede_ok?: boolean | null
          score_confianca?: number | null
          score_fraude?: number | null
          tipo?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_registros_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "ponto_equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_registros_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_registros_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_regras_jornada: {
        Row: {
          adicional_noturno_pct: number | null
          banco_horas_ativo: boolean | null
          banco_horas_limite_min: number | null
          created_at: string
          empresa_id: string
          fechamento_dia: number | null
          hora_extra_noturno_pct: number | null
          hora_extra_pct: number | null
          id: string
          noturno_fim: string | null
          noturno_inicio: string | null
          tolerancia_atraso_min: number | null
          tolerancia_saida_antec_min: number | null
          updated_at: string
        }
        Insert: {
          adicional_noturno_pct?: number | null
          banco_horas_ativo?: boolean | null
          banco_horas_limite_min?: number | null
          created_at?: string
          empresa_id: string
          fechamento_dia?: number | null
          hora_extra_noturno_pct?: number | null
          hora_extra_pct?: number | null
          id?: string
          noturno_fim?: string | null
          noturno_inicio?: string | null
          tolerancia_atraso_min?: number | null
          tolerancia_saida_antec_min?: number | null
          updated_at?: string
        }
        Update: {
          adicional_noturno_pct?: number | null
          banco_horas_ativo?: boolean | null
          banco_horas_limite_min?: number | null
          created_at?: string
          empresa_id?: string
          fechamento_dia?: number | null
          hora_extra_noturno_pct?: number | null
          hora_extra_pct?: number | null
          id?: string
          noturno_fim?: string | null
          noturno_inicio?: string | null
          tolerancia_atraso_min?: number | null
          tolerancia_saida_antec_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_regras_jornada_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_rubricas_dominio: {
        Row: {
          ativo: boolean
          codigo_rubrica: string
          created_at: string
          descricao: string | null
          empresa_id: string
          evento: string
          id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_rubrica: string
          created_at?: string
          descricao?: string | null
          empresa_id: string
          evento: string
          id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_rubrica?: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          evento?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_rubricas_dominio_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_sobreaviso: {
        Row: {
          acionado: boolean
          acionado_fim: string | null
          acionado_inicio: string | null
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          empresa_id: string
          funcionario_id: string
          horas_totais: number | null
          id: string
          observacao: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          acionado?: boolean
          acionado_fim?: string | null
          acionado_inicio?: string | null
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          empresa_id: string
          funcionario_id: string
          horas_totais?: number | null
          id?: string
          observacao?: string | null
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          acionado?: boolean
          acionado_fim?: string | null
          acionado_inicio?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          empresa_id?: string
          funcionario_id?: string
          horas_totais?: number | null
          id?: string
          observacao?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_sobreaviso_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_dsr_detalhado"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "ponto_sobreaviso_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "ponto_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_webhook_tokens: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_id: string
          equipamento_id: string | null
          id: string
          token: string
          total_chamadas: number
          ultima_chamada: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id: string
          equipamento_id?: string | null
          id?: string
          token: string
          total_chamadas?: number
          ultima_chamada?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          equipamento_id?: string | null
          id?: string
          token?: string
          total_chamadas?: number
          ultima_chamada?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_webhook_tokens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_webhook_tokens_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "ponto_equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      port_access_events: {
        Row: {
          access_point_id: string | null
          auth_user_id: string | null
          created_at: string
          detalhes: Json
          device_id: string | null
          id: string
          ip_origem: string | null
          mensagem: string | null
          origem: string | null
          person_id: string | null
          resultado: string
          tipo: string
          visitor_id: string | null
        }
        Insert: {
          access_point_id?: string | null
          auth_user_id?: string | null
          created_at?: string
          detalhes?: Json
          device_id?: string | null
          id?: string
          ip_origem?: string | null
          mensagem?: string | null
          origem?: string | null
          person_id?: string | null
          resultado?: string
          tipo: string
          visitor_id?: string | null
        }
        Update: {
          access_point_id?: string | null
          auth_user_id?: string | null
          created_at?: string
          detalhes?: Json
          device_id?: string | null
          id?: string
          ip_origem?: string | null
          mensagem?: string | null
          origem?: string | null
          person_id?: string | null
          resultado?: string
          tipo?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "port_access_events_access_point_id_fkey"
            columns: ["access_point_id"]
            isOneToOne: false
            referencedRelation: "port_access_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_access_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "port_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_access_events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "port_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_access_events_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "port_visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      port_access_points: {
        Row: {
          acao: string | null
          ativo: boolean
          confirmar_abertura: boolean
          created_at: string
          device_id: string | null
          id: string
          nome: string
          ordem: number
          tipo: string
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          acao?: string | null
          ativo?: boolean
          confirmar_abertura?: boolean
          created_at?: string
          device_id?: string | null
          id?: string
          nome: string
          ordem?: number
          tipo?: string
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          acao?: string | null
          ativo?: boolean
          confirmar_abertura?: boolean
          created_at?: string
          device_id?: string | null
          id?: string
          nome?: string
          ordem?: number
          tipo?: string
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "port_access_points_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "port_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_access_points_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      port_campainha_eventos: {
        Row: {
          atendido_em: string | null
          atendido_por: string | null
          created_at: string
          device_id: string | null
          id: string
          observacao: string | null
          origem: string
          status: string
          unidade_id: string | null
        }
        Insert: {
          atendido_em?: string | null
          atendido_por?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          observacao?: string | null
          origem?: string
          status?: string
          unidade_id?: string | null
        }
        Update: {
          atendido_em?: string | null
          atendido_por?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          observacao?: string | null
          origem?: string
          status?: string
          unidade_id?: string | null
        }
        Relationships: []
      }
      port_coletores: {
        Row: {
          ativo: boolean
          created_at: string
          device_key: string | null
          id: string
          ip_local: string | null
          nome: string
          token: string
          ultima_comunicacao: string | null
          unidade_id: string | null
          updated_at: string
          versao: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          device_key?: string | null
          id?: string
          ip_local?: string | null
          nome: string
          token?: string
          ultima_comunicacao?: string | null
          unidade_id?: string | null
          updated_at?: string
          versao?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          device_key?: string | null
          id?: string
          ip_local?: string | null
          nome?: string
          token?: string
          ultima_comunicacao?: string | null
          unidade_id?: string | null
          updated_at?: string
          versao?: string | null
        }
        Relationships: []
      }
      port_device_credentials: {
        Row: {
          device_id: string
          senha: string | null
          token: string | null
          updated_at: string
          usuario: string | null
        }
        Insert: {
          device_id: string
          senha?: string | null
          token?: string | null
          updated_at?: string
          usuario?: string | null
        }
        Update: {
          device_id?: string
          senha?: string | null
          token?: string | null
          updated_at?: string
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "port_device_credentials_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: true
            referencedRelation: "port_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      port_device_jobs: {
        Row: {
          access_point_id: string | null
          coletor_id: string | null
          comando: string
          created_at: string
          device_id: string | null
          erro: string | null
          executado_em: string | null
          id: string
          parametros: Json
          resultado: Json | null
          solicitado_por: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_point_id?: string | null
          coletor_id?: string | null
          comando: string
          created_at?: string
          device_id?: string | null
          erro?: string | null
          executado_em?: string | null
          id?: string
          parametros?: Json
          resultado?: Json | null
          solicitado_por?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_point_id?: string | null
          coletor_id?: string | null
          comando?: string
          created_at?: string
          device_id?: string | null
          erro?: string | null
          executado_em?: string | null
          id?: string
          parametros?: Json
          resultado?: Json | null
          solicitado_por?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "port_device_jobs_access_point_id_fkey"
            columns: ["access_point_id"]
            isOneToOne: false
            referencedRelation: "port_access_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_device_jobs_coletor_id_fkey"
            columns: ["coletor_id"]
            isOneToOne: false
            referencedRelation: "port_coletores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_device_jobs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "port_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      port_devices: {
        Row: {
          canal_rele: number
          config: Json
          created_at: string
          device_id: string | null
          endpoint: string | null
          firmware: string | null
          habilitado: boolean
          id: string
          ip: string | null
          localizacao: string | null
          modelo: string | null
          nome: string
          porta: number | null
          pulso_ms: number
          status: string
          tipo: string
          ultima_comunicacao: string | null
          unidade_id: string | null
          updated_at: string
          via_coletor: boolean
        }
        Insert: {
          canal_rele?: number
          config?: Json
          created_at?: string
          device_id?: string | null
          endpoint?: string | null
          firmware?: string | null
          habilitado?: boolean
          id?: string
          ip?: string | null
          localizacao?: string | null
          modelo?: string | null
          nome: string
          porta?: number | null
          pulso_ms?: number
          status?: string
          tipo?: string
          ultima_comunicacao?: string | null
          unidade_id?: string | null
          updated_at?: string
          via_coletor?: boolean
        }
        Update: {
          canal_rele?: number
          config?: Json
          created_at?: string
          device_id?: string | null
          endpoint?: string | null
          firmware?: string | null
          habilitado?: boolean
          id?: string
          ip?: string | null
          localizacao?: string | null
          modelo?: string | null
          nome?: string
          porta?: number | null
          pulso_ms?: number
          status?: string
          tipo?: string
          ultima_comunicacao?: string | null
          unidade_id?: string | null
          updated_at?: string
          via_coletor?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "port_devices_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      port_interfone_config: {
        Row: {
          ativo: boolean
          auto_popup: boolean
          cameras_extras: string[]
          created_at: string
          device_id: string | null
          id: string
          sip_uri: string | null
          som: boolean
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          auto_popup?: boolean
          cameras_extras?: string[]
          created_at?: string
          device_id?: string | null
          id?: string
          sip_uri?: string | null
          som?: boolean
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          auto_popup?: boolean
          cameras_extras?: string[]
          created_at?: string
          device_id?: string | null
          id?: string
          sip_uri?: string | null
          som?: boolean
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      port_people: {
        Row: {
          ativo: boolean
          auth_user_id: string | null
          controlid_user_id: string | null
          created_at: string
          dias_semana: number[]
          documento: string | null
          email: string | null
          face_status: string
          foto_url: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          nome: string
          observacoes: string | null
          permitir_facial: boolean
          permitir_remoto: boolean
          sync_erro: string | null
          telefone: string | null
          tipo: string
          unidade: string | null
          unidade_id: string | null
          updated_at: string
          valido_ate: string | null
          valido_de: string | null
        }
        Insert: {
          ativo?: boolean
          auth_user_id?: string | null
          controlid_user_id?: string | null
          created_at?: string
          dias_semana?: number[]
          documento?: string | null
          email?: string | null
          face_status?: string
          foto_url?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          permitir_facial?: boolean
          permitir_remoto?: boolean
          sync_erro?: string | null
          telefone?: string | null
          tipo?: string
          unidade?: string | null
          unidade_id?: string | null
          updated_at?: string
          valido_ate?: string | null
          valido_de?: string | null
        }
        Update: {
          ativo?: boolean
          auth_user_id?: string | null
          controlid_user_id?: string | null
          created_at?: string
          dias_semana?: number[]
          documento?: string | null
          email?: string | null
          face_status?: string
          foto_url?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          permitir_facial?: boolean
          permitir_remoto?: boolean
          sync_erro?: string | null
          telefone?: string | null
          tipo?: string
          unidade?: string | null
          unidade_id?: string | null
          updated_at?: string
          valido_ate?: string | null
          valido_de?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "port_people_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      port_person_permissions: {
        Row: {
          access_point_id: string
          created_at: string
          id: string
          person_id: string
        }
        Insert: {
          access_point_id: string
          created_at?: string
          id?: string
          person_id: string
        }
        Update: {
          access_point_id?: string
          created_at?: string
          id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "port_person_permissions_access_point_id_fkey"
            columns: ["access_point_id"]
            isOneToOne: false
            referencedRelation: "port_access_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_person_permissions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "port_people"
            referencedColumns: ["id"]
          },
        ]
      }
      port_push_config: {
        Row: {
          app_id: string | null
          created_at: string
          google_services_json: string | null
          id: string
          package_name: string | null
          project_id: string | null
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          google_services_json?: string | null
          id?: string
          package_name?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          created_at?: string
          google_services_json?: string | null
          id?: string
          package_name?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      port_push_tokens: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          plataforma: string
          token: string
          unidade_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          plataforma?: string
          token: string
          unidade_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          plataforma?: string
          token?: string
          unidade_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      port_remote_commands: {
        Row: {
          access_point_id: string | null
          comando: string
          created_at: string
          device_id: string | null
          erro: string | null
          id: string
          ip_origem: string | null
          latencia_ms: number | null
          nonce: string | null
          resultado: string
          solicitado_por: string | null
        }
        Insert: {
          access_point_id?: string | null
          comando?: string
          created_at?: string
          device_id?: string | null
          erro?: string | null
          id?: string
          ip_origem?: string | null
          latencia_ms?: number | null
          nonce?: string | null
          resultado?: string
          solicitado_por?: string | null
        }
        Update: {
          access_point_id?: string | null
          comando?: string
          created_at?: string
          device_id?: string | null
          erro?: string | null
          id?: string
          ip_origem?: string | null
          latencia_ms?: number | null
          nonce?: string | null
          resultado?: string
          solicitado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "port_remote_commands_access_point_id_fkey"
            columns: ["access_point_id"]
            isOneToOne: false
            referencedRelation: "port_access_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_remote_commands_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "port_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      port_settings: {
        Row: {
          chave: string
          updated_at: string
          valor: Json
        }
        Insert: {
          chave: string
          updated_at?: string
          valor?: Json
        }
        Update: {
          chave?: string
          updated_at?: string
          valor?: Json
        }
        Relationships: []
      }
      port_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["port_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["port_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["port_role"]
          user_id?: string
        }
        Relationships: []
      }
      port_visitors: {
        Row: {
          access_point_id: string | null
          codigo: string | null
          controlid_user_id: string | null
          created_at: string
          criado_por: string | null
          documento: string | null
          face_status: string
          fim: string | null
          foto_url: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          inicio: string
          nome: string
          observacoes: string | null
          status: string
          telefone: string | null
          tipo_autorizacao: string
          unidade: string | null
          unidade_id: string | null
          updated_at: string
          visitado_person_id: string | null
        }
        Insert: {
          access_point_id?: string | null
          codigo?: string | null
          controlid_user_id?: string | null
          created_at?: string
          criado_por?: string | null
          documento?: string | null
          face_status?: string
          fim?: string | null
          foto_url?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          inicio?: string
          nome: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          tipo_autorizacao?: string
          unidade?: string | null
          unidade_id?: string | null
          updated_at?: string
          visitado_person_id?: string | null
        }
        Update: {
          access_point_id?: string | null
          codigo?: string | null
          controlid_user_id?: string | null
          created_at?: string
          criado_por?: string | null
          documento?: string | null
          face_status?: string
          fim?: string | null
          foto_url?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          inicio?: string
          nome?: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          tipo_autorizacao?: string
          unidade?: string | null
          unidade_id?: string | null
          updated_at?: string
          visitado_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "port_visitors_access_point_id_fkey"
            columns: ["access_point_id"]
            isOneToOne: false
            referencedRelation: "port_access_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_visitors_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "port_visitors_visitado_person_id_fkey"
            columns: ["visitado_person_id"]
            isOneToOne: false
            referencedRelation: "port_people"
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
          ativo: boolean
          created_at: string | null
          descritivo_catalogo: string | null
          estabelecimento_id: string | null
          id: string
          nome: string
          percentual_comissao: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          descritivo_catalogo?: string | null
          estabelecimento_id?: string | null
          id?: string
          nome: string
          percentual_comissao?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
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
      produto_imagens: {
        Row: {
          created_at: string
          estabelecimento_id: string
          id: string
          is_principal: boolean
          ordem: number
          produto_id: string
          storage_path: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          is_principal?: boolean
          ordem?: number
          produto_id: string
          storage_path?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          is_principal?: boolean
          ordem?: number
          produto_id?: string
          storage_path?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_imagens_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_imagens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
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
      prospeccao_empresas: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnae_descricao: string | null
          cnae_principal: string | null
          cnpj: string | null
          contato_cargo: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string
          data_fundacao: string | null
          descricao: string | null
          email: string | null
          empresa_id: string | null
          endereco: string | null
          estabelecimento_id: string | null
          estado: string | null
          extras: Json | null
          faturamento_estimado: string | null
          fontes: Json | null
          funcionarios_estimado: string | null
          id: string
          importado_em: string | null
          latitude: number | null
          longitude: number | null
          nome: string
          nome_fantasia: string | null
          observacoes_internas: string | null
          origem: string | null
          porte: string | null
          prioridade: string | null
          produtos_interesse: Json | null
          redes_sociais: Json | null
          score: number | null
          score_motivo: string | null
          segmento_id: string | null
          segmento_nome: string | null
          site: string | null
          situacao_cadastral: string | null
          status: string
          tags: Json | null
          telefone: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnpj?: string | null
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          data_fundacao?: string | null
          descricao?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          estabelecimento_id?: string | null
          estado?: string | null
          extras?: Json | null
          faturamento_estimado?: string | null
          fontes?: Json | null
          funcionarios_estimado?: string | null
          id?: string
          importado_em?: string | null
          latitude?: number | null
          longitude?: number | null
          nome: string
          nome_fantasia?: string | null
          observacoes_internas?: string | null
          origem?: string | null
          porte?: string | null
          prioridade?: string | null
          produtos_interesse?: Json | null
          redes_sociais?: Json | null
          score?: number | null
          score_motivo?: string | null
          segmento_id?: string | null
          segmento_nome?: string | null
          site?: string | null
          situacao_cadastral?: string | null
          status?: string
          tags?: Json | null
          telefone?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnpj?: string | null
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          data_fundacao?: string | null
          descricao?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          estabelecimento_id?: string | null
          estado?: string | null
          extras?: Json | null
          faturamento_estimado?: string | null
          fontes?: Json | null
          funcionarios_estimado?: string | null
          id?: string
          importado_em?: string | null
          latitude?: number | null
          longitude?: number | null
          nome?: string
          nome_fantasia?: string | null
          observacoes_internas?: string | null
          origem?: string | null
          porte?: string | null
          prioridade?: string | null
          produtos_interesse?: Json | null
          redes_sociais?: Json | null
          score?: number | null
          score_motivo?: string | null
          segmento_id?: string | null
          segmento_nome?: string | null
          site?: string | null
          situacao_cadastral?: string | null
          status?: string
          tags?: Json | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      prospects_b2b: {
        Row: {
          area_busca: Json | null
          busca_id: string | null
          categoria: string | null
          cep: string | null
          cidade: string | null
          created_at: string
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
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
            foreignKeyName: "prospects_b2b_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
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
      push_notifications_log: {
        Row: {
          corpo: string | null
          created_at: string
          destinatario_id: string | null
          destinatario_tipo: string
          erro: string | null
          icone: string | null
          id: string
          origem: string | null
          payload: Json | null
          status: string
          titulo: string
          total_enviado: number | null
          total_falhou: number | null
          url: string | null
          workflow_id: string | null
          workflow_tipo: string | null
        }
        Insert: {
          corpo?: string | null
          created_at?: string
          destinatario_id?: string | null
          destinatario_tipo: string
          erro?: string | null
          icone?: string | null
          id?: string
          origem?: string | null
          payload?: Json | null
          status?: string
          titulo: string
          total_enviado?: number | null
          total_falhou?: number | null
          url?: string | null
          workflow_id?: string | null
          workflow_tipo?: string | null
        }
        Update: {
          corpo?: string | null
          created_at?: string
          destinatario_id?: string | null
          destinatario_tipo?: string
          erro?: string | null
          icone?: string | null
          id?: string
          origem?: string | null
          payload?: Json | null
          status?: string
          titulo?: string
          total_enviado?: number | null
          total_falhou?: number | null
          url?: string | null
          workflow_id?: string | null
          workflow_tipo?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          ativo: boolean
          auth: string
          contato_id: string | null
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          plataforma: string
          ultimo_uso: string | null
          updated_at: string
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          ativo?: boolean
          auth: string
          contato_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          plataforma?: string
          ultimo_uso?: string | null
          updated_at?: string
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          ativo?: boolean
          auth?: string
          contato_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          plataforma?: string
          ultimo_uso?: string | null
          updated_at?: string
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
          ativo: boolean
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
          ativo?: boolean
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
          ativo?: boolean
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
          linkedin: string | null
          pinterest: string | null
          telegram: string | null
          threads: string | null
          tiktok: string | null
          twitter: string | null
          updated_at: string | null
          website: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          pinterest?: string | null
          telegram?: string | null
          threads?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string | null
          website?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          pinterest?: string | null
          telegram?: string | null
          threads?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string | null
          website?: string | null
          whatsapp?: string | null
          youtube?: string | null
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
      relatorio_snapshots: {
        Row: {
          created_at: string
          dados: Json
          estabelecimento_id: string | null
          expira_em: string
          filtros_aplicados: Json
          id: string
          nome: string
          permanente: boolean
          relatorio_voz_id: string | null
          total_registros: number
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          dados?: Json
          estabelecimento_id?: string | null
          expira_em?: string
          filtros_aplicados?: Json
          id?: string
          nome: string
          permanente?: boolean
          relatorio_voz_id?: string | null
          total_registros?: number
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          dados?: Json
          estabelecimento_id?: string | null
          expira_em?: string
          filtros_aplicados?: Json
          id?: string
          nome?: string
          permanente?: boolean
          relatorio_voz_id?: string | null
          total_registros?: number
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorio_snapshots_relatorio_voz_id_fkey"
            columns: ["relatorio_voz_id"]
            isOneToOne: false
            referencedRelation: "relatorios_voz"
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
      relatorios_voz: {
        Row: {
          aliases: string[]
          api_endpoint_id: string | null
          ativo: boolean
          campos_exibicao: Json
          created_at: string
          created_by: string | null
          descricao: string | null
          estabelecimento_id: string
          filtros_disponiveis: Json
          grupo: string
          id: string
          joins: Json
          limite_padrao: number
          nome: string
          ordenacao: Json
          parametros: Json
          prompt_geracao: string
          tabela_base: string | null
          tipo_fonte: string
          tipo_saida: string
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          api_endpoint_id?: string | null
          ativo?: boolean
          campos_exibicao?: Json
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          estabelecimento_id: string
          filtros_disponiveis?: Json
          grupo?: string
          id?: string
          joins?: Json
          limite_padrao?: number
          nome: string
          ordenacao?: Json
          parametros?: Json
          prompt_geracao: string
          tabela_base?: string | null
          tipo_fonte?: string
          tipo_saida?: string
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          api_endpoint_id?: string | null
          ativo?: boolean
          campos_exibicao?: Json
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          estabelecimento_id?: string
          filtros_disponiveis?: Json
          grupo?: string
          id?: string
          joins?: Json
          limite_padrao?: number
          nome?: string
          ordenacao?: Json
          parametros?: Json
          prompt_geracao?: string
          tabela_base?: string | null
          tipo_fonte?: string
          tipo_saida?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_voz_api_endpoint_id_fkey"
            columns: ["api_endpoint_id"]
            isOneToOne: false
            referencedRelation: "api_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_voz_estabelecimento_id_fkey"
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
      ritmo_humano_config: {
        Row: {
          ativo: boolean
          created_at: string
          delay_max_seg: number
          delay_min_seg: number
          dias_semana: number[]
          estabelecimento_id: string
          hora_fim: number
          hora_inicio: number
          id: string
          limite_diario: number
          lote_tamanho: number
          pausa_lote_max_minutos: number
          pausa_lote_min_minutos: number
          respeitar_janela: boolean
          updated_at: string
          variar_texto: boolean
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          delay_max_seg?: number
          delay_min_seg?: number
          dias_semana?: number[]
          estabelecimento_id: string
          hora_fim?: number
          hora_inicio?: number
          id?: string
          limite_diario?: number
          lote_tamanho?: number
          pausa_lote_max_minutos?: number
          pausa_lote_min_minutos?: number
          respeitar_janela?: boolean
          updated_at?: string
          variar_texto?: boolean
        }
        Update: {
          ativo?: boolean
          created_at?: string
          delay_max_seg?: number
          delay_min_seg?: number
          dias_semana?: number[]
          estabelecimento_id?: string
          hora_fim?: number
          hora_inicio?: number
          id?: string
          limite_diario?: number
          lote_tamanho?: number
          pausa_lote_max_minutos?: number
          pausa_lote_min_minutos?: number
          respeitar_janela?: boolean
          updated_at?: string
          variar_texto?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ritmo_humano_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: true
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ritmo_humano_contador: {
        Row: {
          dia: string
          enviados: number
          estabelecimento_id: string
          id: string
          sessao: string
          updated_at: string
        }
        Insert: {
          dia?: string
          enviados?: number
          estabelecimento_id: string
          id?: string
          sessao?: string
          updated_at?: string
        }
        Update: {
          dia?: string
          enviados?: number
          estabelecimento_id?: string
          id?: string
          sessao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ritmo_humano_contador_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
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
          is_prospect: boolean
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          is_prospect?: boolean
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estabelecimento_id?: string | null
          id?: string
          is_prospect?: boolean
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
      sip_config_usuario: {
        Row: {
          atualizado_em: string
          config: Json
          user_id: string
          usuario_id: string | null
        }
        Insert: {
          atualizado_em?: string
          config?: Json
          user_id: string
          usuario_id?: string | null
        }
        Update: {
          atualizado_em?: string
          config?: Json
          user_id?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string | null
          descricao: string | null
          estabelecimento_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
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
      sms_config: {
        Row: {
          ativo: boolean
          created_at: string
          estabelecimento_id: string
          gatewayapi_token: string | null
          id: string
          pilar_endpoint: string | null
          pilar_sender: string | null
          pilar_token: string | null
          provider: string
          sender: string | null
          smsgate_base_url: string | null
          smsgate_password: string | null
          smsgate_username: string | null
          smsgatewayme_device_id: string | null
          smsgatewayme_email: string | null
          smsgatewayme_password: string | null
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          twilio_from: string | null
          updated_at: string
          zenvia_api_token: string | null
          zenvia_from: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          estabelecimento_id: string
          gatewayapi_token?: string | null
          id?: string
          pilar_endpoint?: string | null
          pilar_sender?: string | null
          pilar_token?: string | null
          provider?: string
          sender?: string | null
          smsgate_base_url?: string | null
          smsgate_password?: string | null
          smsgate_username?: string | null
          smsgatewayme_device_id?: string | null
          smsgatewayme_email?: string | null
          smsgatewayme_password?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_from?: string | null
          updated_at?: string
          zenvia_api_token?: string | null
          zenvia_from?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          estabelecimento_id?: string
          gatewayapi_token?: string | null
          id?: string
          pilar_endpoint?: string | null
          pilar_sender?: string | null
          pilar_token?: string | null
          provider?: string
          sender?: string | null
          smsgate_base_url?: string | null
          smsgate_password?: string | null
          smsgate_username?: string | null
          smsgatewayme_device_id?: string | null
          smsgatewayme_email?: string | null
          smsgatewayme_password?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_from?: string | null
          updated_at?: string
          zenvia_api_token?: string | null
          zenvia_from?: string | null
        }
        Relationships: []
      }
      sms_devices: {
        Row: {
          ativo: boolean
          bateria: number | null
          camera_config: Json
          created_at: string
          estabelecimento_id: string | null
          id: string
          modulo_camera_ativo: boolean
          modulo_ponto_ativo: boolean
          modulo_sms_ativo: boolean
          nome: string
          ponto_config: Json
          sinal: string | null
          tipo_dispositivo: string
          token: string
          ultimo_heartbeat: string | null
          ultimo_ip: string | null
          ultimo_ping: string | null
          updated_at: string
          versao_app: string | null
        }
        Insert: {
          ativo?: boolean
          bateria?: number | null
          camera_config?: Json
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          modulo_camera_ativo?: boolean
          modulo_ponto_ativo?: boolean
          modulo_sms_ativo?: boolean
          nome: string
          ponto_config?: Json
          sinal?: string | null
          tipo_dispositivo?: string
          token?: string
          ultimo_heartbeat?: string | null
          ultimo_ip?: string | null
          ultimo_ping?: string | null
          updated_at?: string
          versao_app?: string | null
        }
        Update: {
          ativo?: boolean
          bateria?: number | null
          camera_config?: Json
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          modulo_camera_ativo?: boolean
          modulo_ponto_ativo?: boolean
          modulo_sms_ativo?: boolean
          nome?: string
          ponto_config?: Json
          sinal?: string | null
          tipo_dispositivo?: string
          token?: string
          ultimo_heartbeat?: string | null
          ultimo_ip?: string | null
          ultimo_ping?: string | null
          updated_at?: string
          versao_app?: string | null
        }
        Relationships: []
      }
      sms_envios: {
        Row: {
          created_at: string
          created_by: string | null
          destino: string
          erro: string | null
          estabelecimento_id: string
          id: string
          mensagem: string
          provider: string
          provider_message_id: string | null
          response_raw: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destino: string
          erro?: string | null
          estabelecimento_id: string
          id?: string
          mensagem: string
          provider: string
          provider_message_id?: string | null
          response_raw?: Json | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destino?: string
          erro?: string | null
          estabelecimento_id?: string
          id?: string
          mensagem?: string
          provider?: string
          provider_message_id?: string | null
          response_raw?: Json | null
          status?: string
        }
        Relationships: []
      }
      sms_queue: {
        Row: {
          claimed_at: string | null
          created_at: string
          device_id: string | null
          entregue_at: string | null
          enviado_at: string | null
          erro_mensagem: string | null
          estabelecimento_id: string | null
          id: string
          max_tentativas: number
          mensagem: string
          status: string
          telefone: string
          tentativas: number
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          device_id?: string | null
          entregue_at?: string | null
          enviado_at?: string | null
          erro_mensagem?: string | null
          estabelecimento_id?: string | null
          id?: string
          max_tentativas?: number
          mensagem: string
          status?: string
          telefone: string
          tentativas?: number
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          device_id?: string | null
          entregue_at?: string | null
          enviado_at?: string | null
          erro_mensagem?: string | null
          estabelecimento_id?: string | null
          id?: string
          max_tentativas?: number
          mensagem?: string
          status?: string
          telefone?: string
          tentativas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_queue_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "sms_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_credentials: {
        Row: {
          ativo: boolean
          created_at: string
          credentials: Json
          estabelecimento_id: string
          id: string
          platform: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          credentials?: Json
          estabelecimento_id: string
          id?: string
          platform: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          credentials?: Json
          estabelecimento_id?: string
          id?: string
          platform?: string
          updated_at?: string
        }
        Relationships: []
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
      studio_visual_identity: {
        Row: {
          created_at: string
          estabelecimento_id: string
          id: string
          images: Json
          is_active: boolean
          name: string | null
          negative_prompt: string | null
          preferred_model: string | null
          prompt: string | null
          selected_images: Json
          updated_at: string
          use_images: boolean
          use_prompt: boolean
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          images?: Json
          is_active?: boolean
          name?: string | null
          negative_prompt?: string | null
          preferred_model?: string | null
          prompt?: string | null
          selected_images?: Json
          updated_at?: string
          use_images?: boolean
          use_prompt?: boolean
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          images?: Json
          is_active?: boolean
          name?: string | null
          negative_prompt?: string | null
          preferred_model?: string | null
          prompt?: string | null
          selected_images?: Json
          updated_at?: string
          use_images?: boolean
          use_prompt?: boolean
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
      support_ticket_mensagens: {
        Row: {
          anexo_url: string | null
          anexos: Json
          autor_nome: string | null
          autor_tipo: string
          autor_usuario_id: string | null
          created_at: string
          id: string
          mensagem: string
          ticket_id: string
        }
        Insert: {
          anexo_url?: string | null
          anexos?: Json
          autor_nome?: string | null
          autor_tipo: string
          autor_usuario_id?: string | null
          created_at?: string
          id?: string
          mensagem: string
          ticket_id: string
        }
        Update: {
          anexo_url?: string | null
          anexos?: Json
          autor_nome?: string | null
          autor_tipo?: string
          autor_usuario_id?: string | null
          created_at?: string
          id?: string
          mensagem?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_mensagens_autor_usuario_id_fkey"
            columns: ["autor_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_mensagens_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          anexos: Json
          auto_close_after_days: number
          closed_at: string | null
          created_at: string
          descricao: string | null
          estabelecimento_id: string | null
          id: string
          last_admin_message_at: string | null
          last_user_message_at: string | null
          observacao: string | null
          prioridade: string
          reopened_at: string | null
          resposta_admin: string | null
          status: string
          tela: string | null
          tipo: string
          titulo: string | null
          updated_at: string
          usuario_id: string | null
          video_url: string | null
        }
        Insert: {
          anexos?: Json
          auto_close_after_days?: number
          closed_at?: string | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string | null
          id?: string
          last_admin_message_at?: string | null
          last_user_message_at?: string | null
          observacao?: string | null
          prioridade?: string
          reopened_at?: string | null
          resposta_admin?: string | null
          status?: string
          tela?: string | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
          usuario_id?: string | null
          video_url?: string | null
        }
        Update: {
          anexos?: Json
          auto_close_after_days?: number
          closed_at?: string | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string | null
          id?: string
          last_admin_message_at?: string | null
          last_user_message_at?: string | null
          observacao?: string | null
          prioridade?: string
          reopened_at?: string | null
          resposta_admin?: string | null
          status?: string
          tela?: string | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
          usuario_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_usuario_id_fkey"
            columns: ["usuario_id"]
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
          primary_color_hsl: string | null
          splash_video_loop: boolean
          splash_video_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          primary_color_hsl?: string | null
          splash_video_loop?: boolean
          splash_video_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          primary_color_hsl?: string | null
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
      telas_customizadas: {
        Row: {
          cor: string | null
          created_at: string
          estabelecimento_id: string
          icone: string | null
          id: string
          nome: string
          ordem: number
          parent_id: string | null
          rota: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          estabelecimento_id: string
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          parent_id?: string | null
          rota?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          estabelecimento_id?: string
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          parent_id?: string | null
          rota?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telas_customizadas_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telas_customizadas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "telas_customizadas"
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
      tracker_device_models: {
        Row: {
          apn: string | null
          apn_password: string | null
          apn_user: string | null
          ativo: boolean
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          host: string | null
          id: string
          is_default: boolean
          nome: string
          ordem: number
          porta: number
          protocolo: string
          senha_padrao: string | null
          sms_commands: Json
          supports_bloqueio: boolean
          updated_at: string
        }
        Insert: {
          apn?: string | null
          apn_password?: string | null
          apn_user?: string | null
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          host?: string | null
          id?: string
          is_default?: boolean
          nome: string
          ordem?: number
          porta?: number
          protocolo: string
          senha_padrao?: string | null
          sms_commands?: Json
          supports_bloqueio?: boolean
          updated_at?: string
        }
        Update: {
          apn?: string | null
          apn_password?: string | null
          apn_user?: string | null
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          host?: string | null
          id?: string
          is_default?: boolean
          nome?: string
          ordem?: number
          porta?: number
          protocolo?: string
          senha_padrao?: string | null
          sms_commands?: Json
          supports_bloqueio?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      tracker_sms_replies: {
        Row: {
          created_at: string
          device_id: string | null
          estabelecimento_id: string | null
          id: string
          matched_log_provider_message_id: string | null
          mensagem: string
          recebido_em: string
          telefone_remetente: string
          veiculo_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          estabelecimento_id?: string | null
          id?: string
          matched_log_provider_message_id?: string | null
          mensagem: string
          recebido_em?: string
          telefone_remetente: string
          veiculo_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          estabelecimento_id?: string | null
          id?: string
          matched_log_provider_message_id?: string | null
          mensagem?: string
          recebido_em?: string
          telefone_remetente?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracker_sms_replies_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "sms_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracker_sms_replies_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      transp_inspection_config: {
        Row: {
          active: boolean
          created_at: string
          entry_photos: Json
          entry_photos_required: boolean
          estabelecimento_id: string | null
          exit_photos: Json
          exit_photos_required: boolean
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          entry_photos?: Json
          entry_photos_required?: boolean
          estabelecimento_id?: string | null
          exit_photos?: Json
          exit_photos_required?: boolean
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          entry_photos?: Json
          entry_photos_required?: boolean
          estabelecimento_id?: string | null
          exit_photos?: Json
          exit_photos_required?: boolean
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transp_inspection_config_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      transp_motoristas: {
        Row: {
          ativo: boolean
          cnh: string | null
          cnh_foto_url: string | null
          cpf: string | null
          created_at: string
          estabelecimento_id: string
          id: string
          nome: string
          observacoes: string | null
          transportadora_id: string | null
          unidade_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          cnh?: string | null
          cnh_foto_url?: string | null
          cpf?: string | null
          created_at?: string
          estabelecimento_id: string
          id?: string
          nome: string
          observacoes?: string | null
          transportadora_id?: string | null
          unidade_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          cnh?: string | null
          cnh_foto_url?: string | null
          cpf?: string | null
          created_at?: string
          estabelecimento_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          transportadora_id?: string | null
          unidade_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transp_motoristas_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transp_motoristas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      transp_movimento_fotos: {
        Row: {
          angle_key: string | null
          angle_label: string | null
          caption: string | null
          created_at: string
          created_by: string | null
          id: string
          is_extra: boolean
          movimento_id: string
          photo_url: string
          stage: string
        }
        Insert: {
          angle_key?: string | null
          angle_label?: string | null
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_extra?: boolean
          movimento_id: string
          photo_url: string
          stage: string
        }
        Update: {
          angle_key?: string | null
          angle_label?: string | null
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_extra?: boolean
          movimento_id?: string
          photo_url?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "transp_movimento_fotos_movimento_id_fkey"
            columns: ["movimento_id"]
            isOneToOne: false
            referencedRelation: "transp_movimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      transp_movimentos: {
        Row: {
          ajudante_nome: string | null
          created_at: string
          documento: string | null
          entrada_obs: string | null
          entrada_por: string | null
          entrada_time: string
          estabelecimento_id: string
          id: string
          liberado_obs: string | null
          liberado_por: string | null
          liberado_time: string | null
          motivo: string | null
          motorista_id: string | null
          motorista_nome: string | null
          nfe_chave: string | null
          nfe_dados: Json | null
          placa: string | null
          porteiro_entrada_id: string | null
          porteiro_entrada_nome: string | null
          porteiro_saida_id: string | null
          porteiro_saida_nome: string | null
          saida_nfe_chave: string | null
          saida_nfe_dados: Json | null
          saida_obs: string | null
          saida_por: string | null
          saida_time: string | null
          setor_avisado_at: string | null
          setor_id: string | null
          status: string
          tipo_operacao: string
          transportadora_id: string | null
          unidade_id: string | null
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          ajudante_nome?: string | null
          created_at?: string
          documento?: string | null
          entrada_obs?: string | null
          entrada_por?: string | null
          entrada_time?: string
          estabelecimento_id: string
          id?: string
          liberado_obs?: string | null
          liberado_por?: string | null
          liberado_time?: string | null
          motivo?: string | null
          motorista_id?: string | null
          motorista_nome?: string | null
          nfe_chave?: string | null
          nfe_dados?: Json | null
          placa?: string | null
          porteiro_entrada_id?: string | null
          porteiro_entrada_nome?: string | null
          porteiro_saida_id?: string | null
          porteiro_saida_nome?: string | null
          saida_nfe_chave?: string | null
          saida_nfe_dados?: Json | null
          saida_obs?: string | null
          saida_por?: string | null
          saida_time?: string | null
          setor_avisado_at?: string | null
          setor_id?: string | null
          status?: string
          tipo_operacao?: string
          transportadora_id?: string | null
          unidade_id?: string | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          ajudante_nome?: string | null
          created_at?: string
          documento?: string | null
          entrada_obs?: string | null
          entrada_por?: string | null
          entrada_time?: string
          estabelecimento_id?: string
          id?: string
          liberado_obs?: string | null
          liberado_por?: string | null
          liberado_time?: string | null
          motivo?: string | null
          motorista_id?: string | null
          motorista_nome?: string | null
          nfe_chave?: string | null
          nfe_dados?: Json | null
          placa?: string | null
          porteiro_entrada_id?: string | null
          porteiro_entrada_nome?: string | null
          porteiro_saida_id?: string | null
          porteiro_saida_nome?: string | null
          saida_nfe_chave?: string | null
          saida_nfe_dados?: Json | null
          saida_obs?: string | null
          saida_por?: string | null
          saida_time?: string | null
          setor_avisado_at?: string | null
          setor_id?: string | null
          status?: string
          tipo_operacao?: string
          transportadora_id?: string | null
          unidade_id?: string | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transp_movimentos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "transp_motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transp_movimentos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "transp_setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transp_movimentos_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transp_movimentos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transp_movimentos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "transp_veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      transp_setores: {
        Row: {
          ativo: boolean
          created_at: string
          estabelecimento_id: string
          id: string
          nome: string
          observacoes: string | null
          unidade_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          estabelecimento_id: string
          id?: string
          nome: string
          observacoes?: string | null
          unidade_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          estabelecimento_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          unidade_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transp_setores_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      transp_setores_numeros: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          numero: string
          setor_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          numero: string
          setor_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          numero?: string
          setor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transp_setores_numeros_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "transp_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      transp_veiculos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          id: string
          observacoes: string | null
          placa: string
          tipo_veiculo: string | null
          transportadora_id: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          observacoes?: string | null
          placa: string
          tipo_veiculo?: string | null
          transportadora_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          observacoes?: string | null
          placa?: string
          tipo_veiculo?: string | null
          transportadora_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transp_veiculos_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transp_veiculos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_commands: {
        Row: {
          confirmado_em: string | null
          created_at: string
          criado_por: string | null
          device_id: string
          estabelecimento_id: string
          id: string
          payload: Json
          resultado: Json | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          confirmado_em?: string | null
          created_at?: string
          criado_por?: string | null
          device_id: string
          estabelecimento_id: string
          id?: string
          payload?: Json
          resultado?: Json | null
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          confirmado_em?: string | null
          created_at?: string
          criado_por?: string | null
          device_id?: string
          estabelecimento_id?: string
          id?: string
          payload?: Json
          resultado?: Json | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_commands_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "tv_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_dashboards: {
        Row: {
          auto_update: boolean
          cache_offline: boolean
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          fullscreen: boolean
          id: string
          nome: string
          refresh_segundos: number
          rota_interna: string | null
          timeout_segundos: number
          tipo: string
          updated_at: string
          url: string | null
        }
        Insert: {
          auto_update?: boolean
          cache_offline?: boolean
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          fullscreen?: boolean
          id?: string
          nome: string
          refresh_segundos?: number
          rota_interna?: string | null
          timeout_segundos?: number
          tipo?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          auto_update?: boolean
          cache_offline?: boolean
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          fullscreen?: boolean
          id?: string
          nome?: string
          refresh_segundos?: number
          rota_interna?: string | null
          timeout_segundos?: number
          tipo?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      tv_devices: {
        Row: {
          armazenamento: number | null
          bloqueado: boolean
          codigo: string
          cpu_uso: number | null
          created_at: string
          dashboard_atual_id: string | null
          emparelhado_em: string | null
          estabelecimento_id: string
          grupo_id: string | null
          id: string
          idioma: string | null
          ip: string | null
          local: string | null
          memoria_uso: number | null
          nome: string
          observacoes: string | null
          playlist_id: string | null
          resolucao: string | null
          split_b_dashboard_id: string | null
          split_b_duracao_segundos: number
          split_b_intervalo_segundos: number
          split_b_playlist_id: string | null
          split_b_visivel_modo: string
          split_c_dashboard_id: string | null
          split_c_duracao_segundos: number
          split_c_intervalo_segundos: number
          split_c_playlist_id: string | null
          split_c_visivel_modo: string
          split_modo: string
          split_paineis: number
          split_proporcao: number
          split_proporcao_b: number
          split_zoom_a: number
          split_zoom_b: number
          split_zoom_c: number
          status: string
          tema: string | null
          token_hash: string
          ultima_comunicacao: string | null
          updated_at: string
          uptime_segundos: number | null
          versao_app: string | null
          versao_min_requerida: string | null
        }
        Insert: {
          armazenamento?: number | null
          bloqueado?: boolean
          codigo: string
          cpu_uso?: number | null
          created_at?: string
          dashboard_atual_id?: string | null
          emparelhado_em?: string | null
          estabelecimento_id: string
          grupo_id?: string | null
          id?: string
          idioma?: string | null
          ip?: string | null
          local?: string | null
          memoria_uso?: number | null
          nome: string
          observacoes?: string | null
          playlist_id?: string | null
          resolucao?: string | null
          split_b_dashboard_id?: string | null
          split_b_duracao_segundos?: number
          split_b_intervalo_segundos?: number
          split_b_playlist_id?: string | null
          split_b_visivel_modo?: string
          split_c_dashboard_id?: string | null
          split_c_duracao_segundos?: number
          split_c_intervalo_segundos?: number
          split_c_playlist_id?: string | null
          split_c_visivel_modo?: string
          split_modo?: string
          split_paineis?: number
          split_proporcao?: number
          split_proporcao_b?: number
          split_zoom_a?: number
          split_zoom_b?: number
          split_zoom_c?: number
          status?: string
          tema?: string | null
          token_hash: string
          ultima_comunicacao?: string | null
          updated_at?: string
          uptime_segundos?: number | null
          versao_app?: string | null
          versao_min_requerida?: string | null
        }
        Update: {
          armazenamento?: number | null
          bloqueado?: boolean
          codigo?: string
          cpu_uso?: number | null
          created_at?: string
          dashboard_atual_id?: string | null
          emparelhado_em?: string | null
          estabelecimento_id?: string
          grupo_id?: string | null
          id?: string
          idioma?: string | null
          ip?: string | null
          local?: string | null
          memoria_uso?: number | null
          nome?: string
          observacoes?: string | null
          playlist_id?: string | null
          resolucao?: string | null
          split_b_dashboard_id?: string | null
          split_b_duracao_segundos?: number
          split_b_intervalo_segundos?: number
          split_b_playlist_id?: string | null
          split_b_visivel_modo?: string
          split_c_dashboard_id?: string | null
          split_c_duracao_segundos?: number
          split_c_intervalo_segundos?: number
          split_c_playlist_id?: string | null
          split_c_visivel_modo?: string
          split_modo?: string
          split_paineis?: number
          split_proporcao?: number
          split_proporcao_b?: number
          split_zoom_a?: number
          split_zoom_b?: number
          split_zoom_c?: number
          status?: string
          tema?: string | null
          token_hash?: string
          ultima_comunicacao?: string | null
          updated_at?: string
          uptime_segundos?: number | null
          versao_app?: string | null
          versao_min_requerida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_devices_dashboard_atual_id_fkey"
            columns: ["dashboard_atual_id"]
            isOneToOne: false
            referencedRelation: "tv_dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_devices_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "tv_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_devices_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "tv_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_devices_split_b_dashboard_id_fkey"
            columns: ["split_b_dashboard_id"]
            isOneToOne: false
            referencedRelation: "tv_dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_devices_split_b_playlist_id_fkey"
            columns: ["split_b_playlist_id"]
            isOneToOne: false
            referencedRelation: "tv_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_devices_split_c_dashboard_id_fkey"
            columns: ["split_c_dashboard_id"]
            isOneToOne: false
            referencedRelation: "tv_dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_devices_split_c_playlist_id_fkey"
            columns: ["split_c_playlist_id"]
            isOneToOne: false
            referencedRelation: "tv_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_events: {
        Row: {
          contexto: Json | null
          created_at: string
          device_id: string | null
          estabelecimento_id: string
          id: string
          mensagem: string | null
          nivel: string
          tipo: string | null
        }
        Insert: {
          contexto?: Json | null
          created_at?: string
          device_id?: string | null
          estabelecimento_id: string
          id?: string
          mensagem?: string | null
          nivel?: string
          tipo?: string | null
        }
        Update: {
          contexto?: Json | null
          created_at?: string
          device_id?: string | null
          estabelecimento_id?: string
          id?: string
          mensagem?: string | null
          nivel?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "tv_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_groups: {
        Row: {
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          id: string
          local: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          local?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          local?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      tv_heartbeats: {
        Row: {
          armazenamento: number | null
          cpu_uso: number | null
          created_at: string
          device_id: string
          estabelecimento_id: string
          id: string
          ip: string | null
          memoria_uso: number | null
          resolucao: string | null
          uptime_segundos: number | null
          versao_app: string | null
        }
        Insert: {
          armazenamento?: number | null
          cpu_uso?: number | null
          created_at?: string
          device_id: string
          estabelecimento_id: string
          id?: string
          ip?: string | null
          memoria_uso?: number | null
          resolucao?: string | null
          uptime_segundos?: number | null
          versao_app?: string | null
        }
        Update: {
          armazenamento?: number | null
          cpu_uso?: number | null
          created_at?: string
          device_id?: string
          estabelecimento_id?: string
          id?: string
          ip?: string | null
          memoria_uso?: number | null
          resolucao?: string | null
          uptime_segundos?: number | null
          versao_app?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_heartbeats_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "tv_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_murais: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          duracao_padrao_imagem: number
          embaralhar: boolean
          estabelecimento_id: string
          id: string
          itens: Json
          loop: boolean
          nome: string
          transicao: string
          transicao_ms: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          duracao_padrao_imagem?: number
          embaralhar?: boolean
          estabelecimento_id: string
          id?: string
          itens?: Json
          loop?: boolean
          nome: string
          transicao?: string
          transicao_ms?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          duracao_padrao_imagem?: number
          embaralhar?: boolean
          estabelecimento_id?: string
          id?: string
          itens?: Json
          loop?: boolean
          nome?: string
          transicao?: string
          transicao_ms?: number
          updated_at?: string
        }
        Relationships: []
      }
      tv_playlist_items: {
        Row: {
          created_at: string
          dashboard_id: string
          duracao_segundos: number
          id: string
          modo_avanco: string
          ordem: number
          playlist_id: string
        }
        Insert: {
          created_at?: string
          dashboard_id: string
          duracao_segundos?: number
          id?: string
          modo_avanco?: string
          ordem?: number
          playlist_id: string
        }
        Update: {
          created_at?: string
          dashboard_id?: string
          duracao_segundos?: number
          id?: string
          modo_avanco?: string
          ordem?: number
          playlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_playlist_items_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "tv_dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "tv_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_playlists: {
        Row: {
          created_at: string
          estabelecimento_id: string
          id: string
          loop: boolean
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          loop?: boolean
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          loop?: boolean
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      tv_veiculos_config: {
        Row: {
          autonomo_ativo: boolean
          created_at: string
          estabelecimento_id: string
          foco_segundos: number
          id: string
          overview_segundos: number
          pausa_falha_segundos: number
          pausa_interacao_segundos: number
          quiosque_ativo: boolean
          sempre_visao_geral: boolean
          trilha_minutos: number
          updated_at: string
        }
        Insert: {
          autonomo_ativo?: boolean
          created_at?: string
          estabelecimento_id: string
          foco_segundos?: number
          id?: string
          overview_segundos?: number
          pausa_falha_segundos?: number
          pausa_interacao_segundos?: number
          quiosque_ativo?: boolean
          sempre_visao_geral?: boolean
          trilha_minutos?: number
          updated_at?: string
        }
        Update: {
          autonomo_ativo?: boolean
          created_at?: string
          estabelecimento_id?: string
          foco_segundos?: number
          id?: string
          overview_segundos?: number
          pausa_falha_segundos?: number
          pausa_interacao_segundos?: number
          quiosque_ativo?: boolean
          sempre_visao_geral?: boolean
          trilha_minutos?: number
          updated_at?: string
        }
        Relationships: []
      }
      tv_workflow_execucoes: {
        Row: {
          created_at: string
          device_id: string
          duracao_segundos: number
          estabelecimento_id: string
          estilo: Json
          exibido_em: string | null
          expira_em: string
          id: string
          mensagem_renderizada: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          duracao_segundos?: number
          estabelecimento_id: string
          estilo?: Json
          exibido_em?: string | null
          expira_em: string
          id?: string
          mensagem_renderizada: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          duracao_segundos?: number
          estabelecimento_id?: string
          estilo?: Json
          exibido_em?: string | null
          expira_em?: string
          id?: string
          mensagem_renderizada?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_workflow_execucoes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "tv_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_workflow_poller_state: {
        Row: {
          chave: string
          estabelecimento_id: string | null
          evento: string
          ultimo_check: string
          ultimo_ref: string | null
          updated_at: string
        }
        Insert: {
          chave: string
          estabelecimento_id?: string | null
          evento: string
          ultimo_check?: string
          ultimo_ref?: string | null
          updated_at?: string
        }
        Update: {
          chave?: string
          estabelecimento_id?: string | null
          evento?: string
          ultimo_check?: string
          ultimo_ref?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tv_workflows: {
        Row: {
          ativo: boolean
          created_at: string
          dashboard_id: string | null
          duracao_segundos: number
          escopo_ids: string[]
          escopo_tipo: string
          estabelecimento_id: string
          estilo: Json
          evento: string
          filtros: Json
          flow_json: Json | null
          id: string
          mensagem_template: string
          nome: string
          ultimo_disparo_em: string | null
          updated_at: string
          versao: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dashboard_id?: string | null
          duracao_segundos?: number
          escopo_ids?: string[]
          escopo_tipo?: string
          estabelecimento_id: string
          estilo?: Json
          evento: string
          filtros?: Json
          flow_json?: Json | null
          id?: string
          mensagem_template: string
          nome: string
          ultimo_disparo_em?: string | null
          updated_at?: string
          versao?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dashboard_id?: string | null
          duracao_segundos?: number
          escopo_ids?: string[]
          escopo_tipo?: string
          estabelecimento_id?: string
          estilo?: Json
          evento?: string
          filtros?: Json
          flow_json?: Json | null
          id?: string
          mensagem_template?: string
          nome?: string
          ultimo_disparo_em?: string | null
          updated_at?: string
          versao?: number
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
      usage_events: {
        Row: {
          created_at: string
          duration_ms: number
          ended_at: string
          estabelecimento_id: string
          id: string
          idle_ms: number
          page_title: string | null
          route: string
          started_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          ended_at?: string
          estabelecimento_id: string
          id?: string
          idle_ms?: number
          page_title?: string | null
          route: string
          started_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          ended_at?: string
          estabelecimento_id?: string
          id?: string
          idle_ms?: number
          page_title?: string | null
          route?: string
          started_at?: string
          usuario_id?: string
        }
        Relationships: []
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
      usuario_posicoes: {
        Row: {
          accuracy: number | null
          bateria: number | null
          created_at: string
          data_hora: string
          estabelecimento_id: string
          id: string
          lat: number
          lng: number
          origem: string | null
          usuario_id: string
        }
        Insert: {
          accuracy?: number | null
          bateria?: number | null
          created_at?: string
          data_hora?: string
          estabelecimento_id: string
          id?: string
          lat: number
          lng: number
          origem?: string | null
          usuario_id: string
        }
        Update: {
          accuracy?: number | null
          bateria?: number | null
          created_at?: string
          data_hora?: string
          estabelecimento_id?: string
          id?: string
          lat?: number
          lng?: number
          origem?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_posicoes_usuario_id_fkey"
            columns: ["usuario_id"]
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
      usuario_telas_customizadas: {
        Row: {
          created_at: string
          estabelecimento_id: string
          id: string
          tela_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          estabelecimento_id: string
          id?: string
          tela_id: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          estabelecimento_id?: string
          id?: string
          tela_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_telas_customizadas_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_telas_customizadas_tela_id_fkey"
            columns: ["tela_id"]
            isOneToOne: false
            referencedRelation: "telas_customizadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_telas_customizadas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          estabelecimento_id: string | null
          grupo_acesso_id: string | null
          hora_final: string
          hora_inicial: string
          id: string
          imap: string | null
          is_porteiro: boolean
          nome: string
          pilarfone_abas: string[] | null
          pode_usar_interfone: boolean
          pop: string | null
          porta_imap: number | null
          porta_pop: number | null
          porta_smtp: number | null
          ramal: string | null
          ramal_portaria: string | null
          ramal_senha: string | null
          segmento_id: string | null
          senha_email: string | null
          senha_hash: string
          senha_sip: string | null
          sip_servidor: string | null
          sip_servidor_alternativo: string | null
          smtp: string | null
          tipo: string
          unidade_id: string | null
          updated_at: string | null
          usar_autenticacao: boolean | null
          usuario_sip: string | null
          whatsapp: string | null
          whatsapp_numero_id: string | null
          whatsapp_status: Database["public"]["Enums"]["whatsapp_status_enum"]
          whatsapp_status_at: string | null
          whatsapp_status_reason: string | null
        }
        Insert: {
          ativo?: boolean
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          estabelecimento_id?: string | null
          grupo_acesso_id?: string | null
          hora_final?: string
          hora_inicial?: string
          id?: string
          imap?: string | null
          is_porteiro?: boolean
          nome: string
          pilarfone_abas?: string[] | null
          pode_usar_interfone?: boolean
          pop?: string | null
          porta_imap?: number | null
          porta_pop?: number | null
          porta_smtp?: number | null
          ramal?: string | null
          ramal_portaria?: string | null
          ramal_senha?: string | null
          segmento_id?: string | null
          senha_email?: string | null
          senha_hash: string
          senha_sip?: string | null
          sip_servidor?: string | null
          sip_servidor_alternativo?: string | null
          smtp?: string | null
          tipo?: string
          unidade_id?: string | null
          updated_at?: string | null
          usar_autenticacao?: boolean | null
          usuario_sip?: string | null
          whatsapp?: string | null
          whatsapp_numero_id?: string | null
          whatsapp_status?: Database["public"]["Enums"]["whatsapp_status_enum"]
          whatsapp_status_at?: string | null
          whatsapp_status_reason?: string | null
        }
        Update: {
          ativo?: boolean
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          estabelecimento_id?: string | null
          grupo_acesso_id?: string | null
          hora_final?: string
          hora_inicial?: string
          id?: string
          imap?: string | null
          is_porteiro?: boolean
          nome?: string
          pilarfone_abas?: string[] | null
          pode_usar_interfone?: boolean
          pop?: string | null
          porta_imap?: number | null
          porta_pop?: number | null
          porta_smtp?: number | null
          ramal?: string | null
          ramal_portaria?: string | null
          ramal_senha?: string | null
          segmento_id?: string | null
          senha_email?: string | null
          senha_hash?: string
          senha_sip?: string | null
          sip_servidor?: string | null
          sip_servidor_alternativo?: string | null
          smtp?: string | null
          tipo?: string
          unidade_id?: string | null
          updated_at?: string | null
          usar_autenticacao?: boolean | null
          usuario_sip?: string | null
          whatsapp?: string | null
          whatsapp_numero_id?: string | null
          whatsapp_status?: Database["public"]["Enums"]["whatsapp_status_enum"]
          whatsapp_status_at?: string | null
          whatsapp_status_reason?: string | null
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
          {
            foreignKeyName: "usuarios_whatsapp_numero_id_fkey"
            columns: ["whatsapp_numero_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numeros"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculo_comandos: {
        Row: {
          comando: string
          created_at: string
          criado_por: string | null
          estabelecimento_id: string
          executado_em: string | null
          id: string
          resposta: string | null
          status: string
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          comando: string
          created_at?: string
          criado_por?: string | null
          estabelecimento_id: string
          executado_em?: string | null
          id?: string
          resposta?: string | null
          status?: string
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          comando?: string
          created_at?: string
          criado_por?: string | null
          estabelecimento_id?: string
          executado_em?: string | null
          id?: string
          resposta?: string | null
          status?: string
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculo_comandos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculo_posicoes: {
        Row: {
          corte_combustivel: boolean | null
          created_at: string
          data_hora: string
          direcao: number | null
          id: string
          ignicao: boolean | null
          lat: number
          lng: number
          nivel_combustivel: number | null
          veiculo_id: string
          velocidade: number | null
        }
        Insert: {
          corte_combustivel?: boolean | null
          created_at?: string
          data_hora?: string
          direcao?: number | null
          id?: string
          ignicao?: boolean | null
          lat: number
          lng: number
          nivel_combustivel?: number | null
          veiculo_id: string
          velocidade?: number | null
        }
        Update: {
          corte_combustivel?: boolean | null
          created_at?: string
          data_hora?: string
          direcao?: number | null
          id?: string
          ignicao?: boolean | null
          lat?: number
          lng?: number
          nivel_combustivel?: number | null
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
          apn_operadora: string | null
          ativo: boolean | null
          celular: string | null
          created_at: string
          descricao: string | null
          estabelecimento_id: string | null
          grupo_id: string | null
          id: string
          limite_velocidade: number | null
          logistica_grupo_id: string | null
          motorista: string | null
          placa: string
          telefone_sms: string | null
          tipo_chip: string
          tipo_veiculo: string | null
          traccar_device_id: string | null
          tracker_config_at: string | null
          tracker_config_error: string | null
          tracker_config_log: Json
          tracker_config_status: string
          tracker_expect_sms_reply: boolean
          tracker_model_id: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          apn_operadora?: string | null
          ativo?: boolean | null
          celular?: string | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string | null
          grupo_id?: string | null
          id?: string
          limite_velocidade?: number | null
          logistica_grupo_id?: string | null
          motorista?: string | null
          placa: string
          telefone_sms?: string | null
          tipo_chip?: string
          tipo_veiculo?: string | null
          traccar_device_id?: string | null
          tracker_config_at?: string | null
          tracker_config_error?: string | null
          tracker_config_log?: Json
          tracker_config_status?: string
          tracker_expect_sms_reply?: boolean
          tracker_model_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          apn_operadora?: string | null
          ativo?: boolean | null
          celular?: string | null
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string | null
          grupo_id?: string | null
          id?: string
          limite_velocidade?: number | null
          logistica_grupo_id?: string | null
          motorista?: string | null
          placa?: string
          telefone_sms?: string | null
          tipo_chip?: string
          tipo_veiculo?: string | null
          traccar_device_id?: string | null
          tracker_config_at?: string | null
          tracker_config_error?: string | null
          tracker_config_log?: Json
          tracker_config_status?: string
          tracker_expect_sms_reply?: boolean
          tracker_model_id?: string | null
          unidade_id?: string | null
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
          {
            foreignKeyName: "veiculos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_logistica_grupo_id_fkey"
            columns: ["logistica_grupo_id"]
            isOneToOne: false
            referencedRelation: "logistica_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_tracker_model_id_fkey"
            columns: ["tracker_model_id"]
            isOneToOne: false
            referencedRelation: "tracker_device_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
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
      vis_access_records: {
        Row: {
          contact_person_id: string | null
          contact_person_name: string
          entry_date: string
          estabelecimento_id: string | null
          exit_date: string | null
          id: string
          notes: string | null
          porteiro_entrada_id: string | null
          porteiro_entrada_nome: string | null
          porteiro_saida_id: string | null
          porteiro_saida_nome: string | null
          purpose: string | null
          status: string
          unidade_id: string | null
          vehicle_plate: string | null
          visitor_id: string
        }
        Insert: {
          contact_person_id?: string | null
          contact_person_name: string
          entry_date?: string
          estabelecimento_id?: string | null
          exit_date?: string | null
          id?: string
          notes?: string | null
          porteiro_entrada_id?: string | null
          porteiro_entrada_nome?: string | null
          porteiro_saida_id?: string | null
          porteiro_saida_nome?: string | null
          purpose?: string | null
          status?: string
          unidade_id?: string | null
          vehicle_plate?: string | null
          visitor_id: string
        }
        Update: {
          contact_person_id?: string | null
          contact_person_name?: string
          entry_date?: string
          estabelecimento_id?: string | null
          exit_date?: string | null
          id?: string
          notes?: string | null
          porteiro_entrada_id?: string | null
          porteiro_entrada_nome?: string | null
          porteiro_saida_id?: string | null
          porteiro_saida_nome?: string | null
          purpose?: string | null
          status?: string
          unidade_id?: string | null
          vehicle_plate?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vis_access_records_contact_person_id_fkey"
            columns: ["contact_person_id"]
            isOneToOne: false
            referencedRelation: "vis_contact_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vis_access_records_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vis_access_records_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vis_access_records_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "vis_visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      vis_contact_persons: {
        Row: {
          cpf: string
          created_at: string
          estabelecimento_id: string | null
          id: string
          name: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          cpf: string
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          name: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          cpf?: string
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          name?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "vis_contact_persons_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      vis_pending_visitors: {
        Row: {
          authorized_at: string | null
          authorized_by: string | null
          contact_person_id: string
          contact_person_name: string
          created_at: string
          estabelecimento_id: string | null
          id: string
          notes: string | null
          purpose: string | null
          status: string
          vehicle_plate: string | null
          visitor_id: string
        }
        Insert: {
          authorized_at?: string | null
          authorized_by?: string | null
          contact_person_id: string
          contact_person_name: string
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          status?: string
          vehicle_plate?: string | null
          visitor_id: string
        }
        Update: {
          authorized_at?: string | null
          authorized_by?: string | null
          contact_person_id?: string
          contact_person_name?: string
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          status?: string
          vehicle_plate?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vis_pending_visitors_contact_person_id_fkey"
            columns: ["contact_person_id"]
            isOneToOne: false
            referencedRelation: "vis_contact_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vis_pending_visitors_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vis_pending_visitors_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "vis_visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      vis_visitors: {
        Row: {
          company: string
          cpf: string
          created_at: string
          email: string | null
          estabelecimento_id: string | null
          id: string
          name: string
          phone: string | null
          photo: string | null
          unidade_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          company: string
          cpf: string
          created_at?: string
          email?: string | null
          estabelecimento_id?: string | null
          id?: string
          name: string
          phone?: string | null
          photo?: string | null
          unidade_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          company?: string
          cpf?: string
          created_at?: string
          email?: string | null
          estabelecimento_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          photo?: string | null
          unidade_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vis_visitors_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vis_visitors_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      visita_formulario_campos: {
        Row: {
          chave: string
          condicional: Json | null
          created_at: string
          formulario_id: string
          id: string
          obrigatorio: boolean
          opcoes: Json | null
          ordem: number
          placeholder: string | null
          rotulo: string
          tipo: string
          updated_at: string
        }
        Insert: {
          chave: string
          condicional?: Json | null
          created_at?: string
          formulario_id: string
          id?: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          placeholder?: string | null
          rotulo: string
          tipo: string
          updated_at?: string
        }
        Update: {
          chave?: string
          condicional?: Json | null
          created_at?: string
          formulario_id?: string
          id?: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          placeholder?: string | null
          rotulo?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visita_formulario_campos_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "visita_formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      visita_formulario_regras: {
        Row: {
          ativa: boolean
          created_at: string
          escopo: string
          estabelecimento_id: string
          filial_id: string | null
          formulario_id: string
          id: string
          obrigatorio_encerrar: boolean
          prioridade: number
          segmento_id: string | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          escopo: string
          estabelecimento_id: string
          filial_id?: string | null
          formulario_id: string
          id?: string
          obrigatorio_encerrar?: boolean
          prioridade?: number
          segmento_id?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          ativa?: boolean
          created_at?: string
          escopo?: string
          estabelecimento_id?: string
          filial_id?: string | null
          formulario_id?: string
          id?: string
          obrigatorio_encerrar?: boolean
          prioridade?: number
          segmento_id?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visita_formulario_regras_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "visita_formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      visita_formulario_respostas: {
        Row: {
          anexos: Json | null
          created_at: string
          empresa_id: string | null
          estabelecimento_id: string
          formulario_id: string
          id: string
          lat: number | null
          lng: number | null
          ocorrencia_id: string | null
          origem_preenchimento: string
          preenchido_em: string
          preenchido_por: string | null
          respostas: Json
          updated_at: string
        }
        Insert: {
          anexos?: Json | null
          created_at?: string
          empresa_id?: string | null
          estabelecimento_id: string
          formulario_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          ocorrencia_id?: string | null
          origem_preenchimento?: string
          preenchido_em?: string
          preenchido_por?: string | null
          respostas?: Json
          updated_at?: string
        }
        Update: {
          anexos?: Json | null
          created_at?: string
          empresa_id?: string | null
          estabelecimento_id?: string
          formulario_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          ocorrencia_id?: string | null
          origem_preenchimento?: string
          preenchido_em?: string
          preenchido_por?: string | null
          respostas?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visita_formulario_respostas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visita_formulario_respostas_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "visita_formularios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visita_formulario_respostas_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "visita_ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      visita_formularios: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          estabelecimento_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estabelecimento_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estabelecimento_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      visita_ocorrencias: {
        Row: {
          created_at: string
          customer_id: string | null
          data_prevista: string
          distancia_metros: number | null
          duracao_min: number | null
          estabelecimento_id: string
          fonte_deteccao: string | null
          formulario_id: string | null
          formulario_status: string
          hora_chegada: string | null
          hora_saida: string | null
          id: string
          janela_fim: string
          janela_inicio: string
          lat_registro: number | null
          lng_registro: number | null
          observacao_auto: string | null
          origem: string
          programacao_id: string
          status: string
          updated_at: string
          usuario_id: string | null
          veiculo_id: string | null
          verificada_em: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          data_prevista: string
          distancia_metros?: number | null
          duracao_min?: number | null
          estabelecimento_id: string
          fonte_deteccao?: string | null
          formulario_id?: string | null
          formulario_status?: string
          hora_chegada?: string | null
          hora_saida?: string | null
          id?: string
          janela_fim: string
          janela_inicio: string
          lat_registro?: number | null
          lng_registro?: number | null
          observacao_auto?: string | null
          origem?: string
          programacao_id: string
          status?: string
          updated_at?: string
          usuario_id?: string | null
          veiculo_id?: string | null
          verificada_em?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          data_prevista?: string
          distancia_metros?: number | null
          duracao_min?: number | null
          estabelecimento_id?: string
          fonte_deteccao?: string | null
          formulario_id?: string | null
          formulario_status?: string
          hora_chegada?: string | null
          hora_saida?: string | null
          id?: string
          janela_fim?: string
          janela_inicio?: string
          lat_registro?: number | null
          lng_registro?: number | null
          observacao_auto?: string | null
          origem?: string
          programacao_id?: string
          status?: string
          updated_at?: string
          usuario_id?: string | null
          veiculo_id?: string | null
          verificada_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visita_ocorrencias_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "visita_formularios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visita_ocorrencias_programacao_id_fkey"
            columns: ["programacao_id"]
            isOneToOne: false
            referencedRelation: "visita_programacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visita_ocorrencias_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      visita_programacoes: {
        Row: {
          ativa: boolean
          cliente_nome: string
          created_at: string
          customer_id: string | null
          data_fim: string | null
          data_inicio: string
          dias_semana: number[]
          endereco: string
          estabelecimento_id: string
          filial_id: string | null
          frequencia_qtd: number
          frequencia_tipo: string
          hora_fim: string
          hora_inicio: string
          id: string
          intervalo_dias: number | null
          lat: number | null
          lng: number | null
          observacao: string | null
          regra_monitoramento_id: string | null
          responsavel_tipo: string
          responsavel_usuario_id: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cliente_nome: string
          created_at?: string
          customer_id?: string | null
          data_fim?: string | null
          data_inicio?: string
          dias_semana?: number[]
          endereco: string
          estabelecimento_id: string
          filial_id?: string | null
          frequencia_qtd?: number
          frequencia_tipo: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          intervalo_dias?: number | null
          lat?: number | null
          lng?: number | null
          observacao?: string | null
          regra_monitoramento_id?: string | null
          responsavel_tipo?: string
          responsavel_usuario_id?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cliente_nome?: string
          created_at?: string
          customer_id?: string | null
          data_fim?: string | null
          data_inicio?: string
          dias_semana?: number[]
          endereco?: string
          estabelecimento_id?: string
          filial_id?: string | null
          frequencia_qtd?: number
          frequencia_tipo?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          intervalo_dias?: number | null
          lat?: number | null
          lng?: number | null
          observacao?: string | null
          regra_monitoramento_id?: string | null
          responsavel_tipo?: string
          responsavel_usuario_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visita_programacoes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visita_programacoes_regra_monitoramento_id_fkey"
            columns: ["regra_monitoramento_id"]
            isOneToOne: false
            referencedRelation: "visita_regras_monitoramento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visita_programacoes_responsavel_usuario_id_fkey"
            columns: ["responsavel_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      visita_regras_monitoramento: {
        Row: {
          ativa: boolean
          created_at: string
          detectar_espontanea: boolean
          escopo: string
          espontanea_ignorar_propria_filial: boolean
          estabelecimento_id: string
          exigir_janela_horario: boolean
          filial_id: string | null
          fonte_localizacao: string
          id: string
          nome: string
          raio_metros: number
          tempo_minimo_min: number
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          detectar_espontanea?: boolean
          escopo?: string
          espontanea_ignorar_propria_filial?: boolean
          estabelecimento_id: string
          exigir_janela_horario?: boolean
          filial_id?: string | null
          fonte_localizacao?: string
          id?: string
          nome: string
          raio_metros?: number
          tempo_minimo_min?: number
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          ativa?: boolean
          created_at?: string
          detectar_espontanea?: boolean
          escopo?: string
          espontanea_ignorar_propria_filial?: boolean
          estabelecimento_id?: string
          exigir_janela_horario?: boolean
          filial_id?: string | null
          fonte_localizacao?: string
          id?: string
          nome?: string
          raio_metros?: number
          tempo_minimo_min?: number
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visita_regras_monitoramento_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
          cloud_access_token: string | null
          cloud_business_account_id: string | null
          cloud_phone_number_id: string | null
          cloud_webhook_verify_token: string | null
          created_at: string | null
          estabelecimento_id: string | null
          evolution_api_key: string | null
          evolution_mode: string
          evolution_url: string | null
          id: string
          manager_password: string | null
          manager_url: string | null
          manager_user: string | null
          phone_number_id: string | null
          provider: string
          session_name: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          business_account_id?: string | null
          business_token?: string | null
          cloud_access_token?: string | null
          cloud_business_account_id?: string | null
          cloud_phone_number_id?: string | null
          cloud_webhook_verify_token?: string | null
          created_at?: string | null
          estabelecimento_id?: string | null
          evolution_api_key?: string | null
          evolution_mode?: string
          evolution_url?: string | null
          id?: string
          manager_password?: string | null
          manager_url?: string | null
          manager_user?: string | null
          phone_number_id?: string | null
          provider?: string
          session_name?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          business_account_id?: string | null
          business_token?: string | null
          cloud_access_token?: string | null
          cloud_business_account_id?: string | null
          cloud_phone_number_id?: string | null
          cloud_webhook_verify_token?: string | null
          created_at?: string | null
          estabelecimento_id?: string | null
          evolution_api_key?: string | null
          evolution_mode?: string
          evolution_url?: string | null
          id?: string
          manager_password?: string | null
          manager_url?: string | null
          manager_user?: string | null
          phone_number_id?: string | null
          provider?: string
          session_name?: string | null
          updated_at?: string | null
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
      whatsapp_numeros: {
        Row: {
          ativo: boolean
          cloud_access_token: string | null
          cloud_business_account_id: string | null
          cloud_phone_number_id: string | null
          cloud_webhook_verify_token: string | null
          created_at: string
          estabelecimento_id: string
          evolution_api_key: string | null
          evolution_url: string | null
          id: string
          is_default: boolean
          nome: string
          provider: string
          session_name: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cloud_access_token?: string | null
          cloud_business_account_id?: string | null
          cloud_phone_number_id?: string | null
          cloud_webhook_verify_token?: string | null
          created_at?: string
          estabelecimento_id: string
          evolution_api_key?: string | null
          evolution_url?: string | null
          id?: string
          is_default?: boolean
          nome: string
          provider?: string
          session_name?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cloud_access_token?: string | null
          cloud_business_account_id?: string | null
          cloud_phone_number_id?: string | null
          cloud_webhook_verify_token?: string | null
          created_at?: string
          estabelecimento_id?: string
          evolution_api_key?: string | null
          evolution_url?: string | null
          id?: string
          is_default?: boolean
          nome?: string
          provider?: string
          session_name?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_numeros_estabelecimento_id_fkey"
            columns: ["estabelecimento_id"]
            isOneToOne: false
            referencedRelation: "estabelecimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          auto_reconnect_days: number
          bot_flow_id: string | null
          created_at: string
          estabelecimento_id: string | null
          id: string
          last_reconnect_at: string | null
          phone_number: string | null
          qr_code: string | null
          session_name: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_reconnect_days?: number
          bot_flow_id?: string | null
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          last_reconnect_at?: string | null
          phone_number?: string | null
          qr_code?: string | null
          session_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_reconnect_days?: number
          bot_flow_id?: string | null
          created_at?: string
          estabelecimento_id?: string | null
          id?: string
          last_reconnect_at?: string | null
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
      ponto_banco_horas_a_expirar: {
        Row: {
          banco_horas_prazo_meses: number | null
          created_at: string | null
          data: string | null
          dias_para_expirar: number | null
          empresa_id: string | null
          expira_em: string | null
          funcionario_id: string | null
          funcionario_nome: string | null
          id: string | null
          minutos: number | null
          tipo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_compliance_dashboard: {
        Row: {
          altas: number | null
          criticas: number | null
          empresa_id: string | null
          funcionarios_afetados: number | null
          he_acima_limite: number | null
          interjornada_violada: number | null
          intrajornada_violada: number | null
          jornada_acima_limite: number | null
          mes: string | null
          pendentes: number | null
          resolvidas: number | null
          total_anomalias: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_dsr_detalhado: {
        Row: {
          dias_uteis: number | null
          domingos: number | null
          dsr_calculado_min: number | null
          empresa_id: string | null
          funcionario_id: string | null
          he_total_min: number | null
          mes: string | null
          nome: string | null
          noturno_reduzido_min: number | null
          noturno_total_min: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "ponto_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_login: {
        Args: { cpf_input: string; password_input: string }
        Returns: string
      }
      admins_present: { Args: never; Returns: boolean }
      aggregate_heatmap_daily: { Args: never; Returns: undefined }
      aip_pode_gerenciar_credenciais: { Args: never; Returns: boolean }
      auto_close_support_tickets: { Args: never; Returns: undefined }
      check_catalog_expiration: { Args: never; Returns: undefined }
      check_customer_dependencies: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      check_entity_dependencies: {
        Args: { p_entity: string; p_id: string }
        Returns: Json
      }
      cleanup_old_agent_chat_sessions: { Args: never; Returns: undefined }
      cleanup_relatorio_snapshots_expirados: { Args: never; Returns: number }
      clear_entity_dependency: {
        Args: { p_dep_key: string; p_entity: string; p_id: string }
        Returns: number
      }
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
      exec_readonly_select: { Args: { sql_query: string }; Returns: Json }
      execute_sql: { Args: { sql_query: string }; Returns: Json }
      expire_bot_response_tracking: { Args: never; Returns: number }
      ferr_create_overdue_notifications: { Args: never; Returns: number }
      ferr_get_user_company_id: {
        Args: { check_user_id: string }
        Returns: string
      }
      ferr_is_admin: { Args: { check_user_id: string }; Returns: boolean }
      ferr_is_almoxarifado: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      generate_orcamento_token: { Args: never; Returns: string }
      get_auth_user_estabelecimento_id: { Args: never; Returns: string }
      get_chat_storage_stats: {
        Args: { p_estabelecimento_id: string }
        Returns: Json
      }
      get_current_usuario_id: { Args: never; Returns: string }
      get_current_usuario_id_safe: { Args: never; Returns: string }
      get_minha_unidade_id: { Args: never; Returns: string }
      get_minhas_credenciais: {
        Args: never
        Returns: {
          estabelecimento_id: string
          imap: string
          porta_imap: number
          porta_smtp: number
          ramal: string
          senha_email: string
          senha_sip: string
          smtp: string
          usuario_sip: string
        }[]
      }
      get_published_page: {
        Args: { p_slug: string }
        Returns: {
          config: Json
          sections: Json
        }[]
      }
      get_user_conversation_ids: {
        Args: { _auth_uid: string }
        Returns: string[]
      }
      get_user_estabelecimento_id: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_ponto_empresa_ids: { Args: never; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inactivate_customer: { Args: { p_customer_id: string }; Returns: boolean }
      inactivate_entity: {
        Args: { p_entity: string; p_id: string }
        Returns: boolean
      }
      is_profile_admin: { Args: { _user_id: string }; Returns: boolean }
      is_screen_share_host: { Args: { session_id: string }; Returns: boolean }
      is_screen_share_participant: {
        Args: { session_id: string }
        Returns: boolean
      }
      is_system_admin: { Args: never; Returns: boolean }
      limpar_historico_logistica: {
        Args: { p_data_fim: string; p_data_inicio: string; p_tipo: string }
        Returns: Json
      }
      lookup_orcamento_by_token: { Args: { p_token: string }; Returns: Json }
      lookup_pedido_by_token: {
        Args: { p_token: string }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "pedido_tracking"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      lookup_pedido_ecommerce_by_token: {
        Args: { p_token: string }
        Returns: Json
      }
      lookup_pedido_ecommerce_itens_by_token: {
        Args: { p_token: string }
        Returns: Json
      }
      lookup_pedido_historico_by_token: {
        Args: { p_token: string }
        Returns: Json
      }
      lookup_pedidos_ecommerce_by_tokens: {
        Args: { p_tokens: string[] }
        Returns: Json
      }
      mark_bot_response: {
        Args: {
          p_estabelecimento_id?: string
          p_telefone: string
          p_texto: string
        }
        Returns: number
      }
      match_policy_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          chunk_order: number
          content: string
          id: string
          policy_id: string
          similarity: number
        }[]
      }
      op_calculate_smart_priority: {
        Args: { p_task_execution_id: string }
        Returns: number
      }
      op_calculate_task_priority: {
        Args: { p_task_execution_id: string }
        Returns: number
      }
      op_can_view_task_execution: {
        Args: { p_task_execution_id: string }
        Returns: boolean
      }
      op_get_login_email_by_name: { Args: { p_name: string }; Returns: string }
      op_get_login_options_by_name: {
        Args: { p_name: string }
        Returns: {
          establishment_name: string
          login_email: string
        }[]
      }
      op_get_my_profile_flags: {
        Args: never
        Returns: {
          access_level_id: string
          can_approve_irregularities: boolean
          can_delete_incidents: boolean
        }[]
      }
      op_get_profile_admin_details: {
        Args: { p_profile_id: string }
        Returns: {
          access_level_id: string
          can_approve_irregularities: boolean
          can_delete_incidents: boolean
          login_email: string
          phone: string
        }[]
      }
      op_get_user_establishment_id: {
        Args: { _user_id: string }
        Returns: string
      }
      op_get_user_establishments: {
        Args: { _user_id: string }
        Returns: string[]
      }
      op_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["op_app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      op_is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      op_is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      pode_acessar_unidade: { Args: { _unidade_id: string }; Returns: boolean }
      ponto_aprovador_2fa_valido: {
        Args: { _user_id: string }
        Returns: boolean
      }
      ponto_banco_horas_consumir_fifo: {
        Args: {
          _funcionario_id: string
          _minutos_a_consumir: number
          _motivo?: string
        }
        Returns: {
          lote_id: string
          minutos_consumidos: number
          saldo_restante: number
        }[]
      }
      ponto_banco_horas_expirar_vencidos: { Args: never; Returns: number }
      ponto_calcular_dsr_mensal: {
        Args: { _func_id: string; _mes: string }
        Returns: number
      }
      ponto_calcular_noturno_minutos: {
        Args: {
          _entrada: string
          _fim?: string
          _inicio?: string
          _saida: string
        }
        Returns: number
      }
      ponto_calcular_periodo_aquisitivo: {
        Args: { _func_id: string }
        Returns: {
          aquisitivo_fim: string
          aquisitivo_inicio: string
          concessivo_fim: string
          dias_direito: number
          vencido: boolean
        }[]
      }
      ponto_get_clt_config: {
        Args: { _empresa: string }
        Returns: {
          acao_dsr_violado: string
          acao_he_acima_limite: string
          acao_interjornada_violada: string
          acao_intervalo_violado: string
          acao_jornada_acima_limite: string
          adic_noturno_fim: string
          adic_noturno_hora_ficta_min: number
          adic_noturno_inicio: string
          adic_noturno_percentual: number
          banco_horas_acao_expirado: string
          banco_horas_alerta_dias_antes: number
          banco_horas_auto_expirar: boolean
          banco_horas_prazo_dias: number
          banco_horas_prazo_meses: number
          created_at: string
          detectar_batida_simultanea: boolean
          detectar_padrao_suspeito: boolean
          dsr_max_dias_seguidos: number
          empresa_id: string
          escalonamento_max_niveis: number
          escalonamento_sla_horas: number
          exigir_anexo_he_acima_min: number
          exigir_dupla_aprovacao_acima_min: number
          exigir_motivo_he_acima_min: number
          ferias_abono_max_dias: number
          ferias_aviso_dias_minimo: number
          ferias_aviso_minimo_dias: number
          ferias_fracionamento_max: number
          ferias_max_fracionamentos: number
          ferias_minimo_periodo_dias: number
          ferias_periodo_minimo_dias: number
          ferias_periodo_secundario_min_dias: number
          geofence_violado_marca_revisao: boolean
          horas_trabalho_para_intra_curto: number
          horas_trabalho_para_intra_longo: number
          id: string
          interjornada_min_horas: number
          intervalo_intra_min_curto: number
          intervalo_intra_min_obrigatorio: number
          intervalo_min_entre_batidas_min: number
          max_aprovacoes_em_lote: number
          max_horas_extras_dia_min: number
          max_jornada_total_dia_min: number
          menor_jornada_max_dia_min: number
          menor_proibir_extras: boolean
          notificar_email: boolean
          notificar_funcionario_alteracao: boolean
          notificar_push: boolean
          proibir_auto_aprovacao: boolean
          prontidao_percentual: number
          reflexo_dsr_he: boolean
          reflexo_dsr_noturno: boolean
          sobreaviso_percentual: number
          time_lock_ajuste_horas: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ponto_clt_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ponto_get_vigencia: {
        Args: { _data: string; _func_id: string }
        Returns: {
          alterado_por: string | null
          cargo_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          departamento_id: string | null
          empresa_id: string | null
          escala_id: string | null
          filial_id: string | null
          funcionario_id: string
          id: string
          jornada_contratada_horas: number | null
          motivo: string | null
          valor_hora: number | null
        }
        SetofOptions: {
          from: "*"
          to: "ponto_funcionario_escala_historico"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ponto_periodo_bloqueado: {
        Args: { _data: string; _empresa: string }
        Returns: boolean
      }
      ponto_user_empresa_ids: { Args: never; Returns: string[] }
      ponto_user_funcionario_ids: { Args: never; Returns: string[] }
      port_credenciais_resumo: {
        Args: never
        Returns: {
          device_id: string
          tem_senha: boolean
          tem_token: boolean
          tem_usuario: boolean
          updated_at: string
        }[]
      }
      port_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["port_role"]
          _user_id: string
        }
        Returns: boolean
      }
      port_is_gestor: { Args: { _user_id: string }; Returns: boolean }
      port_is_staff: { Args: { _user_id: string }; Returns: boolean }
      ritmo_humano_consumir: {
        Args: { p_est: string; p_sessao?: string }
        Returns: number
      }
      roles_present: { Args: never; Returns: boolean }
      user_in_estabelecimento: { Args: { estab_id: string }; Returns: boolean }
      visita_haversine_metros: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "agente"
      atendente_status:
        | "disponivel"
        | "ocupado"
        | "ausente"
        | "offline"
        | "pausa"
      bot_response_status: "aguardando" | "respondeu" | "sem_resposta"
      chat_prioridade: "baixa" | "normal" | "alta" | "urgente"
      chat_status:
        | "novo"
        | "em_fila"
        | "em_atendimento"
        | "transferido"
        | "aguardando_cliente"
        | "encerrado"
        | "reaberto"
      cv_defect_category:
        | "mechanical"
        | "electrical"
        | "bodywork"
        | "safety"
        | "other"
      cv_defect_status: "pending" | "in_progress" | "resolved"
      cv_movement_status: "out" | "returned"
      cv_vehicle_type: "vuc" | "truck" | "carro" | "carreta" | "outro"
      ferr_app_role: "admin" | "almoxarifado" | "usuario"
      ferr_issue_status: "pendente" | "resolvido" | "descartado"
      ferr_loan_status:
        | "ativo"
        | "devolvido"
        | "vencido"
        | "renovacao_solicitada"
      ferr_renewal_status: "pendente" | "aprovada" | "rejeitada"
      ferr_return_issue_type: "manutencao" | "danificada" | "perdida"
      ferr_tool_type: "manual" | "eletrica" | "pneumatica"
      op_app_role: "admin" | "manager" | "worker" | "super_admin"
      op_task_frequency: "daily" | "weekly" | "monthly" | "on_demand"
      op_task_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "delayed"
        | "not_done"
      port_role: "super_admin" | "admin" | "porteiro" | "morador"
      tipo_roteamento:
        | "round_robin"
        | "por_skill"
        | "por_disponibilidade"
        | "por_carteira"
        | "por_prioridade"
      whatsapp_status_enum: "unknown" | "valid" | "invalid"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      bot_response_status: ["aguardando", "respondeu", "sem_resposta"],
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
      cv_defect_category: [
        "mechanical",
        "electrical",
        "bodywork",
        "safety",
        "other",
      ],
      cv_defect_status: ["pending", "in_progress", "resolved"],
      cv_movement_status: ["out", "returned"],
      cv_vehicle_type: ["vuc", "truck", "carro", "carreta", "outro"],
      ferr_app_role: ["admin", "almoxarifado", "usuario"],
      ferr_issue_status: ["pendente", "resolvido", "descartado"],
      ferr_loan_status: [
        "ativo",
        "devolvido",
        "vencido",
        "renovacao_solicitada",
      ],
      ferr_renewal_status: ["pendente", "aprovada", "rejeitada"],
      ferr_return_issue_type: ["manutencao", "danificada", "perdida"],
      ferr_tool_type: ["manual", "eletrica", "pneumatica"],
      op_app_role: ["admin", "manager", "worker", "super_admin"],
      op_task_frequency: ["daily", "weekly", "monthly", "on_demand"],
      op_task_status: [
        "pending",
        "in_progress",
        "completed",
        "delayed",
        "not_done",
      ],
      port_role: ["super_admin", "admin", "porteiro", "morador"],
      tipo_roteamento: [
        "round_robin",
        "por_skill",
        "por_disponibilidade",
        "por_carteira",
        "por_prioridade",
      ],
      whatsapp_status_enum: ["unknown", "valid", "invalid"],
    },
  },
} as const
