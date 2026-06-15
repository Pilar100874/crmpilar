import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, AlertTriangle, Upload, Loader2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs?: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement | null }>;
  openVariablePicker?: (ref: HTMLInputElement | HTMLTextAreaElement) => void;
}

const EvolutionWarning = () => (
  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2 text-xs">
    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
    <div>
      <p className="font-semibold text-amber-900 dark:text-amber-200">Exclusivo Evolution API</p>
      <p className="text-amber-800 dark:text-amber-300">Este bloco não funciona com a Cloud API oficial do WhatsApp (Meta).</p>
    </div>
  </div>
);

const TemplateToggle = ({ config, handleConfigChange }: ConfigProps) => (
  <div className="rounded-lg border p-3 space-y-2">
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <Label className="text-sm">É um template aprovado pela Meta?</Label>
        <p className="text-xs text-muted-foreground">
          Necessário para enviar este botão pela Cloud API oficial. Na Evolution funciona em qualquer caso.
        </p>
      </div>
      <Switch
        checked={config.isApprovedTemplate === true}
        onCheckedChange={(v) => handleConfigChange("isApprovedTemplate", v)}
      />
    </div>
    {config.isApprovedTemplate === true ? (
      <div className="space-y-2 pt-1">
        <Label className="text-xs">Nome do template aprovado *</Label>
        <Input
          value={config.templateName || ""}
          onChange={(e) => handleConfigChange("templateName", e.target.value)}
          placeholder="nome_do_template_meta"
        />
        <Label className="text-xs">Idioma (locale)</Label>
        <Input
          value={config.templateLanguage || "pt_BR"}
          onChange={(e) => handleConfigChange("templateLanguage", e.target.value)}
          placeholder="pt_BR"
        />
      </div>
    ) : (
      <div className="flex gap-2 text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <span className="text-amber-800 dark:text-amber-300">
          Sem template aprovado, este bloco só funciona em números Evolution API.
        </span>
      </div>
    )}
  </div>
);

const TextBaseFields = ({ config, handleConfigChange }: ConfigProps) => (
  <>
    <div className="space-y-2">
      <Label>Título</Label>
      <Input
        value={config.title || ""}
        onChange={(e) => handleConfigChange("title", e.target.value)}
        placeholder="Título da mensagem"
        maxLength={60}
      />
    </div>
    <div className="space-y-2">
      <Label>Descrição / Corpo</Label>
      <Textarea
        value={config.description || ""}
        onChange={(e) => handleConfigChange("description", e.target.value)}
        placeholder="Texto que aparece acima do botão"
        rows={3}
        maxLength={1024}
      />
    </div>
    <div className="space-y-2">
      <Label>Rodapé (opcional)</Label>
      <Input
        value={config.footer || ""}
        onChange={(e) => handleConfigChange("footer", e.target.value)}
        placeholder="Texto pequeno no rodapé"
        maxLength={60}
      />
    </div>
  </>
);

// ============= Botão URL =============
export const ButtonUrlConfig = (props: ConfigProps) => {
  const { config, handleConfigChange } = props;
  return (
    <div className="space-y-4">
      <TemplateToggle {...props} />
      <TextBaseFields {...props} />
      <div className="space-y-2">
        <Label>Texto do botão</Label>
        <Input
          value={config.displayText || ""}
          onChange={(e) => handleConfigChange("displayText", e.target.value)}
          placeholder="Visitar Site"
          maxLength={20}
        />
      </div>
      <div className="space-y-2">
        <Label>URL de destino *</Label>
        <Input
          type="url"
          value={config.url || ""}
          onChange={(e) => handleConfigChange("url", e.target.value)}
          placeholder="https://exemplo.com.br"
        />
      </div>
    </div>
  );
};

