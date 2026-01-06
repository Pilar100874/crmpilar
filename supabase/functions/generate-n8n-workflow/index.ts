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
  console.log('Input workflow:', JSON.stringify(workflow, null, 2));
  
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
    
    // Ensure name exists
    if (!node.name) {
      node.name = `Node_${index}`;
    }
    
    // CRITICAL: n8n 2.1.5 uses position as array [x, y]
    if (!node.position) {
      node.position = [100 + (index * 250), 300];
    } else if (typeof node.position === 'object' && !Array.isArray(node.position)) {
      node.position = [node.position.x || 100 + (index * 250), node.position.y || 300];
    }
    
    // Ensure position values are numbers
    if (Array.isArray(node.position)) {
      node.position = [
        typeof node.position[0] === 'number' ? node.position[0] : 100 + (index * 250),
        typeof node.position[1] === 'number' ? node.position[1] : 300
      ];
    }
    
    // Ensure parameters exists
    if (!node.parameters) {
      node.parameters = {};
    }
    
    // Ensure typeVersion is a number
    if (typeof node.typeVersion !== 'number') {
      node.typeVersion = Number(node.typeVersion) || 1;
    }
    
    // Add webhookId for webhook nodes
    if (node.type === 'n8n-nodes-base.webhook' && !node.webhookId) {
      node.webhookId = generateUUID();
    }
    
    return node;
  });
  
  // Sort nodes by x position for connection generation
  const sortedNodes = [...workflow.nodes].sort((a, b) => {
    const posA = Array.isArray(a.position) ? a.position[0] : 0;
    const posB = Array.isArray(b.position) ? b.position[0] : 0;
    return posA - posB;
  });
  
  console.log('Sorted nodes for connections:', sortedNodes.map(n => n.name));
  
  // ALWAYS regenerate connections based on node order - CORRECT n8n 2.1.5 format
  const connections: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }> = {};
  
  for (let i = 0; i < sortedNodes.length - 1; i++) {
    const currentNode = sortedNodes[i];
    const nextNode = sortedNodes[i + 1];
    
    if (currentNode.name && nextNode.name) {
      connections[currentNode.name] = {
        main: [
          [
            { 
              node: nextNode.name, 
              type: "main", 
              index: 0 
            }
          ]
        ]
      };
    }
  }
  
  workflow.connections = connections;
  
  console.log('Generated connections:', JSON.stringify(connections, null, 2));
  
  // Required fields for n8n 2.1.5
  workflow.active = false;
  
  workflow.settings = {
    executionOrder: "v1",
    saveManualExecutions: true,
    callerPolicy: "workflowsFromSameOwner"
  };
  
  workflow.pinData = {};
  workflow.id = generateUUID();
  workflow.versionId = generateUUID();
  workflow.tags = [];
  
  workflow.meta = {
    templateCredsSetupCompleted: true,
    instanceId: generateUUID()
  };
  
  return workflow;
}

// Extract JSON from AI response
function extractJSON(content: string): any {
  console.log('Extracting JSON from content length:', content.length);
  
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
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('JSON parse error:', e);
    console.error('JSON (first 1000 chars):', jsonStr.substring(0, 1000));
    throw new Error('Invalid JSON in AI response');
  }
}

