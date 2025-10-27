import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, Search, User, MapPin, Building2, Hash, Globe, Database, Bold, Italic, Code, Strikethrough, Heading, Link as LinkIcon, List, ListOrdered, Quote, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Variable {
  name: string;
  description: string;
  category: string;
  blockName?: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  nodes?: any[];
  edges?: any[];
  selectedNode?: any;
  className?: string;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "User": return User;
    case "Address": return MapPin;
    case "Company": return Building2;
    case "Contact": return Hash;
    case "System": return Database;
    default: return Globe;
  }
};

// Parse markdown + variables para elementos do editor
const parseToEditor = (text: string): string => {
  if (!text) return '';
  
  let html = text;
  
  // Variáveis primeiro (antes de qualquer formatação)
  html = html.replace(/\{\{([^}]+)\}\}/g, '<span class="variable-badge" contenteditable="false" data-variable="$1">$1</span>');
  
  // Headings: # texto
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$2</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Negrito: *texto* ou **texto**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  
  // Itálico: _texto_
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Código inline: `texto`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Tachado: ~texto~
  html = html.replace(/~([^~]+)~/g, '<s>$1</s>');
  
  // Links: [texto](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  
  // Quote: > texto
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Lista não ordenada: - item
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Lista ordenada: 1. item
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  // Quebras de linha
  html = html.replace(/\n/g, '<br>');
  
  return html;
};

// Converte conteúdo do editor de volta para markdown + variables
const parseFromEditor = (element: HTMLElement): string => {
  let text = '';
  
  const processNode = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      
      if (el.classList.contains('variable-badge')) {
        text += `{{${el.dataset.variable || el.textContent}}}`;
      } else if (el.tagName === 'H1') {
        text += '# ';
        el.childNodes.forEach(processNode);
        text += '\n';
      } else if (el.tagName === 'H2') {
        text += '## ';
        el.childNodes.forEach(processNode);
        text += '\n';
      } else if (el.tagName === 'H3') {
        text += '### ';
        el.childNodes.forEach(processNode);
        text += '\n';
      } else if (el.tagName === 'STRONG' || el.tagName === 'B') {
        text += '*';
        el.childNodes.forEach(processNode);
        text += '*';
      } else if (el.tagName === 'EM' || el.tagName === 'I') {
        text += '_';
        el.childNodes.forEach(processNode);
        text += '_';
      } else if (el.tagName === 'CODE') {
        text += '`';
        el.childNodes.forEach(processNode);
        text += '`';
      } else if (el.tagName === 'S') {
        text += '~';
        el.childNodes.forEach(processNode);
        text += '~';
      } else if (el.tagName === 'A') {
        text += '[';
        el.childNodes.forEach(processNode);
        text += `](${el.getAttribute('href') || ''})`;
      } else if (el.tagName === 'BLOCKQUOTE') {
        text += '> ';
        el.childNodes.forEach(processNode);
        text += '\n';
      } else if (el.tagName === 'UL') {
        el.childNodes.forEach(processNode);
      } else if (el.tagName === 'OL') {
        let index = 1;
        el.childNodes.forEach(child => {
          if ((child as HTMLElement).tagName === 'LI') {
            text += `${index}. `;
            (child as HTMLElement).childNodes.forEach(processNode);
            text += '\n';
            index++;
          }
        });
      } else if (el.tagName === 'LI' && el.parentElement?.tagName === 'UL') {
        text += '- ';
        el.childNodes.forEach(processNode);
        text += '\n';
      } else if (el.tagName === 'BR') {
        text += '\n';
      } else if (el.tagName === 'DIV') {
        el.childNodes.forEach(processNode);
        text += '\n';
      } else {
        el.childNodes.forEach(processNode);
      }
    }
  };
  
  element.childNodes.forEach(processNode);
  
  return text.trim();
};