// ============= Botão Copy =============
export const ButtonCopyConfig = (props: ConfigProps) => {
  const { config, handleConfigChange } = props;
  return (
    <div className="space-y-4">
      <TemplateToggle {...props} />
      <TextBaseFields {...props} />
      <div className="space-y-2">
        <Label>Texto do botão</Label>
        <Input
          value={config.displayText || ""}
          onChange={(e) => handleConfigChange("displayText", e.target.value)}
          placeholder="Copiar Cupom"
          maxLength={20}
        />
      </div>
      <div className="space-y-2">
        <Label>Código a copiar *</Label>
        <Input
          value={config.copyCode || ""}
          onChange={(e) => handleConfigChange("copyCode", e.target.value)}
          placeholder="DESCONTO30"
        />
        <p className="text-xs text-muted-foreground">O usuário toca no botão e o código vai para o clipboard.</p>
      </div>
    </div>
  );
};

// ============= Botão Call =============
export const ButtonCallConfig = (props: ConfigProps) => {
  const { config, handleConfigChange } = props;
  return (
    <div className="space-y-4">
      <TemplateToggle {...props} />
      <TextBaseFields {...props} />
      <div className="space-y-2">
        <Label>Texto do botão</Label>
        <Input
          value={config.displayText || ""}
          onChange={(e) => handleConfigChange("displayText", e.target.value)}
          placeholder="Ligar Agora"
          maxLength={20}
        />
      </div>
      <div className="space-y-2">
        <Label>Número de telefone *</Label>
        <Input
          value={config.phoneNumber || ""}
          onChange={(e) => handleConfigChange("phoneNumber", e.target.value)}
          placeholder="+5583987481757"
        />
        <p className="text-xs text-muted-foreground">Formato internacional com DDI (+55 para Brasil).</p>
      </div>
    </div>
  );
};

