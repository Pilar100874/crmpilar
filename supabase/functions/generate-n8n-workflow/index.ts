import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate unique UUID for nodes
function generateUUID(): string {
  return crypto.randomUUID();
}

// Fix and validate workflow structure for n8n 2.1.5
function fixWorkflowStructure(workflow: any): any {
  // Ensure required fields exist
  if (!workflow.name) {
    workflow.name = "Generated Workflow";
  }
  
  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    throw new Error("Workflow must have nodes array");
  }
  
  // Fix nodes - ensure each has required fields for n8n 2.1.5
  workflow.nodes = workflow.nodes.map((node: any, index: number) => {
    // Ensure id exists
    if (!node.id) {
      node.id = generateUUID();
    }
    
    // CRITICAL: n8n 2.1.5 uses position as array [x, y] - ensure it's correct format
    if (!node.position) {
      node.position = [100 + (index * 240), 300];
    } else if (typeof node.position === 'object' && !Array.isArray(node.position)) {
      // Convert object {x, y} to array [x, y]
      node.position = [node.position.x || 100 + (index * 240), node.position.y || 300];
    }
    
    // Ensure position values are numbers
    if (Array.isArray(node.position)) {
      node.position = [
        typeof node.position[0] === 'number' ? node.position[0] : 100 + (index * 240),
        typeof node.position[1] === 'number' ? node.position[1] : 300
      ];
    }
    
    // Ensure parameters exists
    if (!node.parameters) {
      node.parameters = {};
    }
    
    // Ensure typeVersion is a number
    if (!node.typeVersion) {
      node.typeVersion = 1;
    }
    
    // Add webhookId for webhook nodes
    if (node.type === 'n8n-nodes-base.webhook' && !node.webhookId) {
      node.webhookId = generateUUID();
    }
    
    return node;
  });
  
  // Sort nodes by x position
  const sortedNodes = [...workflow.nodes].sort((a, b) => {
    const posA = Array.isArray(a.position) ? a.position[0] : (a.position?.x || 0);
    const posB = Array.isArray(b.position) ? b.position[0] : (b.position?.x || 0);
    return posA - posB;
  });
  
  // ALWAYS regenerate connections based on node order - n8n 2.1.5 format
  const connections: Record<string, any> = {};
  
  for (let i = 0; i < sortedNodes.length - 1; i++) {
    const currentNode = sortedNodes[i];
    const nextNode = sortedNodes[i + 1];
    
    if (currentNode.name && nextNode.name) {
      connections[currentNode.name] = {
        main: [[{ node: nextNode.name, type: "main", index: 0 }]]
      };
    }
  }
  
  workflow.connections = connections;
  
  // Ensure other required fields for n8n 2.1.5
  if (workflow.active === undefined) {
    workflow.active = false;
  }
  
  if (!workflow.settings) {
    workflow.settings = {
      executionOrder: "v1",
      saveManualExecutions: true,
      callerPolicy: "workflowsFromSameOwner"
    };
  }
  
  if (!workflow.pinData) {
    workflow.pinData = {};
  }
  
  // n8n 2.1.5 requires these fields
  if (!workflow.id) {
    workflow.id = generateUUID();
  }
  
  if (!workflow.versionId) {
    workflow.versionId = generateUUID();
  }
  
  // Add meta for n8n 2.x compatibility
  if (!workflow.meta) {
    workflow.meta = {
      templateCredsSetupCompleted: true,
      instanceId: generateUUID()
    };
  }
  
  // Add tags array (required for n8n 2.1.5)
  if (!workflow.tags) {
    workflow.tags = [];
  }
  
  console.log('Fixed workflow connections:', JSON.stringify(connections, null, 2));
  console.log('Nodes with positions:', workflow.nodes.map((n: any) => ({ name: n.name, position: n.position })));
  
  return workflow;
}

