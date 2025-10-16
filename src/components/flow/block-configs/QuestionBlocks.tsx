import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Bold, Italic, Smile, Code, Heading, List, ListOrdered, Link, Quote, Info } from "lucide-react";
import { ConfigSection, ConfigInput, ConfigTextarea, ConfigSelect, ConfigSwitch, ConfigInfo } from "./ConfigField";
import { FormattingToolbar } from "./FormattingToolbar";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs: any;
  openVariablePicker: (ref: any) => void;
}

const insertFormatting = (
  textareaRef: HTMLTextAreaElement | null,
  prefix: string,
  suffix: string,
  currentValue: string,
  onChange: (value: string) => void
) => {
  if (!textareaRef) return;

  const start = textareaRef.selectionStart;
  const end = textareaRef.selectionEnd;
  const selectedText = currentValue.substring(start, end);
  const newText = currentValue.substring(0, start) + prefix + selectedText + suffix + currentValue.substring(end);
  
  onChange(newText);

  setTimeout(() => {
    textareaRef.focus();
    const newCursorPos = start + prefix.length + selectedText.length + suffix.length;
    textareaRef.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
};

export const AskNameConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <Textarea
          ref={(el) => (inputRefs.current['question'] = el)}
          value={config.question || "Qual é o seu nome?"}
          onChange={(e) => handleConfigChange("question", e.target.value)}
          placeholder="Qual é o seu nome?"
          rows={3}
          className="resize-none bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
        />
        <FormattingToolbar
          onFormat={(prefix, suffix) => insertFormatting(
            inputRefs.current['question'],
            prefix,
            suffix,
            config.question || "",
            (val) => handleConfigChange("question", val)
          )}
          onVariableClick={() => openVariablePicker(inputRefs.current['question'])}
        />
      </div>
    </ConfigSection>

    <ConfigSection title="Salvar Resposta">
      <ConfigInput
        label="Campo para salvar"
        value={config.variable || "nome"}
        onChange={(v) => handleConfigChange("variable", v)}
        placeholder="nome"
        required
        info="Se um campo não for definido, a resposta não será salva."
        prefix="@"
      />
    </ConfigSection>

    <ConfigInfo variant="info">
      <p className="font-semibold mb-1">💡 Dica:</p>
      <p>Use a formatação WhatsApp para deixar sua pergunta mais clara: *negrito*, _itálico_, ~tachado~, ```código```</p>
    </ConfigInfo>
  </div>
);

export const AskQuestionConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const [showSettings, setShowSettings] = useState(true);

  return (
    <div className="space-y-4">
      <ConfigSection title="Pergunta">
        <div className="space-y-2">
          <Label className="text-white text-sm font-semibold flex items-center gap-2">
            <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
            Texto da Pergunta
          </Label>
          <Textarea
            ref={(el) => (inputRefs.current['question'] = el)}
            value={config.question || "Faça sua pergunta"}
            onChange={(e) => handleConfigChange("question", e.target.value)}
            placeholder="Faça sua pergunta"
            rows={3}
            className="resize-none bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
          />
          <FormattingToolbar
            onFormat={(prefix, suffix) => insertFormatting(
              inputRefs.current['question'],
              prefix,
              suffix,
              config.question || "",
              (val) => handleConfigChange("question", val)
            )}
            onVariableClick={() => openVariablePicker(inputRefs.current['question'])}
          />
        </div>
      </ConfigSection>

      <ConfigSwitch
        label="Mostrar Configurações Avançadas"
        checked={showSettings}
        onChange={setShowSettings}
      />

      {showSettings && (
        <ConfigSection title="Validação">
          <div className="grid grid-cols-2 gap-3">
            <ConfigInput
              label="Min. caracteres"
              type="number"
              value={config.minChars || 0}
              onChange={(v) => handleConfigChange("minChars", parseInt(v) || 0)}
              placeholder="0"
            />
            <ConfigInput
              label="Max. caracteres"
              type="number"
              value={config.maxChars || 99999}
              onChange={(v) => handleConfigChange("maxChars", parseInt(v) || 99999)}
              placeholder="99999"
            />
          </div>

          <ConfigInput
            label="Padrão Regex (opcional)"
            value={config.regexPattern || ""}
            onChange={(v) => handleConfigChange("regexPattern", v)}
            placeholder="^[A-Za-z ]+$"
            info="Use expressões regulares para validar o formato da resposta"
          />

          <ConfigTextarea
            label="Mensagem de Erro Personalizada"
            value={config.errorMessage || ""}
            onChange={(v) => handleConfigChange("errorMessage", v)}
            placeholder="Por favor, insira uma resposta válida"
            rows={2}
          />
        </ConfigSection>
      )}

      <ConfigSection title="Salvar Resposta">
        <ConfigInput
          label="Campo para salvar"
          value={config.variable || "resposta"}
          onChange={(v) => handleConfigChange("variable", v)}
          placeholder="resposta"
          required
          info="Se um campo não for definido, a resposta não será salva."
          prefix="@"
        />
      </ConfigSection>
    </div>
  );
};

