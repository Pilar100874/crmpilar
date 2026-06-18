import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Bold, Italic, Smile, Code, Heading, List, ListOrdered, Link, Quote, Info } from "lucide-react";
import { RichTextEditor } from "../RichTextEditor";
import { ConfigSection, ConfigInput, ConfigTextarea, ConfigSelect, ConfigSwitch, ConfigInfo } from "./ConfigField";
import { FormattingToolbar } from "./FormattingToolbar";
import { WaitingMessageField } from "./WaitingMessageField";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs?: any;
  openVariablePicker?: (ref: any) => void;
  nodes?: any[];
  edges?: any[];
  selectedNode?: any;
}

// Remove unused function - now built into RichTextEditor

export const AskNameConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <RichTextEditor
          value={config.question || "Qual é o seu nome?"}
          onChange={(text) => handleConfigChange("question", text)}
          placeholder="Qual é o seu nome?"
          multiline={true}
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
        />
      </div>
    </ConfigSection>

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-foreground">
          Salvar resposta do usuário no campo
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        </Label>
      </div>
      <div className="relative">
        <Input
          value={config.variable || "nome"}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="nome"
          className="bg-white border-border text-foreground"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
          T
        </span>
      </div>
    </div>

    <div className="bg-blue-50 rounded-lg p-4 flex gap-3 border border-blue-200">
      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-foreground/80">
        Este bloco coleta o nome do usuário e salva no campo especificado para uso posterior no fluxo.
      </p>
    </div>

    <ConfigInfo variant="info">
      <p className="font-semibold mb-1">💡 Dica:</p>
      <p>Use a formatação WhatsApp para deixar sua pergunta mais clara: *negrito*, _itálico_, ~tachado~, ```código```</p>
    </ConfigInfo>
  </div>
);

export const AskQuestionConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => {
  const [showSettings, setShowSettings] = useState(true);

  return (
    <div className="space-y-4">
      <ConfigSection title="Pergunta">
        <div className="space-y-2">
          <Label className="text-white text-sm font-semibold flex items-center gap-2">
            <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
            Texto da Pergunta
          </Label>
          <RichTextEditor
            value={config.question || "Faça sua pergunta"}
            onChange={(text) => handleConfigChange("question", text)}
            placeholder="Faça sua pergunta"
            multiline={true}
            nodes={nodes}
            edges={edges}
            selectedNode={selectedNode}
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-foreground">
            Salvar resposta do usuário no campo
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </Label>
        </div>
        <div className="relative">
          <Input
            value={config.variable || "resposta"}
            onChange={(e) => handleConfigChange("variable", e.target.value)}
            placeholder="resposta"
            className="bg-white border-border text-foreground"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
            T
          </span>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 flex gap-3 border border-blue-200">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground/80">
          Este bloco coleta uma resposta personalizada e salva no campo especificado para uso posterior no fluxo.
        </p>
      </div>
    </div>
  );
};

export const AskEmailConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <RichTextEditor
          value={config.question || "Qual é o seu e-mail?"}
          onChange={(text) => handleConfigChange("question", text)}
          placeholder="Qual é o seu e-mail?"
          multiline={true}
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
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

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-foreground">
          Salvar resposta do usuário no campo
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        </Label>
      </div>
      <div className="relative">
        <Input
          value={config.variable || "email"}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="email"
          className="bg-white border-border text-foreground"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
          T
        </span>
      </div>
    </div>

    <div className="bg-blue-50 rounded-lg p-4 flex gap-3 border border-blue-200">
      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-foreground/80">
        Este bloco coleta o e-mail do usuário e salva no campo especificado para uso posterior no fluxo.
      </p>
    </div>
  </div>
);

export const AskNumberConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <RichTextEditor
          value={config.question || "Digite um número"}
          onChange={(text) => handleConfigChange("question", text)}
          placeholder="Digite um número"
          multiline={true}
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
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

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-foreground">
          Salvar resposta do usuário no campo
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        </Label>
      </div>
      <div className="relative">
        <Input
          value={config.variable || "numero"}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="numero"
          className="bg-white border-border text-foreground"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
          N
        </span>
      </div>
    </div>

    <div className="bg-blue-50 rounded-lg p-4 flex gap-3 border border-blue-200">
      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-foreground/80">
        Este bloco coleta um número do usuário e salva no campo especificado para uso posterior no fluxo.
      </p>
    </div>
  </div>
);