const getBlockOutputVariables = (node: any): Variable[] => {
  if (!node) return [];
  
  const variables: Variable[] = [];
  const blockName = node.data.config?.title || node.data.label || "Block";
  
  switch (node.data.type) {
    case "start":
      variables.push(
        { name: "user_name", description: "Nome do usuário", category: "User", blockName },
        { name: "user_phone", description: "Telefone do usuário", category: "User", blockName }
      );
      break;
    case "ask_name":
      variables.push({ name: node.data.config?.variable || "user_name", description: "Nome coletado", category: "User", blockName });
      break;
    case "ask_email":
      variables.push({ name: node.data.config?.variable || "user_email", description: "Email coletado", category: "Contact", blockName });
      break;
    case "ask_phone":
      variables.push({ name: node.data.config?.variable || "user_phone", description: "Telefone coletado", category: "Contact", blockName });
      break;
    case "ask_question":
      variables.push({ name: node.data.config?.variable || "user_input", description: "Resposta do usuário", category: "User", blockName });
      break;
    case "ask_number":
      variables.push({ name: node.data.config?.variable || "user_number", description: "Número coletado", category: "User", blockName });
      break;
    case "ask_date":
      variables.push({ name: node.data.config?.variable || "user_date", description: "Data coletada", category: "User", blockName });
      break;
    case "ask_file":
      variables.push({ name: node.data.config?.variable || "user_file", description: "Arquivo enviado", category: "User", blockName });
      break;
    case "ask_url":
      variables.push({ name: node.data.config?.variable || "user_url", description: "URL coletada", category: "User", blockName });
      break;
    case "ask_address":
      const addressVar = node.data.config?.variable || "address";
      variables.push(
        { name: `${addressVar}_cep`, description: "CEP", category: "Address", blockName },
        { name: `${addressVar}_street`, description: "Rua", category: "Address", blockName },
        { name: `${addressVar}_number`, description: "Número", category: "Address", blockName },
        { name: `${addressVar}_complement`, description: "Complemento", category: "Address", blockName },
        { name: `${addressVar}_neighborhood`, description: "Bairro", category: "Address", blockName },
        { name: `${addressVar}_city`, description: "Cidade", category: "Address", blockName },
        { name: `${addressVar}_state`, description: "Estado", category: "Address", blockName }
      );
      break;
    case "ask_cnpj":
      const cnpjVar = node.data.config?.variable || "company";
      variables.push(
        { name: `${cnpjVar}_cnpj`, description: "CNPJ", category: "Company", blockName },
        { name: `${cnpjVar}_name`, description: "Razão Social", category: "Company", blockName },
        { name: `${cnpjVar}_fantasy`, description: "Nome Fantasia", category: "Company", blockName },
        { name: `${cnpjVar}_opening_date`, description: "Data Abertura", category: "Company", blockName },
        { name: `${cnpjVar}_legal_nature`, description: "Natureza Jurídica", category: "Company", blockName },
        { name: `${cnpjVar}_address`, description: "Endereço Completo", category: "Company", blockName },
        { name: `${cnpjVar}_phone`, description: "Telefone", category: "Company", blockName },
        { name: `${cnpjVar}_email`, description: "Email", category: "Company", blockName },
        { name: `${cnpjVar}_regime_tributario`, description: "Regime Tributário", category: "Company", blockName }
      );
      break;
    case "ask_cep":
      const cepVar = node.data.config?.variable || "address";
      variables.push(
        { name: `${cepVar}_cep`, description: "CEP", category: "Address", blockName },
        { name: `${cepVar}_street`, description: "Rua", category: "Address", blockName },
        { name: `${cepVar}_neighborhood`, description: "Bairro", category: "Address", blockName },
        { name: `${cepVar}_city`, description: "Cidade", category: "Address", blockName },
        { name: `${cepVar}_state`, description: "Estado", category: "Address", blockName }
      );
      break;
    case "webhook":
      const webhookVar = node.data.config?.responseVariable || "webhook_response";
      variables.push({ name: webhookVar, description: "Resposta do Webhook", category: "System", blockName });
      break;
    case "set_field":
      const fieldVar = node.data.config?.variable || "custom_field";
      variables.push({ name: fieldVar, description: "Campo personalizado", category: "System", blockName });
      break;
  }
  
  return variables;
};