export const AskEmailConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <Textarea
          ref={(el) => (inputRefs.current['question'] = el)}
          value={config.question || "Qual é o seu e-mail?"}
          onChange={(e) => handleConfigChange("question", e.target.value)}
          placeholder="Qual é o seu e-mail?"
          rows={3}
          className="resize-none bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
        />
        <FormattingToolbar
          onFormat={(prefix, suffix) => insertFormatting(
            inputRefs.current['question'],
            prefix,
            suffix,
            config.question || "",
            (val) => handleConfigChange("question", val)
          )}
          onVariableClick={() => openVariablePicker(inputRefs.current['question'])}
        />
      </div>
    </ConfigSection>

    <ConfigSection title="Validação">
      <ConfigSwitch
        label="Validar formato de e-mail"
        checked={config.validateEmail !== false}
        onChange={(checked) => handleConfigChange("validateEmail", checked)}
        info="Verifica se o e-mail possui um formato válido"
      />

      <ConfigTextarea
        label="Mensagem de Erro"
        value={config.errorMessage || ""}
        onChange={(v) => handleConfigChange("errorMessage", v)}
        placeholder="Por favor, insira um e-mail válido"
        rows={2}
      />
    </ConfigSection>

    <ConfigSection title="Salvar Resposta">
      <ConfigInput
        label="Campo para salvar"
        value={config.variable || "email"}
        onChange={(v) => handleConfigChange("variable", v)}
        placeholder="email"
        required
        prefix="@"
      />
    </ConfigSection>
  </div>
);

export const AskNumberConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <Textarea
          ref={(el) => (inputRefs.current['question'] = el)}
          value={config.question || "Digite um número"}
          onChange={(e) => handleConfigChange("question", e.target.value)}
          placeholder="Digite um número"
          rows={3}
          className="resize-none bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
        />
        <FormattingToolbar
          onFormat={(prefix, suffix) => insertFormatting(
            inputRefs.current['question'],
            prefix,
            suffix,
            config.question || "",
            (val) => handleConfigChange("question", val)
          )}
          onVariableClick={() => openVariablePicker(inputRefs.current['question'])}
        />
      </div>
    </ConfigSection>

    <ConfigSection title="Validação">
      <div className="grid grid-cols-2 gap-3">
        <ConfigInput
          label="Número Mínimo"
          type="number"
          value={config.min || ""}
          onChange={(v) => handleConfigChange("min", v)}
          placeholder="0"
        />
        <ConfigInput
          label="Número Máximo"
          type="number"
          value={config.max || ""}
          onChange={(v) => handleConfigChange("max", v)}
          placeholder="999999"
        />
      </div>

      <ConfigSwitch
        label="Aceitar decimais"
        checked={config.allowDecimals !== false}
        onChange={(checked) => handleConfigChange("allowDecimals", checked)}
      />

      <ConfigTextarea
        label="Mensagem de Erro"
        value={config.errorMessage || ""}
        onChange={(v) => handleConfigChange("errorMessage", v)}
        placeholder="Por favor, insira um número válido"
        rows={2}
      />
    </ConfigSection>

    <ConfigSection title="Salvar Resposta">
      <ConfigInput
        label="Campo para salvar"
        value={config.variable || "numero"}
        onChange={(v) => handleConfigChange("variable", v)}
        placeholder="numero"
        required
        prefix="@"
      />
    </ConfigSection>
  </div>
);