// Extract JSON from AI response
function extractJSON(content: string): any {
  // Remove markdown code blocks
  let jsonStr = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  
  // Find the JSON object
  const startIndex = jsonStr.indexOf('{');
  if (startIndex === -1) {
    throw new Error('No JSON found in response');
  }
  
  // Find matching closing brace
  let braceCount = 0;
  let endIndex = startIndex;
  
  for (let i = startIndex; i < jsonStr.length; i++) {
    if (jsonStr[i] === '{') braceCount++;
    if (jsonStr[i] === '}') braceCount--;
    if (braceCount === 0) {
      endIndex = i;
      break;
    }
  }
  
  jsonStr = jsonStr.substring(startIndex, endIndex + 1);
  
  // Clean up common issues
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
  jsonStr = jsonStr.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, ' '); // Remove control chars
  
  // Fix multiline strings
  jsonStr = jsonStr.replace(/"([^"]*?)[\n\r]+([^"]*?)"/g, (match) => {
    return match.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
  });
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('JSON parse error:', e);
    console.error('JSON (first 500 chars):', jsonStr.substring(0, 500));
    throw new Error('Invalid JSON in AI response');
  }
}

// Extract environment variables section
function extractEnvVars(content: string): string {
  const parts = content.split('---ENV_VARS---');
  return parts[1] || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, resourceContext } = await req.json();

    console.log('Generating n8n workflow with context:', { promptLength: prompt?.length, resourceContext: !!resourceContext });

    const systemPrompt = `Você é um especialista em n8n workflow automation. Gere workflows n8n válidos.

${resourceContext || ''}

INSTRUÇÕES:
1. Retorne APENAS o JSON do workflow (sem markdown)
2. Cada node precisa: id, name, type, typeVersion, position [x, y], parameters
3. Posicione os nodes da esquerda para direita (x crescente) na ordem de execução
4. NÃO se preocupe com connections - elas serão geradas automaticamente

TIPOS DE NODES:
- Webhook: {"type": "n8n-nodes-base.webhook", "typeVersion": 2, "parameters": {"httpMethod": "POST", "path": "meu-path"}}
- OpenAI: {"type": "@n8n/n8n-nodes-langchain.openAi", "typeVersion": 1.8, "parameters": {"modelId": {"__rl": true, "mode": "list", "value": "gpt-4o"}}, "credentials": {"openAiApi": {"id": "1", "name": "OpenAI"}}}
- HTTP Request: {"type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2, "parameters": {"url": "https://api.example.com", "method": "GET"}}
- Set: {"type": "n8n-nodes-base.set", "typeVersion": 3.4, "parameters": {"options": {}}}
- Respond to Webhook: {"type": "n8n-nodes-base.respondToWebhook", "typeVersion": 1.1, "parameters": {"respondWith": "json", "responseBody": "={{ $json }}"}}
- Code: {"type": "n8n-nodes-base.code", "typeVersion": 2, "parameters": {"jsCode": "return items;"}}

EXEMPLO MÍNIMO:
{
  "name": "Meu Workflow",
  "nodes": [
    {"id": "1", "name": "Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [100, 300], "parameters": {"httpMethod": "POST", "path": "start"}},
    {"id": "2", "name": "Processar", "type": "n8n-nodes-base.set", "typeVersion": 3.4, "position": [340, 300], "parameters": {"options": {}}},
    {"id": "3", "name": "Responder", "type": "n8n-nodes-base.respondToWebhook", "typeVersion": 1.1, "position": [580, 300], "parameters": {"respondWith": "json", "responseBody": "={{ $json }}"}}
  ],
  "connections": {},
  "active": false,
  "settings": {"executionOrder": "v1"}
}

VARIÁVEIS DE AMBIENTE: Use ={{ $env.NOME_VAR }}

Após o JSON, adicione "---ENV_VARS---" seguido de: NOME|Descrição|Exemplo`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('No content in AI response');
    }

    console.log('Raw AI response length:', rawContent.length);

    // Extract and parse JSON
    const workflow = extractJSON(rawContent);
    
    // Fix and validate the workflow structure
    const fixedWorkflow = fixWorkflowStructure(workflow);
    
    // Get env vars section
    const envVarsPart = extractEnvVars(rawContent);
    
    // Build final content
    const finalJson = JSON.stringify(fixedWorkflow, null, 2);
    const finalContent = envVarsPart 
      ? `${finalJson}\n\n---ENV_VARS---\n${envVarsPart}`
      : finalJson;

    console.log('Workflow generated and fixed successfully');
    console.log('Nodes:', fixedWorkflow.nodes?.length);
    console.log('Connections:', Object.keys(fixedWorkflow.connections || {}).length);

    return new Response(JSON.stringify({ content: finalContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in generate-n8n-workflow:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar workflow';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
