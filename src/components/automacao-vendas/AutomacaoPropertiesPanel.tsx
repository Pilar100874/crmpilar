import { useState, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Search, Check, ChevronsUpDown } from "lucide-react";
import { Node } from "@xyflow/react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  const [selectedEmpresaId, setSelectedEmpresaId] = useState((node.data as any).config?.empresaId || "");
  const [selectedUsuarioId, setSelectedUsuarioId] = useState((node.data as any).config?.usuarioId || "");
  const [openEmpresaCombobox, setOpenEmpresaCombobox] = useState(false);
  const [openUsuarioCombobox, setOpenUsuarioCombobox] = useState(false);
  const [percentualDesconto, setPercentualDesconto] = useState((node.data as any).config?.percentual || 5);

  useEffect(() => {
    setLabel((node.data as any).label || "");
    setNote((node.data as any).note || "");
    setSelectedEmpresaId((node.data as any).config?.empresaId || "");
    setSelectedUsuarioId((node.data as any).config?.usuarioId || "");
    setPercentualDesconto((node.data as any).config?.percentual || 5);
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

  const handlePercentualChange = (percentual: number) => {
    setPercentualDesconto(percentual);
    onUpdate(node.id, { 
      config: { 
        ...((node.data as any).config || {}),
        percentual 
      } 
    });
  };

  return (
    <div className="w-80 border-l border-border flex flex-col bg-card shadow-lg h-full">
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

          {/* Campos específicos para desconto_valor_compra */}
          {(node.data as any).type === "desconto_valor_compra" && (
            <div>
              <Label htmlFor="percentual">Percentual de Desconto (%)</Label>
              <Input
                id="percentual"
                type="number"
                value={percentualDesconto}
                onChange={(e) => handlePercentualChange(Number(e.target.value))}
                placeholder="Ex: 5"
                className="mt-1"
                min="0"
                max="100"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Este desconto será aplicado ao valor total do orçamento
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
