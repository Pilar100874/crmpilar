import { Node, Edge } from "@xyflow/react";
import { FlowNodeData } from "@/types/flow";

interface ExecutionContext {
  vars: Record<string, any>;
  userMessage: string;
  sessionId: string;
}

export class FlowEngine {
  private nodes: Node[];
  private edges: Edge[];
  private context: ExecutionContext;
  private onResponse: (response: any) => Promise<void>;

  constructor(
    nodes: Node[],
    edges: Edge[],
    context: ExecutionContext,
    onResponse: (response: any) => Promise<void>
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.context = context;
    this.onResponse = onResponse;
  }

  private interpolate(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return this.context.vars[key] || "";
    });
  }

  private evaluateCondition(condition: string): boolean {
    try {
      const interpolated = this.interpolate(condition);
      return new Function("context", `with(context) { return ${interpolated}; }`)(
        this.context.vars
      );
    } catch (error) {
      console.error("Error evaluating condition:", error);
      return false;
    }
  }

  private getNextNodes(currentNodeId: string): Node[] {
    const outgoingEdges = this.edges.filter((e) => e.source === currentNodeId);
    return outgoingEdges
      .map((e) => this.nodes.find((n) => n.id === e.target))
      .filter(Boolean) as Node[];
  }

  async execute(): Promise<void> {
    const startNode = this.nodes.find(
      (n) => (n.data as FlowNodeData).type === "start"
    );

    if (!startNode) {
      throw new Error("No start node found");
    }

    await this.executeNode(startNode);
  }

  private async executeNode(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    console.log(`Executing node: ${data.type}`, data);

    switch (data.type) {
      case "start":
        await this.handleStart(node);
        break;
      case "send_message":
      case "media":
      case "goodbye":
        await this.handleMessage(node);
        break;
      case "ask_name":
      case "ask_question":
      case "ask_email":
      case "ask_number":
      case "ask_phone":
      case "ask_date":
      case "ask_file":
      case "ask_address":
      case "ask_url":
        await this.handleQuestion(node);
        break;
      case "ask_cnpj":
        await this.handleCNPJ(node);
        break;
      case "ask_cep":
        await this.handleCEP(node);
        break;
      case "reply_buttons":
      case "list_buttons":
      case "keyword_options":
        await this.handleButtonsWithRouting(node);
        break;
      case "condition":
        await this.handleCondition(node);
        break;
      case "webhook":
        await this.handleAPI(node);
        break;
      case "set_field":
        await this.handleVariable(node);
        break;
      case "keyword_jump":
        await this.handleKeywordJump(node);
        break;
      case "opt_in_check":
        await this.handleOptInCheck(node);
        break;
      case "trigger_automation":
      case "dynamic_data":
        await this.handleExternal(node);
        break;
      case "crm_cadastro_empresa":
        await this.handleCRMCadastroEmpresa(node);
        break;
      case "crm_gerar_relatorio":
        await this.handleCRMGerarRelatorio(node);
        break;
      case "crm_agenda_rapida":
        await this.handleCRMAgendaRapida(node);
        break;
      case "disparar_push": {
        try {
          const { executarBlocoPush } = await import("@/lib/pushExecutor");
          await executarBlocoPush(data as any, {
            variaveis: (this as any).variables || (this as any).contexto || {},
            workflow_id: (this as any).flowId,
            workflow_tipo: "bot",
            origem: "bot_flow",
          });
        } catch (e) {
          console.error("[flowEngine] disparar_push falhou:", e);
        }
        const pushNext = this.getNextNodes(node.id);
        for (const next of pushNext) await this.executeNode(next);
        break;
      }
      case "enviar_sms": {
        try {
          const { executarBlocoSms } = await import("@/lib/smsExecutor");
          await executarBlocoSms(data as any, {
            variaveis: (this as any).variables || (this as any).contexto || {},
            workflow_tipo: "ads",
            origem: "ads_flow",
          });
        } catch (e) {
          console.error("[flowEngine] enviar_sms falhou:", e);
        }
        const smsNext = this.getNextNodes(node.id);
        for (const next of smsNext) await this.executeNode(next);
        break;
      }
      default:
        console.log(`Node type ${data.type} not implemented yet`);
        const nextNodes = this.getNextNodes(node.id);
        for (const next of nextNodes) {
          await this.executeNode(next);
        }
    }
  }

  private async handleStart(node: Node): Promise<void> {
    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }

  private async handleMessage(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    const content = this.interpolate(config.content || config.text || "");
    
    await this.onResponse({
      type: "message",
      content,
      buttons: config.buttons,
      messageType: config.type || data.type,
    });

    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }

  private async handleQuestion(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    const question = this.interpolate(config.question || "");
    
    const defaults: Record<string, string> = {
      ask_name: "nome",
      ask_question: "resposta",
      ask_email: "email",
      ask_number: "numero",
      ask_phone: "telefone",
      ask_date: "data",
      ask_file: "arquivo",
      ask_address: "endereco",
      ask_url: "url",
    };
    const type = data.type as string;
    const outputVar = (config.variable as string) || defaults[type] || undefined;
    
    await this.onResponse({
      type: "question",
      question,
      questionType: data.type,
      outputVariable: outputVar,
    });

    // Store user's answer in context
    if (outputVar) {
      this.context.vars[outputVar] = this.context.userMessage;
    }

    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }

  private async handleCondition(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;
    const conditions = config.conditions || [];

    for (const condition of conditions) {
      // Build condition expression from operator
      let isConditionMet = false;
      
      if (condition.variable && condition.operator) {
        const variableValue = this.context.vars[condition.variable];
        const compareValue = this.interpolate(condition.value || "");
        
        switch (condition.operator) {
          case "equals":
            isConditionMet = variableValue == compareValue;
            break;
          case "not_equals":
            isConditionMet = variableValue != compareValue;
            break;
          case "contains":
            isConditionMet = String(variableValue).includes(compareValue);
            break;
          case "not_contains":
            isConditionMet = !String(variableValue).includes(compareValue);
            break;
          case "greater":
            isConditionMet = Number(variableValue) > Number(compareValue);
            break;
          case "less":
            isConditionMet = Number(variableValue) < Number(compareValue);
            break;
          case "greater_equal":
            isConditionMet = Number(variableValue) >= Number(compareValue);
            break;
          case "less_equal":
            isConditionMet = Number(variableValue) <= Number(compareValue);
            break;
          case "is_set":
            isConditionMet = variableValue !== undefined && variableValue !== null && variableValue !== "";
            break;
          case "is_not_set":
            isConditionMet = variableValue === undefined || variableValue === null || variableValue === "";
            break;
          case "starts_with":
            isConditionMet = String(variableValue).startsWith(compareValue);
            break;
          case "ends_with":
            isConditionMet = String(variableValue).endsWith(compareValue);
            break;
        }
      } else if (condition.expression) {
        // Legacy: support old expression format
        isConditionMet = this.evaluateCondition(condition.expression);
      }

      if (isConditionMet) {
        const edge = this.edges.find(
          (e) => e.source === node.id && e.sourceHandle === condition.id
        );
        if (edge) {
          const nextNode = this.nodes.find((n) => n.id === edge.target);
          if (nextNode) {
            await this.executeNode(nextNode);
            return;
          }
        }
      }
    }

    // Fallback: execute default path
    const fallbackEdge = this.edges.find(
      (e) => e.source === node.id && e.sourceHandle === "fallback"
    );
    if (fallbackEdge) {
      const nextNode = this.nodes.find((n) => n.id === fallbackEdge.target);
      if (nextNode) {
        await this.executeNode(nextNode);
      }
    }
  }

  private async handleAPI(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    try {
      const url = this.interpolate(config.url || "");
      const headers: Record<string, string> = {};
      
      (config.headers || []).forEach((h: any) => {
        headers[h.key] = this.interpolate(h.value);
      });

      const body = config.body ? JSON.parse(this.interpolate(config.body)) : undefined;

      const response = await fetch(url, {
        method: config.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const result = await response.json();
      
      if (config.outputVariable) {
        this.context.vars[config.outputVariable] = result;
      }

      const nextNodes = this.getNextNodes(node.id);
      for (const next of nextNodes) {
        await this.executeNode(next);
      }
    } catch (error) {
      console.error("API call failed:", error);
      throw error;
    }
  }

  private async handleVariable(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    if (config.operations && Array.isArray(config.operations)) {
      config.operations.forEach((op: any) => {
        if (op.variable && op.value !== undefined) {
          this.context.vars[op.variable] = this.interpolate(String(op.value));
        }
      });
    }

    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }

  private async handleExternal(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    // Placeholder for external automation/data calls
    console.log("External call:", data.type, config);

    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }

  private async handleButtonsWithRouting(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    // Apresentar botões ao usuário
    await this.onResponse({
      type: "buttons",
      content: this.interpolate(config.text || config.content || ""),
      buttons: config.buttons,
      sections: config.sections,
      cards: config.cards,
      nodeType: data.type,
    });

    // Aguardar resposta do usuário e rotear baseado na escolha
    // O userMessage deve conter o índice ou ID do botão selecionado
    const userChoice = this.context.userMessage;
    
    // Salvar resposta em variável se configurado
    if (config.variable) {
      this.context.vars[config.variable] = userChoice;
    }

    // Encontrar a edge correspondente à escolha do usuário
    let targetEdge = null;
    
    if (data.type === "reply_buttons" && config.buttons) {
      const buttons = Array.isArray(config.buttons) ? config.buttons : [];
      const buttonIndex = buttons.findIndex((btn: any) => 
        btn.value === userChoice || btn.text === userChoice
      );
      if (buttonIndex >= 0) {
        targetEdge = this.edges.find(
          (e) => e.source === node.id && e.sourceHandle === `button_${buttonIndex}`
        );
      }
    } else if (data.type === "list_buttons" && config.sections) {
      // Procurar nas seções e itens
      const sections = Array.isArray(config.sections) ? config.sections : [];
      let itemFound = false;
      sections.forEach((section: any, sectionIdx: number) => {
        if (section.items && !itemFound) {
          section.items.forEach((item: any, itemIdx: number) => {
            if (item.id === userChoice || item.label === userChoice || item.title === userChoice) {
              targetEdge = this.edges.find(
                (e) => e.source === node.id && e.sourceHandle === `section_${sectionIdx}_item_${itemIdx}`
              );
              itemFound = true;
            }
          });
        }
      });
    } else if (data.type === "keyword_options") {
      const items: any[] = Array.isArray(config.buttons)
        ? config.buttons
        : (Array.isArray(config.cards) ? config.cards : []);
      const lowerChoice = String(userChoice || "").toLowerCase().trim();
      let idx = items.findIndex((b: any) =>
        b.label === userChoice ||
        b.keyword === userChoice ||
        b.title === userChoice ||
        (Array.isArray(b.keywords) && b.keywords.some((k: string) => String(k).toLowerCase().trim() === lowerChoice))
      );
      // Permitir escolha pelo número (1, 2, 3...)
      if (idx < 0) {
        const n = parseInt(lowerChoice, 10);
        if (!isNaN(n) && n >= 1 && n <= items.length) idx = n - 1;
      }
      if (idx >= 0) {
        targetEdge = this.edges.find(
          (e) => e.source === node.id && e.sourceHandle === `button_${idx}`
        );
      }
    }

    if (targetEdge) {
      const nextNode = this.nodes.find((n) => n.id === targetEdge.target);
      if (nextNode) {
        await this.executeNode(nextNode);
        return;
      }
    }

    // Fallback: continuar para próximo nó se não houver roteamento específico
    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }

  private async handleKeywordJump(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;
    const keywords = config.keywords || [];
    const userMessage = this.context.userMessage.toLowerCase();

    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      const keyword = kw.caseSensitive ? kw.keyword : kw.keyword.toLowerCase();
      
      if (userMessage.includes(keyword)) {
        const edge = this.edges.find(
          (e) => e.source === node.id && e.sourceHandle === `keyword_${i}`
        );
        if (edge) {
          const nextNode = this.nodes.find((n) => n.id === edge.target);
          if (nextNode) {
            await this.executeNode(nextNode);
            return;
          }
        }
      }
    }

    // Nenhuma palavra-chave encontrada, continuar normalmente
    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }

  private async handleOptInCheck(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    const optInStatus = this.context.vars.opt_in_status || "pending";
    
    if (optInStatus === "opted_in") {
      const yesEdge = this.edges.find(
        (e) => e.source === node.id && e.sourceHandle === "yes"
      );
      if (yesEdge) {
        const nextNode = this.nodes.find((n) => n.id === yesEdge.target);
        if (nextNode) await this.executeNode(nextNode);
      }
    } else {
      const noEdge = this.edges.find(
        (e) => e.source === node.id && e.sourceHandle === "no"
      );
      if (noEdge) {
        const nextNode = this.nodes.find((n) => n.id === noEdge.target);
        if (nextNode) await this.executeNode(nextNode);
      }
    }
  }

  private async handleCNPJ(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    const question = this.interpolate(config.question || "Digite o CNPJ da empresa:");
    
    await this.onResponse({
      type: "question",
      question,
      questionType: "ask_cnpj",
      outputVariable: config.variable || "cnpj",
    });

    // Simular chamada à edge function consultar-cnpj
    const cnpjValue = this.context.userMessage || "";
    
    // Mapear os campos configurados para as variáveis
    const fieldMappings = {
      variable: 'cnpj',
      razaoSocialField: 'razao_social',
      nomeFantasiaField: 'nome_fantasia',
      naturezaJuridicaField: 'natureza_juridica',
      dataAberturaField: 'abertura',
      situacaoField: 'situacao',
      porteField: 'porte',
      atividadePrincipalField: 'atividade_principal',
      logradouroField: 'logradouro',
      numeroField: 'numero',
      complementoField: 'complemento',
      bairroField: 'bairro',
      municipioField: 'municipio',
      ufField: 'uf',
      cepField: 'cep',
      telefoneField: 'telefone',
      emailField: 'email',
      socioNomeField: 'socio_nome',
      socioQualificacaoField: 'socio_qualificacao',
      regimeTributarioField: 'regime_tributario',
      simplesOptanteField: 'simples_optante',
      simeiOptanteField: 'simei_optante',
    };

    // Em um cenário real, aqui seria feita a chamada à edge function
    // Por ora, vamos simular salvando o CNPJ e criando variáveis mock para os outros campos
    for (const [configKey, apiField] of Object.entries(fieldMappings)) {
      const variableName = config[configKey];
      if (variableName) {
        if (configKey === 'variable') {
          this.context.vars[variableName] = cnpjValue;
        } else {
          // Simular dados da API - em produção viriam da edge function
          this.context.vars[variableName] = `[${apiField}]`;
        }
      }
    }

    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }

  private async handleCEP(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    const question = this.interpolate(config.question || "Digite o CEP:");
    
    await this.onResponse({
      type: "question",
      question,
      questionType: "ask_cep",
      outputVariable: config.variable || "cep",
    });

    const cepValue = this.context.userMessage || "";
    
    // Mapear os campos configurados para as variáveis
    const fieldMappings = {
      variable: 'cep',
      logradouroField: 'logradouro',
      bairroField: 'bairro',
      localidadeField: 'localidade',
      ufField: 'uf',
      complementoField: 'complemento',
    };

    // Salvar as variáveis conforme configurado
    for (const [configKey, apiField] of Object.entries(fieldMappings)) {
      const variableName = config[configKey];
      if (variableName) {
        if (configKey === 'variable') {
          this.context.vars[variableName] = cepValue;
        } else {
          // Simular dados da API - em produção viriam da API do ViaCEP
          this.context.vars[variableName] = `[${apiField}]`;
        }
      }
    }

    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }

  // Função auxiliar para formatar dados antes de inserir
  private formatarDadosEmpresa(campo: string, valor: string): string {
    if (!valor) return valor;
    
    const valorTrimmed = valor.trim();
    
    switch (campo) {
      case 'cnpj':
        // Remover todos os caracteres não numéricos
        return valorTrimmed.replace(/\D/g, '');
      
      case 'cep':
        // Remover todos os caracteres não numéricos
        const cepLimpo = valorTrimmed.replace(/\D/g, '');
        // Formatar com tracinho: XXXXX-XXX
        if (cepLimpo.length === 8) {
          return `${cepLimpo.substring(0, 5)}-${cepLimpo.substring(5)}`;
        }
        return cepLimpo;
      
      case 'telefone':
        // Se houver múltiplos telefones separados por vírgula, vírgula+espaço, ou ponto-e-vírgula, pegar apenas o primeiro
        let primeiroTelefone = valorTrimmed.split(/[,;]/)[0].trim();
        
        // Remover todos os caracteres não numéricos
        let telefoneNumeros = primeiroTelefone.replace(/\D/g, '');
        
        // Se não começar com 55, adicionar código do país
        if (!telefoneNumeros.startsWith('55')) {
          telefoneNumeros = '55' + telefoneNumeros;
        }
        
        // Limitar a 13 dígitos (55 + 11 dígitos)
        telefoneNumeros = telefoneNumeros.substring(0, 13);
        
        // Formatar: +55 (XX) XXXXX-XXXX ou +55 (XX) XXXX-XXXX
        if (telefoneNumeros.length === 13) {
          // Celular com 9 dígitos
          return `+${telefoneNumeros.substring(0, 2)} (${telefoneNumeros.substring(2, 4)}) ${telefoneNumeros.substring(4, 9)}-${telefoneNumeros.substring(9)}`;
        } else if (telefoneNumeros.length === 12) {
          // Fixo com 8 dígitos
          return `+${telefoneNumeros.substring(0, 2)} (${telefoneNumeros.substring(2, 4)}) ${telefoneNumeros.substring(4, 8)}-${telefoneNumeros.substring(8)}`;
        }
        
        return telefoneNumeros;
      
      case 'email':
        // Converter para minúsculas, fazer trim, e remover espaços
        return valorTrimmed.toLowerCase().replace(/\s/g, '');
      
      case 'estado':
        // Converter para maiúsculas e limitar a 2 caracteres
        return valorTrimmed.toUpperCase().substring(0, 2);
      
      case 'razao_social':
      case 'nome_fantasia':
      case 'cidade':
      case 'endereco':
        // Capitalizar primeira letra de cada palavra
        return valorTrimmed
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      
      default:
        // Para outros campos, apenas trim
        return valorTrimmed;
    }
  }

  private async handleCRMCadastroEmpresa(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    console.log("🔍 Iniciando cadastro de empresa - config:", config);

    // Mapear campos configurados
    const fieldMappings = config.fieldMappings || {};
    const empresaData: Record<string, any> = {};
    const customFields: Record<string, any> = {};

    console.log("📋 Field mappings recebidos:", fieldMappings);

    // Definir automaticamente o tipo como "Pessoa Jurídica" ANTES de processar outros campos
    customFields.tipo = "Pessoa Jurídica";
    console.log("✅ Tipo definido automaticamente como 'Pessoa Jurídica'");

    // Processar cada campo mapeado
    for (const [field, variableTemplate] of Object.entries(fieldMappings)) {
      if (variableTemplate && typeof variableTemplate === 'string') {
        // Interpolar as variáveis no template (ex: "{{cnpj}}")
        const rawValue = this.interpolate(variableTemplate);
        console.log(`  Campo ${field}: "${variableTemplate}" -> "${rawValue}"`);
        
        if (rawValue && rawValue.trim()) {
          // Formatar o valor antes de processar
          const value = this.formatarDadosEmpresa(field, rawValue);
          console.log(`  ✨ Valor formatado: "${rawValue}" -> "${value}"`);
          
          // Campos que vão direto na tabela empresas
          if (['cnpj', 'email', 'telefone', 'endereco', 'cidade', 'estado', 'cep', 'bairro', 'nome_fantasia'].includes(field)) {
            empresaData[field] = value;
          } else if (field === 'razao_social') {
            // razao_social mapeia para coluna 'nome' na tabela empresas
            empresaData['nome'] = value;
          } else {
            // Outros campos vão para custom_fields
            customFields[field] = value;
          }
        }
      }
    }

    console.log("📦 Dados da empresa (tabela):", empresaData);
    console.log("📦 Custom fields (incluindo tipo):", customFields);

    // Adicionar custom_fields se houver
    if (Object.keys(customFields).length > 0) {
      empresaData.custom_fields = customFields;
    }

    try {
      // Importar dependências
      const { supabase } = await import("@/integrations/supabase/client");
      const { getEstabelecimentoId } = await import("@/lib/estabelecimentoUtils");
      const estabId = await getEstabelecimentoId();
      
      if (!estabId) {
        console.error("❌ Estabelecimento ID não encontrado! Não é possível criar empresa.");
        await this.onResponse({
          type: "text",
          content: "Erro: Estabelecimento não identificado. Por favor, selecione um estabelecimento.",
        });
        return;
      }

      empresaData.estabelecimento_id = estabId;
      console.log("✅ Estabelecimento ID:", estabId);
      
      // Buscar configuração de campos obrigatórios
      let camposObrigatorios: string[] = [];
      const { data: fieldConfigs } = await supabase
        .from('form_field_configs')
        .select('field_id, required')
        .eq('estabelecimento_id', estabId)
        .eq('form_type', 'empresa')
        .eq('required', true);

      console.log("📋 Configuração de campos obrigatórios:", fieldConfigs);

      if (fieldConfigs && fieldConfigs.length > 0) {
        // Mapear IDs de campo para nomes da tabela
        const fieldMapping: Record<string, string> = {
          cpf_cnpj: "cnpj",
          company_name: "nome",
          razao_social: "nome",
          company_fantasia: "nome_fantasia",
          address: "endereco",
          neighborhood: "bairro",
          state: "estado",
        };

        const NORMALIZE = (s: any) => (typeof s === 'string' ? s.toLowerCase().trim() : String(s));
        
        // Lista expandida de exclusão para campo tipo
        const EXCLUDE = new Set([
          'tipo', 'type', 'company_type', 'tipo_empresa', 'tipo_pessoa',
          'company_type_field', 'tipo_cadastro', 'tipo_contato', 
          'entity_type', 'person_type'
        ]);

        console.log("🔍 DEBUG - Field IDs antes do mapeamento:", fieldConfigs.map(fc => fc.field_id));
        
        const camposMapeados = fieldConfigs.map(fc => {
          const mapeado = fieldMapping[fc.field_id] || fc.field_id;
          console.log(`  🔍 Mapeamento: ${fc.field_id} -> ${mapeado}`);
          return mapeado;
        });
        
        console.log("🔍 DEBUG - Campos após mapeamento:", camposMapeados);
        
        const camposNormalizados = camposMapeados.map(NORMALIZE);
        console.log("🔍 DEBUG - Campos após normalização:", camposNormalizados);
        
        camposObrigatorios = camposNormalizados.filter((s) => {
          const excluido = EXCLUDE.has(s);
          if (excluido) console.log(`  ⚠️ Campo '${s}' EXCLUÍDO da validação`);
          return !excluido;
        });
      }

      // Se não tem configuração, usar campos obrigatórios padrão
      if (camposObrigatorios.length === 0) {
        camposObrigatorios = ['cnpj', 'nome', 'nome_fantasia'];
      }

      console.log("✅ Campos obrigatórios identificados (normalizados):", camposObrigatorios);

      // Filtrar "tipo" dos campos obrigatórios, pois é preenchido automaticamente
      const camposParaValidar = camposObrigatorios.filter(campo => campo !== 'tipo' && campo !== 'type');
      console.log("📋 Campos a validar (sem tipo):", camposParaValidar);
      console.log("📋 Valor do campo tipo:", customFields.tipo);

      // Validar apenas campos marcados como obrigatórios na configuração
      const camposFaltando = camposParaValidar.filter(campo => {
        const isTableField = ['cnpj', 'nome', 'nome_fantasia', 'email', 'telefone', 'endereco', 'cidade', 'estado', 'cep', 'bairro'].includes(campo);
        if (isTableField) {
          const valorTabela = empresaData[campo];
          const faltando = !valorTabela || (typeof valorTabela === 'string' && valorTabela.trim() === '');
          if (faltando) console.log(`  ❌ Campo obrigatório faltando (tabela): ${campo}`);
          return faltando;
        } else {
          const valorCustom = customFields[campo];
          const faltando = !valorCustom || (typeof valorCustom === 'string' && valorCustom.trim() === '');
          if (faltando) console.log(`  ❌ Campo obrigatório faltando (custom): ${campo}, valor atual: ${valorCustom}`);
          return faltando;
        }
      });
      
      if (camposFaltando.length > 0) {
        console.error("❌ Campos obrigatórios não preenchidos:", camposFaltando.join(", "));
        await this.onResponse({
          type: "text",
          content: `Não foi possível cadastrar a empresa. Campos obrigatórios faltando: ${camposFaltando.join(", ")}`,
        });
        return;
      }

      console.log("✅ Todos os campos obrigatórios preenchidos!");
      // Buscar empresa existente pelo CNPJ
      console.log("🔍 Buscando empresa existente com CNPJ:", empresaData.cnpj);
      const { data: empresaExistente, error: searchError } = await supabase
        .from("empresas")
        .select("id")
        .eq("cnpj", empresaData.cnpj)
        .eq("estabelecimento_id", estabId)
        .maybeSingle();

      if (searchError) {
        console.error("❌ Erro ao buscar empresa:", searchError);
        await this.onResponse({
          type: "text",
          content: `Erro ao buscar empresa: ${searchError.message}`,
        });
        return;
      }

      let clienteNovo = "Não";

      if (empresaExistente) {
        // Empresa já existe
        console.log("ℹ️ Empresa já existe no banco de dados, ID:", empresaExistente.id);
        clienteNovo = "Não";
        
        if (config.updateExisting && config.validationMode !== "validate_only") {
          // Atualizar empresa existente
          console.log("🔄 Atualizando empresa existente...");
          const { error: updateError } = await supabase
            .from("empresas")
            .update({
              ...empresaData,
              updated_at: new Date().toISOString()
            })
            .eq("id", empresaExistente.id);

          if (updateError) {
            console.error("❌ Erro ao atualizar empresa:", updateError);
            await this.onResponse({
              type: "text",
              content: `Erro ao atualizar empresa: ${updateError.message}`,
            });
            return;
          }

          console.log("✅ Empresa atualizada com sucesso:", empresaData.cnpj);
          await this.onResponse({
            type: "text",
            content: `Empresa ${empresaData.nome_fantasia} atualizada com sucesso!`,
          });
        } else {
          console.log("ℹ️ Empresa já existe, não será atualizada (updateExisting=false ou validationMode=validate_only)");
          await this.onResponse({
            type: "text",
            content: `Empresa ${empresaData.nome_fantasia} já cadastrada.`,
          });
        }
      } else {
        // Empresa não existe - criar nova
        console.log("➕ Criando nova empresa...");
        clienteNovo = "Sim";
        
        if (config.validationMode !== "validate_only") {
          // Criar nova empresa
          const { data: novaEmpresa, error: insertError } = await supabase
            .from("empresas")
            .insert([empresaData as any])
            .select()
            .maybeSingle();

          if (insertError) {
            console.error("❌ Erro ao criar empresa:", insertError);
            await this.onResponse({
              type: "text",
              content: `Erro ao criar empresa: ${insertError.message}`,
            });
            return;
          }

          console.log("✅ Empresa criada com sucesso! ID:", novaEmpresa?.id, "CNPJ:", empresaData.cnpj);
          await this.onResponse({
            type: "text",
            content: `Empresa ${empresaData.nome_fantasia} cadastrada com sucesso!`,
          });
        } else {
          console.log("ℹ️ Modo de validação apenas (validate_only) - empresa não foi criada");
        }
      }

      // Definir variável de saída: "Sim" = cliente novo, "Não" = cliente existente
      const outputVariable = config.outputVariable || "cliente_novo";
      this.context.vars[outputVariable] = clienteNovo;

    } catch (error) {
      console.error("Erro ao processar cadastro de empresa:", error);
      return;
    }

    // Continuar para próximo bloco
    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }

  private async handleCRMGerarRelatorio(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    console.log("📊 Iniciando geração de relatório - config:", config);

    try {
      const relatorioId = this.interpolate(config.relatorioId || "");
      
      if (!relatorioId) {
        await this.onResponse({
          type: "text",
          content: "Erro: Nenhum relatório selecionado",
        });
        return;
      }

      // Interpolar variáveis da API preservando tipo e valor
      const apiVariables: Record<string, any> = {};
      if (config.apiVariables) {
        for (const [key, varData] of Object.entries(config.apiVariables as Record<string, any>)) {
          if (varData && typeof varData === 'object' && 'value' in varData) {
            const interpolatedValue = this.interpolate(varData.value || "");
            apiVariables[key] = {
              value: interpolatedValue,
              type: varData.type || "string"
            };
          } else {
            apiVariables[key] = {
              value: this.interpolate(String(varData || "")),
              type: "string"
            };
          }
        }
      }

      // Interpolar variáveis fixas do relatório
      const reportVariables: Record<string, any> = {};
      if (config.reportVariables && typeof config.reportVariables === 'object') {
        console.log("📝 Interpolando variáveis fixas do relatório:", config.reportVariables);
        for (const [key, value] of Object.entries(config.reportVariables as Record<string, any>)) {
          const interpolatedValue = this.interpolate(String(value || ""));
          reportVariables[key] = interpolatedValue;
          console.log(`   ✓ ${key}: "${value}" → "${interpolatedValue}"`);
        }
        console.log("✅ Variáveis fixas interpoladas:", reportVariables);
      } else {
        console.log("ℹ️ Nenhuma variável fixa do relatório configurada");
      }

      const outputType = this.interpolate(config.outputType || "pdf");

      console.log("📊 Gerando relatório com variáveis da API:", apiVariables);
      console.log("📊 Gerando relatório com variáveis fixas:", reportVariables);
      console.log("📊 Tipo de saída:", outputType);

      // Chamar edge function para gerar PDF em background
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data: resultData, error } = await supabase.functions.invoke('gerar-relatorio-pdf', {
        body: {
          relatorioId,
          apiVariables,
          reportVariables,
          outputType,
        }
      });

      if (error) {
        console.error("❌ Erro ao gerar relatório:", error);
        await this.onResponse({
          type: "text",
          content: `Erro ao gerar relatório: ${error.message}`,
        });
        return;
      }

      // Verificar se foi gerado com sucesso
      if (resultData?.pdfUrl) {
        console.log("✅ Relatório gerado com sucesso:", resultData.pdfUrl);
        
        // Enviar arquivo como anexo
        const fileType = resultData.fileType || 'pdf';
        const mediaType = fileType === 'xlsx' ? 'document' : 'document';
        
        await this.onResponse({
          type: "media",
          mediaType: mediaType,
          url: resultData.pdfUrl || resultData.fileUrl,
          caption: resultData.fileName || "Relatório gerado",
        });

        // Definir variável de saída
        const outputVariable = config.outputVariable || "relatorio_gerado";
        this.context.vars[outputVariable] = "Sucesso";
      } else {
        console.error("❌ PDF não foi gerado");
        await this.onResponse({
          type: "text",
          content: "Erro: Relatório não foi gerado corretamente",
        });
        return;
      }

    } catch (error: any) {
      console.error("❌ Erro ao processar geração de relatório:", error);
      await this.onResponse({
        type: "text",
        content: `Erro ao gerar relatório: ${error.message}`,
      });
      return;
    }

    // Continuar para próximo bloco
    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }

  private async handleCRMAgendaRapida(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    console.log("📅 Iniciando Agenda Rápida - config:", config);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { getEstabelecimentoId } = await import("@/lib/estabelecimentoUtils");
      const estabId = await getEstabelecimentoId();

      if (!estabId) {
        console.error("❌ Estabelecimento ID não encontrado!");
        await this.onResponse({
          type: "text",
          content: "Erro: Estabelecimento não identificado.",
        });
        return;
      }

      // Obter telefone do contexto (normalmente vem do chat/sessão)
      const telefone = this.context.vars.telefone || 
                       this.context.vars.phone || 
                       this.context.vars.sender ||
                       this.context.vars.from ||
                       "";
      
      console.log("📞 Telefone identificado:", telefone);

      if (!telefone) {
        console.error("❌ Telefone não encontrado no contexto");
        await this.onResponse({
          type: "text",
          content: "Não foi possível identificar o número do cliente.",
        });
        
        const outputVariable = config.outputVariable || "tarefa_criada";
        this.context.vars[outputVariable] = "";
        
        const nextNodes = this.getNextNodes(node.id);
        for (const next of nextNodes) {
          await this.executeNode(next);
        }
        return;
      }

      // Normalizar telefone para busca (remover caracteres especiais)
      const telefoneNormalizado = telefone.replace(/\D/g, "");
      const telefoneVariacoes = [
        telefoneNormalizado,
        telefoneNormalizado.slice(-11), // últimos 11 dígitos
        telefoneNormalizado.slice(-10), // últimos 10 dígitos
        telefoneNormalizado.slice(-9),  // últimos 9 dígitos
      ];

      console.log("🔍 Buscando cliente por telefone...", telefoneVariacoes);

      // Buscar cliente pelo telefone
      let customer: { id: string; nome: string; telefone: string } | null = null;
      for (const tel of telefoneVariacoes) {
        if (tel.length < 8) continue;
        
        const { data: found } = await supabase
          .from("customers")
          .select("id, nome, telefone")
          .eq("estabelecimento_id", estabId)
          .ilike("telefone", `%${tel}%`)
          .limit(1)
          .maybeSingle();
        
        if (found) {
          customer = found;
          break;
        }
      }

      let contactId = customer?.id || null;
      let contactName = customer?.nome || `Cliente ${telefone}`;

      console.log("👤 Cliente encontrado:", customer ? customer.nome : "Não encontrado (será criado genérico)");

      // Se não encontrou, tentar criar um customer básico
      if (!customer) {
        console.log("➕ Criando customer básico para o telefone...");
        const { data: novoCustomer, error: createError } = await supabase
          .from("customers")
          .insert({
            estabelecimento_id: estabId,
            nome: `Lead Bot - ${telefone}`,
            telefone: telefone,
            email: `lead_${telefoneNormalizado}@bot.temp`,
          })
          .select("id, nome")
          .maybeSingle();

        if (!createError && novoCustomer) {
          contactId = novoCustomer.id;
          contactName = novoCustomer.nome;
          console.log("✅ Customer criado:", novoCustomer.id);
        }
      }

      // Interpolar valores
      const valorAgenda = this.interpolate(config.valorAgenda || "Contato via Bot");
      const tituloTarefa = this.interpolate(config.tituloTarefa || "Retorno Bot");
      
      // Data de hoje formatada
      const hoje = new Date();
      const dataFormatada = hoje.toISOString().split('T')[0]; // YYYY-MM-DD

      console.log("📝 Criando tarefa na agenda...");
      console.log("   - Título:", tituloTarefa);
      console.log("   - Descrição:", valorAgenda);
      console.log("   - Data:", dataFormatada);
      console.log("   - Contact ID:", contactId);

      // Buscar um usuário padrão do estabelecimento para atribuir a tarefa
      let userId = estabId; // fallback para estab ID se não achar usuário
      try {
        const { data: usuarioData } = await (supabase as any)
          .from("usuarios")
          .select("id")
          .eq("estabelecimento_id", estabId)
          .eq("ativo", true)
          .limit(1)
          .maybeSingle();
        
        if (usuarioData?.id) {
          userId = usuarioData.id;
        }
      } catch (e) {
        console.log("⚠️ Não foi possível buscar usuário padrão, usando estabelecimento ID");
      }

      // Criar a tarefa na agenda
      const { data: tarefa, error: tarefaError } = await supabase
        .from("calendario_tarefas")
        .insert({
          user_id: userId,
          estabelecimento_id: estabId,
          contact_id: contactId,
          contact_name: contactName,
          title: tituloTarefa,
          description: valorAgenda,
          date: dataFormatada,
          status: "pendente",
          origem: "bot",
          origem_sub_item: "agenda_rapida",
        })
        .select("id")
        .maybeSingle();

      if (tarefaError) {
        console.error("❌ Erro ao criar tarefa:", tarefaError);
        await this.onResponse({
          type: "text",
          content: `Erro ao criar tarefa na agenda: ${tarefaError.message}`,
        });
        
        const outputVariable = config.outputVariable || "tarefa_criada";
        this.context.vars[outputVariable] = "";
      } else {
        console.log("✅ Tarefa criada com sucesso! ID:", tarefa?.id);
        
        const outputVariable = config.outputVariable || "tarefa_criada";
        this.context.vars[outputVariable] = tarefa?.id || "Sucesso";
        
        await this.onResponse({
          type: "text",
          content: `✅ Tarefa agendada para hoje: ${tituloTarefa}`,
        });
      }

    } catch (error: any) {
      console.error("❌ Erro ao processar agenda rápida:", error);
      await this.onResponse({
        type: "text",
        content: `Erro ao criar agenda: ${error.message}`,
      });
      
      const outputVariable = config.outputVariable || "tarefa_criada";
      this.context.vars[outputVariable] = "";
    }

    // Continuar para próximo bloco
    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }
}
