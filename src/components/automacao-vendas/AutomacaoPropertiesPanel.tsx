import { useState, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Search, Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { Node } from "@xyflow/react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { PushBlockConfigEditor } from "@/components/workflows/PushBlockConfig";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AutomacaoPropertiesPanelProps {
  node: Node;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export const AutomacaoPropertiesPanel = ({
  node,
  onUpdate,
  onDelete,
  onClose,
}: AutomacaoPropertiesPanelProps) => {
  const [label, setLabel] = useState((node.data as any).label || "");
  const [note, setNote] = useState((node.data as any).note || "");
  const [empresas, setEmpresas] = useState<Array<{ id: string; nome: string }>>([]);
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nome: string }>>([]);
  const [produtos, setProdutos] = useState<Array<{ id: string; nome: string }>>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState((node.data as any).config?.empresaId || "");
  const [selectedUsuarioId, setSelectedUsuarioId] = useState((node.data as any).config?.usuarioId || "");
  const [selectedProdutoId, setSelectedProdutoId] = useState((node.data as any).config?.produtoId || "");
  const [openEmpresaCombobox, setOpenEmpresaCombobox] = useState(false);
  const [openUsuarioCombobox, setOpenUsuarioCombobox] = useState(false);
  const [openProdutoCombobox, setOpenProdutoCombobox] = useState(false);
  const [percentualDesconto, setPercentualDesconto] = useState((node.data as any).config?.percentual || 5);
  const [faixas, setFaixas] = useState<Array<{ min: number; max: number | null; label: string }>>(
    (node.data as any).config?.faixas || []
  );
  const [condicoes, setCondicoes] = useState<Array<{ campo: string; operador: string; valor: any }>>(
    (node.data as any).config?.condicoes || []
  );
  const [logicaCondicao, setLogicaCondicao] = useState((node.data as any).config?.logica || "E");

  useEffect(() => {
    setLabel((node.data as any).label || "");
    setNote((node.data as any).note || "");
    setSelectedEmpresaId((node.data as any).config?.empresaId || "");
    setSelectedUsuarioId((node.data as any).config?.usuarioId || "");
    setSelectedProdutoId((node.data as any).config?.produtoId || "");
    setPercentualDesconto((node.data as any).config?.percentual || 5);
    setFaixas((node.data as any).config?.faixas || []);
    setCondicoes((node.data as any).config?.condicoes || []);
    setLogicaCondicao((node.data as any).config?.logica || "E");
  }, [node]);

  // Carregar empresas
  useEffect(() => {
    const loadEmpresas = async () => {
      try {
        const estabelecimentoId = await getEstabelecimentoId();
        const { data, error } = await supabase
          .from("empresas")
          .select("id, nome")
          .eq("estabelecimento_id", estabelecimentoId)
          .order("nome");
        
        if (error) throw error;
        setEmpresas(data || []);
      } catch (error) {
        console.error("Erro ao carregar empresas:", error);
      }
    };

    if ((node.data as any).type === "validar_empresa") {
      loadEmpresas();
    }
  }, [node]);

  // Carregar usuários
  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        const estabelecimentoId = await getEstabelecimentoId();
        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nome")
          .eq("estabelecimento_id", estabelecimentoId)
          .order("nome");
        
        if (error) throw error;
        setUsuarios(data || []);
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
      }
    };

    if ((node.data as any).type === "validar_usuario") {
      loadUsuarios();
    }
  }, [node]);

  // Carregar produtos
  useEffect(() => {
    const loadProdutos = async () => {
      try {
        const estabelecimentoId = await getEstabelecimentoId();
        const { data, error } = await supabase
          .from("produtos")
          .select("id, nome")
          .eq("estabelecimento_id", estabelecimentoId)
          .order("nome");
        
        if (error) throw error;
        setProdutos(data || []);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      }
    };

    if ((node.data as any).type === "validar_produto") {
      loadProdutos();
    }
  }, [node]);

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    onUpdate(node.id, { label: newLabel });
  };

  const handleNoteChange = (newNote: string) => {
    setNote(newNote);
    onUpdate(node.id, { note: newNote });
  };

  const handleEmpresaChange = (empresaId: string) => {
    setSelectedEmpresaId(empresaId);
    onUpdate(node.id, { 
      config: { 
        ...((node.data as any).config || {}),
        empresaId 
      } 
    });
  };

  const handleUsuarioChange = (usuarioId: string) => {
    setSelectedUsuarioId(usuarioId);
    onUpdate(node.id, { 
      config: { 
        ...((node.data as any).config || {}),
        usuarioId 
      } 
    });
  };

  const handleProdutoChange = (produtoId: string) => {
    setSelectedProdutoId(produtoId);
    onUpdate(node.id, { 
      config: { 
        ...((node.data as any).config || {}),
        produtoId 
      } 
    });
  };

  const handlePercentualChange = (percentual: number) => {
    setPercentualDesconto(percentual);
    onUpdate(node.id, { 
      config: { 
        ...((node.data as any).config || {}),
        percentual 
      } 
    });
  };

  const handleAddFaixa = () => {
    const novasFaixas = [...faixas, { min: 0, max: 100, label: "Nova Faixa" }];
    setFaixas(novasFaixas);
    onUpdate(node.id, {
      config: {
        ...((node.data as any).config || {}),
        faixas: novasFaixas
      }
    });
  };

  const handleRemoveFaixa = (index: number) => {
    const novasFaixas = faixas.filter((_, i) => i !== index);
    setFaixas(novasFaixas);
    onUpdate(node.id, {
      config: {
        ...((node.data as any).config || {}),
        faixas: novasFaixas
      }
    });
  };

  const handleUpdateFaixa = (index: number, field: 'min' | 'max' | 'label', value: any) => {
    const novasFaixas = faixas.map((faixa, i) => {
      if (i === index) {
        return { ...faixa, [field]: value };
      }
      return faixa;
    });
    setFaixas(novasFaixas);
    onUpdate(node.id, {
      config: {
        ...((node.data as any).config || {}),
        faixas: novasFaixas
      }
    });
  };

  const handleAddCondicao = () => {
    const novasCondicoes = [...condicoes, { campo: "valor_total", operador: ">", valor: 0 }];
    setCondicoes(novasCondicoes);
    onUpdate(node.id, {
      config: {
        ...((node.data as any).config || {}),
        condicoes: novasCondicoes
      }
    });
  };

  const handleRemoveCondicao = (index: number) => {
    const novasCondicoes = condicoes.filter((_, i) => i !== index);
    setCondicoes(novasCondicoes);
    onUpdate(node.id, {
      config: {
        ...((node.data as any).config || {}),
        condicoes: novasCondicoes
      }
    });
  };

  const handleUpdateCondicao = (index: number, field: 'campo' | 'operador' | 'valor', value: any) => {
    const novasCondicoes = condicoes.map((condicao, i) => {
      if (i === index) {
        return { ...condicao, [field]: value };
      }
      return condicao;
    });
    setCondicoes(novasCondicoes);
    onUpdate(node.id, {
      config: {
        ...((node.data as any).config || {}),
        condicoes: novasCondicoes
      }
    });
  };

  const handleLogicaCondicaoChange = (logica: string) => {
    setLogicaCondicao(logica);
    onUpdate(node.id, {
      config: {
        ...((node.data as any).config || {}),
        logica
      }
    });
  };

  return (
    <div className="workflow-props animate-slide-in-right w-80 h-[calc(100%-1rem)] m-2 rounded-2xl border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-border shadow-lg flex flex-col overflow-x-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10">
        <h3 className="font-bold text-sm text-foreground">Propriedades</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Tipo do bloco */}
          <div>
            <Label className="text-xs text-muted-foreground">Tipo de Bloco</Label>
            <div className="mt-1 font-medium text-sm">
              {((node.data as any).type || "").replace(/_/g, " ")}
            </div>
          </div>

          {/* Label */}
          <div>
            <Label htmlFor="label">Rótulo do Bloco</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Nome do bloco"
              className="mt-1"
            />
          </div>

          {/* Nota */}
          <div>
            <Label htmlFor="note">Nota (Opcional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Adicione uma nota sobre este bloco..."
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Campos específicos para validar_empresa */}
          {(node.data as any).type === "validar_empresa" && (
            <div>
              <Label>Empresa</Label>
              <Popover open={openEmpresaCombobox} onOpenChange={setOpenEmpresaCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openEmpresaCombobox}
                    className="w-full justify-between mt-1"
                  >
                    {selectedEmpresaId
                      ? empresas.find((empresa) => empresa.id === selectedEmpresaId)?.nome
                      : "Selecione uma empresa..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Pesquisar empresa..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
                      <CommandGroup>
                        {empresas.map((empresa) => (
                          <CommandItem
                            key={empresa.id}
                            value={empresa.nome}
                            onSelect={() => {
                              handleEmpresaChange(empresa.id);
                              setOpenEmpresaCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedEmpresaId === empresa.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {empresa.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Campos específicos para validar_usuario */}
          {(node.data as any).type === "validar_usuario" && (
            <div>
              <Label>Usuário</Label>
              <Popover open={openUsuarioCombobox} onOpenChange={setOpenUsuarioCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openUsuarioCombobox}
                    className="w-full justify-between mt-1"
                  >
                    {selectedUsuarioId
                      ? usuarios.find((usuario) => usuario.id === selectedUsuarioId)?.nome
                      : "Selecione um usuário..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Pesquisar usuário..." />
                    <CommandList>
                      <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                      <CommandGroup>
                        {usuarios.map((usuario) => (
                          <CommandItem
                            key={usuario.id}
                            value={usuario.nome}
                            onSelect={() => {
                              handleUsuarioChange(usuario.id);
                              setOpenUsuarioCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUsuarioId === usuario.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {usuario.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Campos específicos para validar_produto */}
          {(node.data as any).type === "validar_produto" && (
            <div>
              <Label>Produto</Label>
              <Popover open={openProdutoCombobox} onOpenChange={setOpenProdutoCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openProdutoCombobox}
                    className="w-full justify-between mt-1"
                  >
                    {selectedProdutoId
                      ? produtos.find((produto) => produto.id === selectedProdutoId)?.nome
                      : "Selecione um produto..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Pesquisar produto..." />
                    <CommandList>
                      <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                      <CommandGroup>
                        {produtos.map((produto) => (
                          <CommandItem
                            key={produto.id}
                            value={produto.nome}
                            onSelect={() => {
                              handleProdutoChange(produto.id);
                              setOpenProdutoCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProdutoId === produto.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {produto.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Campos específicos para desconto_valor_compra */}
          {(node.data as any).type === "desconto_valor_compra" && (
            <div>
              <Label htmlFor="percentual">Percentual de Desconto (%)</Label>
              <Input
                id="percentual"
                type="number"
                value={percentualDesconto}
                onChange={(e) => handlePercentualChange(Number(e.target.value))}
                placeholder="Ex: 10"
                className="mt-1"
                min="0"
                max="100"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Desconto direto:</strong> Este percentual é aplicado imediatamente no valor total do orçamento, sem validação de valor mínimo de compra.
              </p>
              <p className="text-xs text-success mt-2 bg-green-500/10 p-2 rounded border border-green-500/20">
                Ex: Orçamento de R$ 100,00 com 10% = R$ 90,00 final
              </p>
            </div>
          )}

          {/* Bloco Disparar Push */}
          {(node.data as any).type === "disparar_push" && (
            <PushBlockConfigEditor
              value={((node.data as any).config || {}) as any}
              onChange={(patch) => onUpdate(node.id, {
                config: { ...((node.data as any).config || {}), ...patch },
              })}
              context="vendas"
            />
          )}


          {/* Campos específicos para valida_faixa_faturamento */}
          {(node.data as any).type === "valida_faixa_faturamento" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Faixas de Valor</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddFaixa}
                  className="h-8"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Faixa
                </Button>
              </div>
              
              <div className="space-y-3">
                {faixas.map((faixa, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Faixa {index + 1}</span>
                      {faixas.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFaixa(index)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-xs">Rótulo da Saída</Label>
                      <Input
                        value={faixa.label}
                        onChange={(e) => handleUpdateFaixa(index, 'label', e.target.value)}
                        placeholder="Ex: Até R$ 100"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Valor Mínimo (R$)</Label>
                        <Input
                          type="number"
                          value={faixa.min}
                          onChange={(e) => handleUpdateFaixa(index, 'min', Number(e.target.value))}
                          placeholder="0"
                          className="mt-1 h-8 text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Valor Máximo (R$)</Label>
                        <Input
                          type="number"
                          value={faixa.max || ""}
                          onChange={(e) => handleUpdateFaixa(index, 'max', e.target.value ? Number(e.target.value) : null)}
                          placeholder="Sem limite"
                          className="mt-1 h-8 text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground bg-blue-500/10 p-2 rounded border border-blue-500/20">
                💡 <strong>Dica:</strong> Cada faixa criará uma saída diferente no bloco. Conecte ações específicas para cada faixa de valor do pedido.
              </p>
            </div>
          )}

          {/* Campos específicos para condicao_se */}
          {(node.data as any).type === "condicao_se" && (
            <div className="space-y-4">
              <div>
                <Label>Lógica entre Condições</Label>
                <Select value={logicaCondicao} onValueChange={handleLogicaCondicaoChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E">E (AND) - Todas devem ser verdadeiras</SelectItem>
                    <SelectItem value="OU">OU (OR) - Pelo menos uma deve ser verdadeira</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Condições</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddCondicao}
                  className="h-8"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Condição
                </Button>
              </div>
              
              <div className="space-y-3">
                {condicoes.map((condicao, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Condição {index + 1}</span>
                      {condicoes.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCondicao(index)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-xs">Campo</Label>
                      <Select 
                        value={condicao.campo} 
                        onValueChange={(value) => handleUpdateCondicao(index, 'campo', value)}
                      >
                        <SelectTrigger className="mt-1 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="valor_total">Valor Total do Pedido</SelectItem>
                          <SelectItem value="quantidade_produtos">Quantidade de Produtos</SelectItem>
                          <SelectItem value="mes_compra">Mês da Compra</SelectItem>
                          <SelectItem value="dia_semana">Dia da Semana</SelectItem>
                          <SelectItem value="cliente_aniversario">Cliente Aniversariante</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Operador</Label>
                      <Select 
                        value={condicao.operador} 
                        onValueChange={(value) => handleUpdateCondicao(index, 'operador', value)}
                      >
                        <SelectTrigger className="mt-1 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">">Maior que (&gt;)</SelectItem>
                          <SelectItem value=">=">Maior ou igual (&gt;=)</SelectItem>
                          <SelectItem value="=">Igual (=)</SelectItem>
                          <SelectItem value="<">Menor que (&lt;)</SelectItem>
                          <SelectItem value="<=">Menor ou igual (&lt;=)</SelectItem>
                          <SelectItem value="!=">Diferente (≠)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Valor</Label>
                      <Input
                        type="text"
                        value={condicao.valor}
                        onChange={(e) => handleUpdateCondicao(index, 'valor', e.target.value)}
                        placeholder="Ex: 100"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground bg-blue-500/10 p-2 rounded border border-blue-500/20">
                💡 <strong>Saídas:</strong> Este bloco terá 2 saídas - <strong className="text-green-600">Sim</strong> (condições satisfeitas) e <strong className="text-red-600">Não</strong> (condições não satisfeitas).
              </p>
            </div>
          )}

          {/* Botão deletar */}
          <div className="pt-4 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(node.id)}
              className="w-full"
            >
              Excluir Bloco
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
