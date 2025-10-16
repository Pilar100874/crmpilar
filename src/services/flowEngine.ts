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
      case "pause":
        // Pause block - in production this would pause execution
        // For now, just continue to next node
        const pauseNextNodes = this.getNextNodes(node.id);
        for (const next of pauseNextNodes) {
          await this.executeNode(next);
        }
        break;
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
    
    await this.onResponse({
      type: "question",
      question,
      questionType: data.type,
      outputVariable: config.variable,
    });

    // Store user's answer in context
    if (config.variable) {
      this.context.vars[config.variable] = this.context.userMessage;
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
            if (item.id === userChoice || item.title === userChoice) {
              targetEdge = this.edges.find(
                (e) => e.source === node.id && e.sourceHandle === `section_${sectionIdx}_item_${itemIdx}`
              );
              itemFound = true;
            }
          });
        }
      });
    } else if (data.type === "keyword_options" && config.cards) {
      const cards = Array.isArray(config.cards) ? config.cards : [];
      const cardIndex = cards.findIndex((card: any) => 
        card.keyword === userChoice || card.title === userChoice
      );
      if (cardIndex >= 0) {
        targetEdge = this.edges.find(
          (e) => e.source === node.id && e.sourceHandle === `card_${cardIndex}`
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

    // Verificar status de opt-in (placeholder)
    const isSubscribed = this.context.vars[config.statusVariable || "opt_in_status"] === "subscribed";
    
    const handleId = isSubscribed ? "subscribed" : "unsubscribed";
    const edge = this.edges.find(
      (e) => e.source === node.id && e.sourceHandle === handleId
    );

    if (edge) {
      const nextNode = this.nodes.find((n) => n.id === edge.target);
      if (nextNode) {
        await this.executeNode(nextNode);
        return;
      }
    }

    // Fallback
    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }
}
