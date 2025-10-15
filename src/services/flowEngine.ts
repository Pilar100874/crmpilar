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
      case "message":
        await this.handleMessage(node);
        break;
      case "question":
        await this.handleQuestion(node);
        break;
      case "condition":
        await this.handleCondition(node);
        break;
      case "api":
        await this.handleAPI(node);
        break;
      case "script":
        await this.handleScript(node);
        break;
      case "variables":
        await this.handleVariable(node);
        break;
      case "delay":
        await this.handleDelay(node);
        break;
      case "n8n":
        await this.handleN8n(node);
        break;
      case "handoff":
        await this.handleHandoff(node);
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

    const content = this.interpolate(config.content || "");
    
    await this.onResponse({
      type: "message",
      content,
      buttons: config.buttons,
      messageType: config.type || "text",
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
      questionType: config.questionType,
      outputVariable: config.outputVariable,
    });

    // Store user's answer in context
    if (config.outputVariable) {
      this.context.vars[config.outputVariable] = this.context.userMessage;
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
      if (this.evaluateCondition(condition.expression)) {
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
    const defaultEdge = this.edges.find(
      (e) => e.source === node.id && !e.sourceHandle
    );
    if (defaultEdge) {
      const nextNode = this.nodes.find((n) => n.id === defaultEdge.target);
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

  private async handleScript(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    try {
      const script = config.script || "";
      const func = new Function("context", script);
      const result = func(this.context.vars);

      if (config.outputVariable) {
        this.context.vars[config.outputVariable] = result;
      }

      const nextNodes = this.getNextNodes(node.id);
      for (const next of nextNodes) {
        await this.executeNode(next);
      }
    } catch (error) {
      console.error("Script execution failed:", error);
      throw error;
    }
  }

  private async handleVariable(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    if (config.operation === "set") {
      try {
        const vars = JSON.parse(this.interpolate(config.variables || "{}"));
        Object.assign(this.context.vars, vars);
      } catch (error) {
        console.error("Failed to set variables:", error);
      }
    } else if (config.operation === "unset") {
      const keys = config.keys?.split(",").map((k: string) => k.trim()) || [];
      keys.forEach((key: string) => delete this.context.vars[key]);
    }

    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }

  private async handleDelay(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    const duration = parseInt(config.duration || "1000");
    await new Promise((resolve) => setTimeout(resolve, duration));

    const nextNodes = this.getNextNodes(node.id);
    for (const next of nextNodes) {
      await this.executeNode(next);
    }
  }

  private async handleN8n(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    try {
      const webhookUrl = this.interpolate(config.webhookUrl || "");
      const inputData = config.inputData ? JSON.parse(this.interpolate(config.inputData)) : {};

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputData),
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
      console.error("N8n call failed:", error);
      throw error;
    }
  }

  private async handleHandoff(node: Node): Promise<void> {
    const data = node.data as FlowNodeData;
    const config = data.config as any;

    await this.onResponse({
      type: "handoff",
      department: config.department,
      note: this.interpolate(config.note || ""),
    });
  }
}