// ============= Botão Pix =============
export const ButtonPixConfig = (props: ConfigProps) => {
  const { config, handleConfigChange } = props;
  return (
    <div className="space-y-4">
      <EvolutionWarning />
      <TextBaseFields {...props} />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Moeda</Label>
          <Select
            value={config.currency || "BRL"}
            onValueChange={(v) => handleConfigChange("currency", v)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BRL">BRL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tipo de chave *</Label>
          <Select
            value={config.keyType || "email"}
            onValueChange={(v) => handleConfigChange("keyType", v)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cpf">CPF</SelectItem>
              <SelectItem value="cnpj">CNPJ</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Telefone</SelectItem>
              <SelectItem value="random">Aleatória</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Nome do recebedor *</Label>
        <Input
          value={config.name || ""}
          onChange={(e) => handleConfigChange("name", e.target.value)}
          placeholder="Nome completo"
        />
      </div>
      <div className="space-y-2">
        <Label>Chave Pix *</Label>
        <Input
          value={config.pixKey || ""}
          onChange={(e) => handleConfigChange("pixKey", e.target.value)}
          placeholder="contato@exemplo.com.br"
        />
      </div>
    </div>
  );
};

// ============= Botões Mistos =============
const MIXED_TYPES = [
  { value: "reply", label: "Resposta rápida" },
  { value: "url", label: "Abrir URL" },
  { value: "copy", label: "Copiar código" },
  { value: "call", label: "Ligação" },
];

export const ButtonsMixedConfig = (props: ConfigProps) => {
  const { config, handleConfigChange } = props;
  const buttons = config.buttons || [];

  const addButton = () => {
    if (buttons.length >= 3) return;
    handleConfigChange("buttons", [
      ...buttons,
      { id: `btn_${Date.now()}`, type: "reply", displayText: "" },
    ]);
  };
  const updateButton = (i: number, patch: any) => {
    const next = [...buttons];
    next[i] = { ...next[i], ...patch };
    handleConfigChange("buttons", next);
  };
  const removeButton = (i: number) => {
    handleConfigChange("buttons", buttons.filter((_: any, idx: number) => idx !== i));
  };

  return (
    <div className="space-y-4">
      <EvolutionWarning />
      <TextBaseFields {...props} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Botões (até 3)</Label>
          <Button variant="outline" size="sm" onClick={addButton} disabled={buttons.length >= 3}>
            <Plus className="w-4 h-4 mr-1" /> Botão
          </Button>
        </div>
        {buttons.map((btn: any, i: number) => (
          <Card key={btn.id || i} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Botão {i + 1}</span>
              <Button variant="ghost" size="icon" onClick={() => removeButton(i)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
            <Select value={btn.type || "reply"} onValueChange={(v) => updateButton(i, { type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MIXED_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={btn.displayText || ""}
              onChange={(e) => updateButton(i, { displayText: e.target.value })}
              placeholder="Texto do botão"
              maxLength={20}
            />
            {btn.type === "url" && (
              <Input
                value={btn.url || ""}
                onChange={(e) => updateButton(i, { url: e.target.value })}
                placeholder="https://..."
              />
            )}
            {btn.type === "copy" && (
              <Input
                value={btn.copyCode || ""}
                onChange={(e) => updateButton(i, { copyCode: e.target.value })}
                placeholder="Código a copiar"
              />
            )}
            {btn.type === "call" && (
              <Input
                value={btn.phoneNumber || ""}
                onChange={(e) => updateButton(i, { phoneNumber: e.target.value })}
                placeholder="+5583987481757"
              />
            )}
            {btn.type === "reply" && (
              <Input
                value={btn.id || ""}
                onChange={(e) => updateButton(i, { id: e.target.value })}
                placeholder="ID interno (ex: btn_ok)"
              />
            )}
          </Card>
        ))}
        {buttons.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4 border-2 border-dashed rounded">
            Adicione até 3 botões de tipos diferentes.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Salvar resposta (apenas reply) em</Label>
        <Input
          value={config.variable || ""}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="resposta_botao"
        />
      </div>
    </div>
  );
};

// ============= Botões com Mídia =============
export const ButtonsMediaConfig = (props: ConfigProps) => {
  const { config, handleConfigChange } = props;
  const buttons = config.buttons || [];

  const addButton = () => {
    if (buttons.length >= 3) return;
    handleConfigChange("buttons", [
      ...buttons,
      { id: `btn_${Date.now()}`, displayText: "Botão" },
    ]);
  };
  const updateButton = (i: number, patch: any) => {
    const next = [...buttons];
    next[i] = { ...next[i], ...patch };
    handleConfigChange("buttons", next);
  };
  const removeButton = (i: number) => {
    handleConfigChange("buttons", buttons.filter((_: any, idx: number) => idx !== i));
  };

  return (
    <div className="space-y-4">
      <EvolutionWarning />
      <TextBaseFields {...props} />

      <div className="grid grid-cols-3 gap-2 items-end">
        <div className="col-span-2 space-y-2">
          <Label>URL da mídia *</Label>
          <Input
            value={config.thumbnailUrl || ""}
            onChange={(e) => handleConfigChange("thumbnailUrl", e.target.value)}
            placeholder="https://...imagem.jpg ou video.mp4"
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={config.mediaType || "image"}
            onValueChange={(v) => handleConfigChange("mediaType", v)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Imagem</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Botões reply (até 3)</Label>
          <Button variant="outline" size="sm" onClick={addButton} disabled={buttons.length >= 3}>
            <Plus className="w-4 h-4 mr-1" /> Botão
          </Button>
        </div>
        {buttons.map((btn: any, i: number) => (
          <div key={btn.id || i} className="flex gap-2">
            <Input
              className="flex-1"
              value={btn.displayText || ""}
              onChange={(e) => updateButton(i, { displayText: e.target.value })}
              placeholder={`Botão ${i + 1}`}
              maxLength={20}
            />
            <Button variant="ghost" size="icon" onClick={() => removeButton(i)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label>Salvar resposta em</Label>
        <Input
          value={config.variable || ""}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="resposta_botao"
        />
      </div>
    </div>
  );
};

// ============= Carrossel =============
export const CarouselConfig = (props: ConfigProps) => {
  const { config, handleConfigChange } = props;
  const mode = config.mode || "manual";
  const cards = config.cards || [];

  const addCard = () => {
    if (cards.length >= 10) return;
    handleConfigChange("cards", [
      ...cards,
      { id: `card_${Date.now()}`, header: "", body: "", footer: "", buttonText: "Selecionar" },
    ]);
  };
  const updateCard = (i: number, patch: any) => {
    const next = [...cards];
    next[i] = { ...next[i], ...patch };
    handleConfigChange("cards", next);
  };
  const removeCard = (i: number) => {
    handleConfigChange("cards", cards.filter((_: any, idx: number) => idx !== i));
  };

  return (
    <div className="space-y-4">
      <EvolutionWarning />
      <TextBaseFields {...props} />

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label className="text-sm">Origem dos cards</Label>
          <p className="text-xs text-muted-foreground">
            {mode === "dynamic" ? "Gerados a partir de produtos do catálogo" : "Cards criados manualmente"}
          </p>
        </div>
        <Switch
          checked={mode === "dynamic"}
          onCheckedChange={(v) => handleConfigChange("mode", v ? "dynamic" : "manual")}
        />
      </div>

      {mode === "dynamic" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Grupo de produtos (opcional)</Label>
            <Input
              value={config.dynamicGrupoId || ""}
              onChange={(e) => handleConfigChange("dynamicGrupoId", e.target.value)}
              placeholder="ID do grupo (deixe vazio para todos)"
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria (opcional)</Label>
            <Input
              value={config.dynamicCategoriaId || ""}
              onChange={(e) => handleConfigChange("dynamicCategoriaId", e.target.value)}
              placeholder="ID da categoria"
            />
          </div>
          <div className="space-y-2">
            <Label>Limite de cards (máx 10)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={config.dynamicLimit ?? 10}
              onChange={(e) => handleConfigChange("dynamicLimit", parseInt(e.target.value) || 10)}
            />
          </div>
          <div className="space-y-2">
            <Label>Texto do botão de cada card</Label>
            <Input
              value={config.dynamicButtonText || "Selecionar"}
              onChange={(e) => handleConfigChange("dynamicButtonText", e.target.value)}
              maxLength={20}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Cards (até 10)</Label>
            <Button variant="outline" size="sm" onClick={addCard} disabled={cards.length >= 10}>
              <Plus className="w-4 h-4 mr-1" /> Card
            </Button>
          </div>
          {cards.map((card: any, i: number) => (
            <Card key={card.id || i} className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Card {i + 1}</span>
                <Button variant="ghost" size="icon" onClick={() => removeCard(i)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <Input
                value={card.header || ""}
                onChange={(e) => updateCard(i, { header: e.target.value })}
                placeholder="URL da imagem do card"
              />
              <Input
                value={card.body || ""}
                onChange={(e) => updateCard(i, { body: e.target.value })}
                placeholder="Título / descrição do card"
              />
              <Input
                value={card.footer || ""}
                onChange={(e) => updateCard(i, { footer: e.target.value })}
                placeholder="Rodapé (opcional)"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={card.buttonText || ""}
                  onChange={(e) => updateCard(i, { buttonText: e.target.value })}
                  placeholder="Texto do botão"
                  maxLength={20}
                />
                <Input
                  value={card.buttonId || ""}
                  onChange={(e) => updateCard(i, { buttonId: e.target.value })}
                  placeholder="ID (ex: card_1)"
                />
              </div>
            </Card>
          ))}
          {cards.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4 border-2 border-dashed rounded">
              Adicione pelo menos um card.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Salvar escolha em</Label>
        <Input
          value={config.variable || ""}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="card_escolhido"
        />
      </div>
    </div>
  );
};