export const AskPhoneConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <RichTextEditor
          value={config.question || "Qual é o seu telefone?"}
          onChange={(text) => handleConfigChange("question", text)}
          placeholder="Qual é o seu telefone?"
          multiline={true}
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
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

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-foreground">
          Salvar resposta do usuário no campo
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        </Label>
      </div>
      <div className="relative">
        <Input
          value={config.variable || "telefone"}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="telefone"
          className="bg-white border-border text-foreground"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
          T
        </span>
      </div>
    </div>

    <div className="bg-blue-50 rounded-lg p-4 flex gap-3 border border-blue-200">
      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-foreground/80">
        Este bloco coleta o telefone do usuário e salva no campo especificado para uso posterior no fluxo.
      </p>
    </div>
  </div>
);

export const AskDateConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <RichTextEditor
          value={config.question || "Qual é a data?"}
          onChange={(text) => handleConfigChange("question", text)}
          placeholder="Qual é a data?"
          multiline={true}
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
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

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-foreground">
          Salvar resposta do usuário no campo
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        </Label>
      </div>
      <div className="relative">
        <Input
          value={config.variable || "data"}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="data"
          className="bg-white border-border text-foreground"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
          D
        </span>
      </div>
    </div>

    <div className="bg-blue-50 rounded-lg p-4 flex gap-3 border border-blue-200">
      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-foreground/80">
        Este bloco coleta uma data do usuário e salva no campo especificado para uso posterior no fluxo.
      </p>
    </div>
  </div>
);

export const AskFileConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <RichTextEditor
          value={config.question || "Envie um arquivo"}
          onChange={(text) => handleConfigChange("question", text)}
          placeholder="Envie um arquivo"
          multiline={true}
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
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

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-foreground">
          Salvar URL do arquivo no campo
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        </Label>
      </div>
      <div className="relative">
        <Input
          value={config.variable || "arquivo"}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="arquivo"
          className="bg-white border-border text-foreground"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
          F
        </span>
      </div>
    </div>

    <div className="bg-blue-50 rounded-lg p-4 flex gap-3 border border-blue-200">
      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-foreground/80">
        Este bloco coleta um arquivo do usuário e salva a URL no campo especificado para uso posterior no fluxo.
      </p>
    </div>
  </div>
);

export const AskAddressConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <RichTextEditor
          value={config.question || "Qual é o seu endereço?"}
          onChange={(text) => handleConfigChange("question", text)}
          placeholder="Qual é o seu endereço?"
          multiline={true}
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
        />
      </div>
    </ConfigSection>

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-foreground">
          Salvar resposta do usuário no campo
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        </Label>
      </div>
      <div className="relative">
        <Input
          value={config.variable || "endereco"}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="endereco"
          className="bg-white border-border text-foreground"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
          T
        </span>
      </div>
    </div>

    <div className="bg-blue-50 rounded-lg p-4 flex gap-3 border border-blue-200">
      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-foreground/80">
        Este bloco coleta o endereço do usuário e salva no campo especificado. Você pode pedir o endereço completo ou dividir em campos separados (rua, número, cidade, etc).
      </p>
    </div>
  </div>
);

export const AskUrlConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => (
  <div className="space-y-4">
    <ConfigSection title="Pergunta">
      <div className="space-y-2">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
          Texto da Pergunta
        </Label>
        <RichTextEditor
          value={config.question || "Digite uma URL"}
          onChange={(text) => handleConfigChange("question", text)}
          placeholder="Digite uma URL"
          multiline={true}
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
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

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-foreground">
          Salvar resposta do usuário no campo
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        </Label>
      </div>
      <div className="relative">
        <Input
          value={config.variable || "url"}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="url"
          className="bg-white border-border text-foreground"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
          U
        </span>
      </div>
    </div>

    <div className="bg-blue-50 rounded-lg p-4 flex gap-3 border border-blue-200">
      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-foreground/80">
        Este bloco coleta uma URL do usuário e salva no campo especificado para uso posterior no fluxo.
      </p>
    </div>
  </div>
);