export const AskPhoneConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <Textarea
          ref={(el) => (inputRefs.current['question'] = el)}
          value={config.question || "Qual é o seu telefone?"}
          onChange={(e) => handleConfigChange("question", e.target.value)}
          placeholder="Qual é o seu telefone?"
          rows={3}
          className="resize-none bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
        />
        <FormattingToolbar
          onFormat={(prefix, suffix) => insertFormatting(
            inputRefs.current['question'],
            prefix,
            suffix,
            config.question || "",
            (val) => handleConfigChange("question", val)
          )}
          onVariableClick={() => openVariablePicker(inputRefs.current['question'])}
        />
      </div>
    </ConfigSection>

    <ConfigSection title="Validação">
      <ConfigSelect
        label="Formato"
        value={config.format || "international"}
        onChange={(v) => handleConfigChange("format", v)}
        options={[
          { value: "international", label: "Internacional (+55 11 99999-9999)" },
          { value: "national", label: "Nacional (11 99999-9999)" },
          { value: "any", label: "Qualquer formato" }
        ]}
      />

      <ConfigSwitch
        label="Validar formato"
        checked={config.validateFormat !== false}
        onChange={(checked) => handleConfigChange("validateFormat", checked)}
      />

      <ConfigTextarea
        label="Mensagem de Erro"
        value={config.errorMessage || ""}
        onChange={(v) => handleConfigChange("errorMessage", v)}
        placeholder="Por favor, insira um telefone válido"
        rows={2}
      />
    </ConfigSection>

    <ConfigSection title="Salvar Resposta">
      <ConfigInput
        label="Campo para salvar"
        value={config.variable || "telefone"}
        onChange={(v) => handleConfigChange("variable", v)}
        placeholder="telefone"
        required
        prefix="@"
      />
    </ConfigSection>
  </div>
);

export const AskDateConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <Textarea
          ref={(el) => (inputRefs.current['question'] = el)}
          value={config.question || "Qual é a data?"}
          onChange={(e) => handleConfigChange("question", e.target.value)}
          placeholder="Qual é a data?"
          rows={3}
          className="resize-none bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
        />
        <FormattingToolbar
          onFormat={(prefix, suffix) => insertFormatting(
            inputRefs.current['question'],
            prefix,
            suffix,
            config.question || "",
            (val) => handleConfigChange("question", val)
          )}
          onVariableClick={() => openVariablePicker(inputRefs.current['question'])}
        />
      </div>
    </ConfigSection>

    <ConfigSection title="Validação">
      <ConfigSelect
        label="Formato da Data"
        value={config.dateFormat || "DD/MM/YYYY"}
        onChange={(v) => handleConfigChange("dateFormat", v)}
        options={[
          { value: "DD/MM/YYYY", label: "DD/MM/AAAA (31/12/2024)" },
          { value: "MM/DD/YYYY", label: "MM/DD/AAAA (12/31/2024)" },
          { value: "YYYY-MM-DD", label: "AAAA-MM-DD (2024-12-31)" }
        ]}
      />

      <ConfigInput
        label="Data Mínima (opcional)"
        value={config.minDate || ""}
        onChange={(v) => handleConfigChange("minDate", v)}
        placeholder="01/01/2024"
      />

      <ConfigInput
        label="Data Máxima (opcional)"
        value={config.maxDate || ""}
        onChange={(v) => handleConfigChange("maxDate", v)}
        placeholder="31/12/2024"
      />
    </ConfigSection>

    <ConfigSection title="Salvar Resposta">
      <ConfigInput
        label="Campo para salvar"
        value={config.variable || "data"}
        onChange={(v) => handleConfigChange("variable", v)}
        placeholder="data"
        required
        prefix="@"
      />
    </ConfigSection>
  </div>
);