// Extract environment variables section
function extractEnvVars(content: string): string {
  const parts = content.split('---ENV_VARS---');
  return parts[1]?.trim() || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, resourceContext } = await req.json();

    console.log('=== Generating n8n workflow ===');
    console.log('Prompt length:', prompt?.length);
    console.log('Has resourceContext:', !!resourceContext);

    // Build variable instructions from context
    let variableInstructions = '';
    if (resourceContext) {
      // Parse variable mentions from the context
      const variableMatches = resourceContext.match(/- ([^(]+) \(ID: ([^,]+),/g);
      if (variableMatches) {
        variableInstructions = `
VARIÁVEIS DO RECURSO (use assim no n8n):
${variableMatches.map((m: string) => {
  const match = m.match(/- ([^(]+) \(ID: ([^,]+),/);
  if (match) {
    const label = match[1].trim();
    const id = match[2].trim();
    return `- ${label}: Use ={{ $json["${id}"] }} ou ={{ $json.${id} }}`;
  }
  return '';
}).filter(Boolean).join('\n')}

IMPORTANTE: Para acessar dados do webhook ou nó anterior, use:
- ={{ $json.campo }} para acessar um campo do JSON de entrada
- ={{ $input.item.json.campo }} para ser mais explícito
- ={{ $node["Nome do Nó"].json.campo }} para pegar de um nó específico`;
      }
    }

    const systemPrompt = `Você é um especialista em n8n 2.1.5. Gere workflows VÁLIDOS e FUNCIONAIS.

${resourceContext || ''}
${variableInstructions}

REGRAS ABSOLUTAS:
1. Retorne APENAS o JSON do workflow, sem explicações
2. Cada node DEVE ter: id, name, type, typeVersion (número), position (array [x,y]), parameters
3. Position DEVE ser array [x, y] - NÃO objeto {x,y}
4. Posicione nodes da esquerda para direita (x crescente): 100, 350, 600, 850...
5. NÃO inclua "connections" - será gerado automaticamente pelo sistema
6. typeVersion DEVE ser número (não string)

TIPOS DE NODES VÁLIDOS (n8n 2.1.5):

Webhook (receber dados):
{
  "id": "uuid",
  "name": "Webhook",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "position": [100, 300],
  "webhookId": "uuid",
  "parameters": {
    "httpMethod": "POST",
    "path": "meu-endpoint",
    "responseMode": "responseNode"
  }
}

OpenAI (gerar texto):
{
  "id": "uuid",
  "name": "OpenAI",
  "type": "@n8n/n8n-nodes-langchain.openAi",
  "typeVersion": 1,
  "position": [350, 300],
  "parameters": {
    "resource": "chat",
    "operation": "message",
    "prompt": {
      "messages": [
        {
          "role": "system",
          "content": "Você é um assistente útil"
        },
        {
          "role": "user", 
          "content": "={{ $json.mensagem }}"
        }
      ]
    },
    "options": {
      "model": "gpt-4o"
    }
  },
  "credentials": {
    "openAiApi": {
      "id": "1",
      "name": "OpenAI account"
    }
  }
}

Set (manipular dados):
{
  "id": "uuid",
  "name": "Set",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3,
  "position": [600, 300],
  "parameters": {
    "mode": "manual",
    "duplicateItem": false,
    "assignments": {
      "assignments": [
        {
          "id": "uuid",
          "name": "resultado",
          "value": "={{ $json.text }}",
          "type": "string"
        }
      ]
    }
  }
}

Respond to Webhook:
{
  "id": "uuid",
  "name": "Respond",
  "type": "n8n-nodes-base.respondToWebhook",
  "typeVersion": 1,
  "position": [850, 300],
  "parameters": {
    "respondWith": "json",
    "responseBody": "={{ $json }}"
  }
}

HTTP Request:
{
  "id": "uuid", 
  "name": "HTTP Request",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4,
  "position": [350, 300],
  "parameters": {
    "url": "https://api.example.com/endpoint",
    "method": "POST",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {"name": "campo", "value": "={{ $json.valor }}"}
      ]
    }
  }
}

Code (JavaScript):
{
  "id": "uuid",
  "name": "Code",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [350, 300],
  "parameters": {
    "jsCode": "const items = $input.all();\\nreturn items.map(item => ({json: {resultado: item.json.campo}}));"
  }
}

VARIÁVEIS DE AMBIENTE: Use $env.NOME_VARIAVEL (ex: ={{ $env.API_KEY }})

ESTRUTURA DO WORKFLOW:
{
  "name": "Nome do Workflow",
  "nodes": [...],
  "connections": {},
  "active": false,
  "settings": {"executionOrder": "v1"}
}

APÓS o JSON, adicione:
---ENV_VARS---
NOME_VAR|Descrição da variável|exemplo_valor`;

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
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('No content in AI response');
    }

    console.log('Raw AI response (first 500 chars):', rawContent.substring(0, 500));

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

    console.log('=== Workflow generated successfully ===');
    console.log('Nodes count:', fixedWorkflow.nodes?.length);
    console.log('Connections count:', Object.keys(fixedWorkflow.connections || {}).length);
    console.log('Connection keys:', Object.keys(fixedWorkflow.connections || {}));

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