export const AskCNPJConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => {
  const cnpjFields = [
    { key: 'variable', label: 'CNPJ', placeholder: 'cnpj', description: 'Número do CNPJ' },
    { key: 'razaoSocialField', label: 'Razão Social', placeholder: 'razao_social', description: 'Nome empresarial' },
    { key: 'nomeFantasiaField', label: 'Nome Fantasia', placeholder: 'nome_fantasia', description: 'Nome fantasia' },
    { key: 'naturezaJuridicaField', label: 'Natureza Jurídica', placeholder: 'natureza_juridica', description: 'Natureza jurídica' },
    { key: 'dataAberturaField', label: 'Data de Abertura', placeholder: 'data_abertura', description: 'Data de início das atividades' },
    { key: 'situacaoField', label: 'Situação Cadastral', placeholder: 'situacao', description: 'Situação (ativa, inativa, etc)' },
    { key: 'porteField', label: 'Porte da Empresa', placeholder: 'porte', description: 'Porte (micro, pequeno, etc)' },
    { key: 'atividadePrincipalField', label: 'Atividade Principal', placeholder: 'atividade_principal', description: 'CNAE principal' },
    { key: 'logradouroField', label: 'Logradouro', placeholder: 'logradouro', description: 'Endereço - logradouro' },
    { key: 'numeroField', label: 'Número', placeholder: 'numero', description: 'Endereço - número' },
    { key: 'complementoField', label: 'Complemento', placeholder: 'complemento', description: 'Endereço - complemento' },
    { key: 'bairroField', label: 'Bairro', placeholder: 'bairro', description: 'Endereço - bairro' },
    { key: 'municipioField', label: 'Município', placeholder: 'municipio', description: 'Endereço - município' },
    { key: 'ufField', label: 'UF', placeholder: 'uf', description: 'Endereço - UF' },
    { key: 'cepField', label: 'CEP', placeholder: 'cep', description: 'Endereço - CEP' },
    { key: 'telefoneField', label: 'Telefone', placeholder: 'telefone', description: 'Telefone de contato' },
    { key: 'emailField', label: 'E-mail', placeholder: 'email', description: 'E-mail de contato' },
    { key: 'socioNomeField', label: 'Nome do Sócio', placeholder: 'socio_nome', description: 'Nome do sócio principal' },
    { key: 'socioQualificacaoField', label: 'Qualificação do Sócio', placeholder: 'socio_qualificacao', description: 'Qualificação do sócio' },
    { key: 'regimeTributarioField', label: 'Regime Tributário', placeholder: 'regime_tributario', description: 'Regime tributário (Simples, SIMEI, etc)' },
    { key: 'simplesOptanteField', label: 'Optante Simples', placeholder: 'simples_optante', description: 'Se é optante do Simples Nacional' },
    { key: 'simeiOptanteField', label: 'Optante SIMEI', placeholder: 'simei_optante', description: 'Se é optante do SIMEI' },
  ];

  return (
    <div className="space-y-4">
      <ConfigSection title="Pergunta">
        <div className="space-y-2">
          <Label className="text-white text-sm font-semibold flex items-center gap-2">
            <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
            Texto da Pergunta
          </Label>
          <RichTextEditor
            value={config.question || "Digite o CNPJ da empresa:"}
            onChange={(text) => handleConfigChange("question", text)}
            placeholder="Digite o CNPJ da empresa:"
            multiline={true}
            nodes={nodes}
            edges={edges}
            selectedNode={selectedNode}
          />
        </div>
      </ConfigSection>

      <ConfigSection title="Validação">
        <ConfigTextarea
          label="Mensagem de Erro"
          value={config.errorMessage || ""}
          onChange={(v) => handleConfigChange("errorMessage", v)}
          placeholder="Por favor, insira um CNPJ válido"
          rows={2}
        />
      </ConfigSection>

      <ConfigSection title="Campos de Dados">
        <div className="space-y-3">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-foreground/70 mb-2">
              Configure o nome de cada campo onde os dados serão salvos:
            </p>
          </div>
          
          {cnpjFields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs text-foreground/70 flex items-center gap-1">
                {field.label}
                <span className="text-muted-foreground">({field.description})</span>
              </Label>
              <Input
                value={config[field.key] || field.placeholder}
                onChange={(e) => handleConfigChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="bg-white border-border text-foreground h-8 text-sm"
              />
            </div>
          ))}
        </div>
      </ConfigSection>

      <WaitingMessageField
        enabled={config.waitingMessageEnabled !== false}
        message={config.waitingMessage || ""}
        defaultMessage="Aguarde, consultando CNPJ..."
        onChange={(patch) => {
          if ("waitingMessageEnabled" in patch) handleConfigChange("waitingMessageEnabled", patch.waitingMessageEnabled);
          if ("waitingMessage" in patch) handleConfigChange("waitingMessage", patch.waitingMessage);
        }}
      />

      <div className="bg-blue-50 rounded-lg p-4 flex gap-3 border border-blue-200">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground/80">
          Este bloco valida o CNPJ e busca automaticamente todos os dados da empresa na Receita Federal. 
          As informações são salvas nos campos configurados acima.
        </p>
      </div>
    </div>
  );
};