export const AskFileConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <Textarea
          ref={(el) => (inputRefs.current['question'] = el)}
          value={config.question || "Envie um arquivo"}
          onChange={(e) => handleConfigChange("question", e.target.value)}
          placeholder="Envie um arquivo"
          rows={3}
          className="resize-none bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
        />
        <FormattingToolbar
          onFormat={(prefix, suffix) => insertFormatting(
            inputRefs.current['question'],
            prefix,
            suffix,
            config.question || "",
            (val) => handleConfigChange("question", val)
          )}
          onVariableClick={() => openVariablePicker(inputRefs.current['question'])}
        />
      </div>
    </ConfigSection>

    <ConfigSection title="Validação">
      <ConfigSelect
        label="Tipo de Arquivo Aceito"
        value={config.fileType || "any"}
        onChange={(v) => handleConfigChange("fileType", v)}
        options={[
          { value: "any", label: "Qualquer arquivo" },
          { value: "image", label: "Apenas imagens" },
          { value: "video", label: "Apenas vídeos" },
          { value: "audio", label: "Apenas áudio" },
          { value: "document", label: "Apenas documentos (PDF, DOC, etc)" }
        ]}
      />

      <ConfigInput
        label="Tamanho Máximo (MB)"
        type="number"
        value={config.maxSizeMB || 10}
        onChange={(v) => handleConfigChange("maxSizeMB", v)}
        placeholder="10"
      />
    </ConfigSection>

    <ConfigSection title="Salvar Resposta">
      <ConfigInput
        label="Campo para salvar URL"
        value={config.variable || "arquivo"}
        onChange={(v) => handleConfigChange("variable", v)}
        placeholder="arquivo"
        required
        prefix="@"
      />
    </ConfigSection>
  </div>
);

export const AskAddressConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <Textarea
          ref={(el) => (inputRefs.current['question'] = el)}
          value={config.question || "Qual é o seu endereço?"}
          onChange={(e) => handleConfigChange("question", e.target.value)}
          placeholder="Qual é o seu endereço?"
          rows={3}
          className="resize-none bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
        />
        <FormattingToolbar
          onFormat={(prefix, suffix) => insertFormatting(
            inputRefs.current['question'],
            prefix,
            suffix,
            config.question || "",
            (val) => handleConfigChange("question", val)
          )}
          onVariableClick={() => openVariablePicker(inputRefs.current['question'])}
        />
      </div>
    </ConfigSection>

    <ConfigSection title="Salvar Resposta">
      <ConfigInput
        label="Campo para salvar"
        value={config.variable || "endereco"}
        onChange={(v) => handleConfigChange("variable", v)}
        placeholder="endereco"
        required
        prefix="@"
      />
    </ConfigSection>

    <ConfigInfo variant="info">
      <p className="font-semibold mb-1">ℹ️ Dica:</p>
      <p>Você pode pedir o endereço completo ou dividir em campos separados (rua, número, cidade, etc)</p>
    </ConfigInfo>
  </div>
);

export const AskUrlConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <Textarea
          ref={(el) => (inputRefs.current['question'] = el)}
          value={config.question || "Digite uma URL"}
          onChange={(e) => handleConfigChange("question", e.target.value)}
          placeholder="Digite uma URL"
          rows={3}
          className="resize-none bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
        />
        <FormattingToolbar
          onFormat={(prefix, suffix) => insertFormatting(
            inputRefs.current['question'],
            prefix,
            suffix,
            config.question || "",
            (val) => handleConfigChange("question", val)
          )}
          onVariableClick={() => openVariablePicker(inputRefs.current['question'])}
        />
      </div>
    </ConfigSection>

    <ConfigSection title="Validação">
      <ConfigSwitch
        label="Validar formato de URL"
        checked={config.validateUrl !== false}
        onChange={(checked) => handleConfigChange("validateUrl", checked)}
        info="Verifica se a URL possui um formato válido (http:// ou https://)"
      />

      <ConfigTextarea
        label="Mensagem de Erro"
        value={config.errorMessage || ""}
        onChange={(v) => handleConfigChange("errorMessage", v)}
        placeholder="Por favor, insira uma URL válida"
        rows={2}
      />
    </ConfigSection>

    <ConfigSection title="Salvar Resposta">
      <ConfigInput
        label="Campo para salvar"
        value={config.variable || "url"}
        onChange={(v) => handleConfigChange("variable", v)}
        placeholder="url"
        required
        prefix="@"
      />
    </ConfigSection>
  </div>
);