const getAncestorNodes = (nodeId: string, nodes: any[], edges: any[]): any[] => {
  const ancestors: any[] = [];
  const visited = new Set<string>();
  
  const findAncestors = (currentId: string) => {
    if (visited.has(currentId)) return;
    visited.add(currentId);
    
    const incomingEdges = edges.filter(edge => edge.target === currentId);
    
    for (const edge of incomingEdges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode && !ancestors.find(n => n.id === sourceNode.id)) {
        ancestors.push(sourceNode);
        findAncestors(sourceNode.id);
      }
    }
  };
  
  findAncestors(nodeId);
  return ancestors;
};

export const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  multiline = false,
  nodes = [],
  edges = [],
  selectedNode,
  className
}: RichTextEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  // Mantém o último range do cursor dentro do editor
  const lastRangeRef = useRef<Range | null>(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const r = sel.getRangeAt(0);
    if (editorRef.current && editorRef.current.contains(r.commonAncestorContainer)) {
      lastRangeRef.current = r.cloneRange();
    }
  };

  const restoreSelection = () => {
    if (!lastRangeRef.current) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(lastRangeRef.current);
  };

  useEffect(() => {
    const handler = () => {
      saveSelection();
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

  // Atualiza o editor quando value muda externamente
  useEffect(() => {
    if (!editorRef.current || isUpdatingRef.current) return;
    
    const currentText = parseFromEditor(editorRef.current);
    if (currentText !== value) {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      let offset = 0;
      
      if (range && editorRef.current.contains(range.startContainer)) {
        offset = range.startOffset;
      }
      
      editorRef.current.innerHTML = parseToEditor(value);
      
      // Tenta restaurar o cursor
      if (offset > 0 && editorRef.current.firstChild) {
        try {
          const textNode = editorRef.current.firstChild;
          const newRange = document.createRange();
          const sel = window.getSelection();
          newRange.setStart(textNode, Math.min(offset, textNode.textContent?.length || 0));
          newRange.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(newRange);
        } catch (e) {
          // Ignora erros de cursor
        }
      }
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current || isUpdatingRef.current) return;
    
    isUpdatingRef.current = true;
    const newValue = parseFromEditor(editorRef.current);
    onChange(newValue);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);

    const isBadge = (n: Node | null): n is HTMLElement => !!n && n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).classList?.contains('variable-badge');

    // Casos de exclusão quando o cursor está adjacente a uma variável
    if (range.collapsed) {
      const container = range.startContainer;
      const offset = range.startOffset;

      // Backspace remove variável anterior
      if (e.key === 'Backspace') {
        let prev: Node | null = null;
        if (container.nodeType === Node.TEXT_NODE) {
          if (offset === 0) {
            prev = (container.previousSibling) || container.parentNode?.previousSibling || null;
          }
        } else {
          // container é elemento
          if (offset > 0) prev = (container as Element).childNodes[offset - 1] || null;
        }
        // Ignora espaços imediatamente antes
        if (prev && prev.nodeType === Node.TEXT_NODE && ((prev as Text).textContent || '') === ' ') {
          prev = prev.previousSibling;
        }
        if (isBadge(prev)) {
          e.preventDefault();
          (prev as HTMLElement).remove();
          handleInput();
          return;
        }
      }

      // Delete remove variável seguinte
      if (e.key === 'Delete') {
        let next: Node | null = null;
        if (container.nodeType === Node.TEXT_NODE) {
          const text = container.textContent || '';
          if (offset === text.length) {
            next = container.nextSibling || container.parentNode?.nextSibling || null;
          }
        } else {
          next = (container as Element).childNodes[offset] || null;
        }
        // Ignora espaços imediatamente depois
        if (next && next.nodeType === Node.TEXT_NODE && ((next as Text).textContent || '').startsWith(' ')) {
          next = next.nextSibling;
        }
        if (isBadge(next)) {
          e.preventDefault();
          (next as HTMLElement).remove();
          handleInput();
          return;
        }
      }
    }

    // Previne digitação dentro da variável e permite exclusão quando dentro dela
    let node: Node | null = range.startContainer;
    while (node && node !== editorRef.current) {
      if (isBadge(node)) {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          const badgeEl = node as HTMLElement;
          const parent = badgeEl.parentNode;
          const after = badgeEl.nextSibling;
          badgeEl.remove();
          // Reposiciona o cursor onde a variável estava
          const newRange = document.createRange();
          const sel = window.getSelection();
          if (after) newRange.setStartBefore(after);
          else if (parent) newRange.selectNodeContents(parent);
          newRange.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(newRange);
          handleInput();
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
        }
        return;
      }
      node = node.parentNode as Node | null;
    }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const badge = target.closest('.variable-badge') as HTMLElement | null;
    if (badge) {
      const range = document.createRange();
      range.selectNode(badge);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      // Salva a seleção do badge para permitir formatação via toolbar
      saveSelection();
    }
  };

  // Get available variables from ancestor nodes
  const availableVariables: Variable[] = [];
  if (selectedNode && nodes.length > 0 && edges.length > 0) {
    const ancestorNodes = getAncestorNodes(selectedNode.id, nodes, edges);
    ancestorNodes.forEach(node => {
      const vars = getBlockOutputVariables(node);
      availableVariables.push(...vars);
    });
  }

  // Group variables by block
  const variablesByBlock = availableVariables.reduce((acc, variable) => {
    const blockName = variable.blockName || "Other";
    if (!acc[blockName]) {
      acc[blockName] = [];
    }
    acc[blockName].push(variable);
    return acc;
  }, {} as Record<string, Variable[]>);

  // Filter variables based on search
  const filteredBlocks = Object.entries(variablesByBlock).reduce((acc, [blockName, vars]) => {
    const matchingVars = vars.filter(
      v => 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blockName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (matchingVars.length > 0) {
      acc[blockName] = matchingVars;
    }
    return acc;
  }, {} as Record<string, Variable[]>);

  const insertVariable = (variableName: string) => {
    if (!editorRef.current) return;
    
    // Garante que o editor está focado
    editorRef.current.focus();
    
    // Pequeno delay para garantir que o foco foi estabelecido
    setTimeout(() => {
      if (!editorRef.current) return;

      // Restaura a última posição do cursor dentro do editor
      restoreSelection();
      
      const selection = window.getSelection();
      let range: Range | null = null;

      if (selection && selection.rangeCount) {
        const current = selection.getRangeAt(0);
        if (editorRef.current.contains(current.commonAncestorContainer)) {
          range = current;
        }
      }

      if (!range && lastRangeRef.current && editorRef.current.contains(lastRangeRef.current.commonAncestorContainer)) {
        range = lastRangeRef.current;
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }

      if (!range) {
        // Fallback: insere ao final
        range = document.createRange();
        if (editorRef.current.lastChild) {
          range.setStartAfter(editorRef.current.lastChild);
        } else {
          range.selectNodeContents(editorRef.current);
        }
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      
      // Remove qualquer conteúdo selecionado
      range.deleteContents();
      
      // Cria o badge da variável
      const varBadge = document.createElement('span');
      varBadge.className = 'variable-badge';
      varBadge.contentEditable = 'false';
      varBadge.dataset.variable = variableName;
      varBadge.textContent = variableName;
      
      // Insere a variável
      range.insertNode(varBadge);
      
      // Cria um espaço após a variável para continuar digitando
      const space = document.createTextNode(' ');
      if (varBadge.nextSibling) {
        varBadge.parentNode?.insertBefore(space, varBadge.nextSibling);
      } else {
        varBadge.parentNode?.appendChild(space);
      }
      
      // Posiciona o cursor após o espaço e salva seleção
      range.setStartAfter(space);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      lastRangeRef.current = range.cloneRange();
      
      handleInput();
    }, 10);
    
    setIsOpen(false);
    setSearchQuery("");
  };

  const applyFormatting = (tag: string, extraProps?: Record<string, string>) => {
    if (!editorRef.current) return;

    // Restaura a última seleção válida dentro do editor
    restoreSelection();

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    let range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer) && lastRangeRef.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(lastRangeRef.current);
      range = lastRangeRef.current;
    }
    
    // Se não há seleção, não faz nada (exceto para listas e blockquote que podem criar novo bloco)
    if (range.collapsed && !['ul', 'ol', 'blockquote'].includes(tag.toLowerCase())) return;
    
    try {
      // Verifica se já existe formatação do mesmo tipo
      let node: Node | null = range.commonAncestorContainer;
      let existingFormat: HTMLElement | null = null;
      
      // Procura por formatação existente
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.tagName.toLowerCase() === tag.toLowerCase()) {
            existingFormat = el;
            break;
          }
        }
        node = node.parentNode;
      }
      
      if (existingFormat) {
        // Remove a formatação existente
        const parent = existingFormat.parentNode;
        while (existingFormat.firstChild) {
          parent?.insertBefore(existingFormat.firstChild, existingFormat);
        }
        parent?.removeChild(existingFormat);
        // Atualiza a seleção após remover a formatação
        saveSelection();
      } else {
        // Aplica nova formatação
        const element = document.createElement(tag);
        if (extraProps) {
          Object.entries(extraProps).forEach(([key, value]) => {
            element.setAttribute(key, value);
          });
        }
        
        // Para listas, cria também o LI
        if (tag === 'ul' || tag === 'ol') {
          const li = document.createElement('li');
          const fragment = range.extractContents();
          li.appendChild(fragment);
          element.appendChild(li);
        } else {
          const fragment = range.extractContents();
          element.appendChild(fragment);
        }
        
        range.insertNode(element);
        
        // Seleciona o conteúdo formatado
        const newRange = document.createRange();
        newRange.selectNodeContents(element);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
        // Salva a nova seleção para futuras inserções
        lastRangeRef.current = newRange.cloneRange();
      }
      
      handleInput();
    } catch (e) {
      console.error('Formatting error:', e);
    }
    
    editorRef.current.focus();
  };

  const insertLink = () => {
    const url = prompt('Digite a URL:');
    if (!url) return;
    
    // Restaura a seleção para inserir o link no local correto
    restoreSelection();
    
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString() || 'link';
    
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = selectedText;
    
    range.deleteContents();
    range.insertNode(link);

    // posiciona cursor após o link e salva seleção
    const newRange = document.createRange();
    newRange.setStartAfter(link);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    lastRangeRef.current = newRange.cloneRange();
    
    handleInput();
    editorRef.current?.focus();
  };

  const insertEmoji = (emoji: string) => {
    if (!editorRef.current) return;

    // Restaura a seleção para inserir o emoji no local correto
    restoreSelection();
    
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const textNode = document.createTextNode(emoji);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);

    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    lastRangeRef.current = range.cloneRange();
    
    handleInput();
    editorRef.current.focus();
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onClick={handleEditorClick}
          className={cn(
            "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary transition-colors",
            multiline ? "min-h-[100px]" : "min-h-[36px]",
            !value && "empty-editor",
            className
          )}
          data-placeholder={placeholder}
          style={{
            whiteSpace: multiline ? 'pre-wrap' : 'pre-wrap',
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}
        />
        <style>{`
          .empty-editor:empty:before {
            content: attr(data-placeholder);
            color: hsl(var(--muted-foreground));
            pointer-events: none;
          }
          .variable-badge {
            display: inline-flex;
            align-items: center;
            background: hsl(var(--primary) / 0.12);
            color: hsl(var(--primary));
            padding: 0.15rem 0.45rem;
            border-radius: 4px;
            font-size: 0.8125rem;
            font-weight: 500;
            margin: 0 2px;
            cursor: pointer;
            user-select: none;
            vertical-align: middle;
            transition: background 0.15s ease;
          }
          .variable-badge:hover {
            background: hsl(var(--primary) / 0.18);
          }
          [contenteditable] strong {
            font-weight: 600;
          }
          [contenteditable] em {
            font-style: italic;
          }
          [contenteditable] code {
            background: hsl(var(--muted));
            padding: 0.15rem 0.3rem;
            border-radius: 3px;
            font-size: 0.85em;
            font-family: 'Monaco', 'Menlo', monospace;
          }
          [contenteditable] s {
            text-decoration: line-through;
            opacity: 0.75;
          }
          [contenteditable] h1 {
            font-size: 1.5em;
            font-weight: 700;
            margin: 0.5em 0;
          }
          [contenteditable] h2 {
            font-size: 1.25em;
            font-weight: 600;
            margin: 0.5em 0;
          }
          [contenteditable] h3 {
            font-size: 1.1em;
            font-weight: 600;
            margin: 0.5em 0;
          }
          [contenteditable] ul, [contenteditable] ol {
            margin: 0.5em 0;
            padding-left: 1.5em;
          }
          [contenteditable] li {
            margin: 0.25em 0;
          }
          [contenteditable] blockquote {
            border-left: 3px solid hsl(var(--primary));
            padding-left: 1em;
            margin: 0.5em 0;
            color: hsl(var(--muted-foreground));
            font-style: italic;
          }
          [contenteditable] a {
            color: hsl(var(--primary));
            text-decoration: underline;
          }
        `}</style>
      </div>
      
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('strong')}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Negrito"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('em')}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Itálico"
        >
          <Italic className="w-4 h-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent"
              title="Emoji"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <div className="grid grid-cols-8 gap-1 p-2">
              {['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="h-8 w-8 hover:bg-accent rounded text-lg flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('code')}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Código"
        >
          <Code className="w-4 h-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent"
              title="Título"
            >
              <Heading className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => applyFormatting('h1')}>
              <span className="font-bold text-lg">Título 1</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyFormatting('h2')}>
              <span className="font-bold text-base">Título 2</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyFormatting('h3')}>
              <span className="font-bold text-sm">Título 3</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('ul')}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Lista não ordenada"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('ol')}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Lista ordenada"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertLink}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Inserir link"
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('blockquote')}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Citação"
        >
          <Quote className="w-4 h-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={() => saveSelection()}
              className="h-8 text-xs px-2 hover:bg-accent"
            >
              usar variavel
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome do bloco ou variável..."
                  className="pl-9"
                />
              </div>
            </div>
            
            <ScrollArea className="h-[400px]">
              {Object.keys(filteredBlocks).length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {availableVariables.length === 0 
                    ? "Nenhuma variável disponível. Adicione blocos antes deste para coletar dados."
                    : "Nenhuma variável encontrada."}
                </div>
              ) : (
                <div className="p-2 space-y-4">
                  {Object.entries(filteredBlocks).map(([blockName, vars]) => (
                    <div key={blockName} className="space-y-2">
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {blockName}
                      </div>
                      <div className="space-y-1">
                        {vars.map((variable) => {
                          const Icon = getCategoryIcon(variable.category);
                          return (
                            <button
                              key={variable.name}
                              type="button"
                              onClick={() => insertVariable(variable.name)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left group"
                            >
                              <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Icon className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                  {variable.name}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {variable.description}
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {variable.category}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