export const AskCEPConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => {
  const cepFields = [
    { key: 'variable', label: 'CEP', placeholder: 'cep', description: 'CEP digitado' },
    { key: 'logradouroField', label: 'Logradouro', placeholder: 'logradouro', description: 'Nome da rua/avenida' },
    { key: 'bairroField', label: 'Bairro', placeholder: 'bairro', description: 'Bairro' },
    { key: 'localidadeField', label: 'Cidade', placeholder: 'localidade', description: 'Nome da cidade' },
    { key: 'ufField', label: 'UF', placeholder: 'uf', description: 'Estado (UF)' },
    { key: 'complementoField', label: 'Complemento', placeholder: 'complemento', description: 'Complemento do endereço' },
  ];

  return (
    <div className="space-y-4">
      <ConfigSection title="Pergunta">
        <div className="space-y-2">
          <Label className="text-white text-sm font-semibold flex items-center gap-2">
            <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
            Texto da Pergunta
          </Label>
          <RichTextEditor
            value={config.question || "Digite o CEP:"}
            onChange={(text) => handleConfigChange("question", text)}
            placeholder="Digite o CEP:"
            multiline={true}
            nodes={nodes}
            edges={edges}
            selectedNode={selectedNode}
          />
        </div>
      </ConfigSection>

      <ConfigSection title="Validação">
        <ConfigTextarea
          label="Mensagem de Erro"
          value={config.errorMessage || ""}
          onChange={(v) => handleConfigChange("errorMessage", v)}
          placeholder="Por favor, insira um CEP válido"
          rows={2}
        />
      </ConfigSection>

      <ConfigSection title="Campos de Dados">
        <div className="space-y-3">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-foreground/70 mb-2">
              Configure o nome de cada campo onde os dados serão salvos:
            </p>
          </div>
          
          {cepFields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs text-foreground/70 flex items-center gap-1">
                {field.label}
                <span className="text-muted-foreground">({field.description})</span>
              </Label>
              <Input
                value={config[field.key] || field.placeholder}
                onChange={(e) => handleConfigChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="bg-white border-border text-foreground h-8 text-sm"
              />
            </div>
          ))}
        </div>
      </ConfigSection>

      <WaitingMessageField
        enabled={config.waitingMessageEnabled !== false}
        message={config.waitingMessage || ""}
        defaultMessage="Aguarde, consultando CEP..."
        onChange={(patch) => {
          if ("waitingMessageEnabled" in patch) handleConfigChange("waitingMessageEnabled", patch.waitingMessageEnabled);
          if ("waitingMessage" in patch) handleConfigChange("waitingMessage", patch.waitingMessage);
        }}
      />

      <div className="bg-blue-50 rounded-lg p-4 flex gap-3 border border-blue-200">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground/80">
          Este bloco valida o CEP e busca automaticamente todos os dados do endereço via ViaCEP. 
          As informações são salvas nos campos configurados acima.
        </p>
      </div>
    </div>
  );
};
