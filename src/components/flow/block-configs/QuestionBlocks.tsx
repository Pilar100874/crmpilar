import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VariableTextarea } from "../VariableInput";
import { Switch } from "@/components/ui/switch";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs: any;
  openVariablePicker: (ref: any) => void;
}

export const AskNameConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Pergunta</Label>
      <VariableTextarea
        name="question"
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "Qual é o seu nome?"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        onVariableRequest={() => openVariablePicker(inputRefs.current['question'])}
        placeholder="Qual é o seu nome?"
        rows={2}
      />
    </div>

    <div className="space-y-2">
      <Label>Variável de Armazenamento</Label>
      <Input
        value={config.variable || "name"}
        onChange={(e) => handleConfigChange("variable", e.target.value)}
        placeholder="name"
      />
      <p className="text-xs text-muted-foreground">
        Valor será salvo em {"{{"}{config.variable || "name"}{"}}"} 
      </p>
    </div>

    <div className="flex items-center justify-between">
      <Label>Validar Nome Completo</Label>
      <Switch
        checked={config.validateFullName !== false}
        onCheckedChange={(checked) => handleConfigChange("validateFullName", checked)}
      />
    </div>

    <div className="flex items-center justify-between">
      <Label>Obrigatório</Label>
      <Switch
        checked={config.required !== false}
        onCheckedChange={(checked) => handleConfigChange("required", checked)}
      />
    </div>
  </div>
);

export const AskQuestionConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Pergunta *</Label>
      <VariableTextarea
        name="question"
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || ""}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        onVariableRequest={() => openVariablePicker(inputRefs.current['question'])}
        placeholder="Digite sua pergunta..."
        rows={3}
      />
    </div>

    <div className="space-y-2">
      <Label>Variável de Armazenamento *</Label>
      <Input
        value={config.variable || ""}
        onChange={(e) => handleConfigChange("variable", e.target.value)}
        placeholder="resposta_usuario"
        required
      />
      <p className="text-xs text-muted-foreground">
        Disponível como {"{{"}{config.variable || "variavel"}{"}}"}
      </p>
    </div>

    <div className="flex items-center justify-between">
      <Label>Obrigatório</Label>
      <Switch
        checked={config.required !== false}
        onCheckedChange={(checked) => handleConfigChange("required", checked)}
      />
    </div>

    <div className="space-y-2">
      <Label>Validação (regex opcional)</Label>
      <Input
        value={config.validation || ""}
        onChange={(e) => handleConfigChange("validation", e.target.value)}
        placeholder="^[A-Za-z0-9]+$"
      />
    </div>
  </div>
);

export const AskEmailConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Pergunta</Label>
      <VariableTextarea
        name="question"
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "Qual é o seu email?"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        onVariableRequest={() => openVariablePicker(inputRefs.current['question'])}
        placeholder="Qual é o seu email?"
        rows={2}
      />
    </div>

    <div className="space-y-2">
      <Label>Variável de Armazenamento</Label>
      <Input
        value={config.variable || "email"}
        onChange={(e) => handleConfigChange("variable", e.target.value)}
        placeholder="email"
      />
      <p className="text-xs text-muted-foreground">
        Email será salvo em {"{{"}{config.variable || "email"}{"}}"}
      </p>
      <p className="text-xs text-info-foreground">
        ✓ Validação automática de formato de email
      </p>
    </div>

    <div className="flex items-center justify-between">
      <Label>Obrigatório</Label>
      <Switch
        checked={config.required !== false}
        onCheckedChange={(checked) => handleConfigChange("required", checked)}
      />
    </div>
  </div>
);

export const AskNumberConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Pergunta</Label>
      <VariableTextarea
        name="question"
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "Digite um número:"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        onVariableRequest={() => openVariablePicker(inputRefs.current['question'])}
        placeholder="Digite um número:"
        rows={2}
      />
    </div>

    <div className="space-y-2">
      <Label>Variável de Armazenamento</Label>
      <Input
        value={config.variable || "number"}
        onChange={(e) => handleConfigChange("variable", e.target.value)}
        placeholder="number"
      />
    </div>

    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-2">
        <Label>Mínimo (opcional)</Label>
        <Input
          type="number"
          value={config.min || ""}
          onChange={(e) => handleConfigChange("min", e.target.value ? parseFloat(e.target.value) : undefined)}
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <Label>Máximo (opcional)</Label>
        <Input
          type="number"
          value={config.max || ""}
          onChange={(e) => handleConfigChange("max", e.target.value ? parseFloat(e.target.value) : undefined)}
          placeholder="100"
        />
      </div>
    </div>
  </div>
);

export const AskPhoneConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Pergunta</Label>
      <VariableTextarea
        name="question"
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "Qual é o seu telefone?"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        onVariableRequest={() => openVariablePicker(inputRefs.current['question'])}
        placeholder="Qual é o seu telefone?"
        rows={2}
      />
    </div>

    <div className="space-y-2">
      <Label>Variável</Label>
      <Input
        value={config.variable || "phone"}
        onChange={(e) => handleConfigChange("variable", e.target.value)}
        placeholder="phone"
      />
      <p className="text-xs text-info-foreground">
        ✓ Validação automática de formato de telefone
      </p>
    </div>
  </div>
);

export const AskDateConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Pergunta</Label>
      <VariableTextarea
        name="question"
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "Selecione uma data:"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        onVariableRequest={() => openVariablePicker(inputRefs.current['question'])}
        placeholder="Selecione uma data:"
        rows={2}
      />
    </div>

    <div className="space-y-2">
      <Label>Variável</Label>
      <Input
        value={config.variable || "date"}
        onChange={(e) => handleConfigChange("variable", e.target.value)}
        placeholder="date"
      />
    </div>
  </div>
);

export const AskFileConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Pergunta</Label>
      <VariableTextarea
        name="question"
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "Envie o arquivo:"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        onVariableRequest={() => openVariablePicker(inputRefs.current['question'])}
        placeholder="Envie o arquivo:"
        rows={2}
      />
    </div>

    <div className="space-y-2">
      <Label>Variável</Label>
      <Input
        value={config.variable || "file"}
        onChange={(e) => handleConfigChange("variable", e.target.value)}
        placeholder="file"
      />
    </div>

    <div className="space-y-2">
      <Label>Tipos Permitidos (separados por vírgula)</Label>
      <Input
        value={config.allowedTypes?.join(", ") || ""}
        onChange={(e) => handleConfigChange("allowedTypes", e.target.value.split(",").map(t => t.trim()))}
        placeholder="pdf, jpg, png, docx"
      />
    </div>

    <div className="space-y-2">
      <Label>Tamanho Máximo (MB)</Label>
      <Input
        type="number"
        value={config.maxSize || 10}
        onChange={(e) => handleConfigChange("maxSize", parseInt(e.target.value))}
        min={1}
        max={100}
      />
    </div>
  </div>
);

export const AskAddressConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Pergunta</Label>
      <VariableTextarea
        name="question"
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "Qual é o seu endereço?"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        onVariableRequest={() => openVariablePicker(inputRefs.current['question'])}
        placeholder="Qual é o seu endereço?"
        rows={2}
      />
    </div>

    <div className="space-y-2">
      <Label>Variável</Label>
      <Input
        value={config.variable || "address"}
        onChange={(e) => handleConfigChange("variable", e.target.value)}
        placeholder="address"
      />
    </div>
  </div>
);

export const AskUrlConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Pergunta</Label>
      <VariableTextarea
        name="question"
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "Cole o link:"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        onVariableRequest={() => openVariablePicker(inputRefs.current['question'])}
        placeholder="Cole o link:"
        rows={2}
      />
    </div>

    <div className="space-y-2">
      <Label>Variável</Label>
      <Input
        value={config.variable || "url"}
        onChange={(e) => handleConfigChange("variable", e.target.value)}
        placeholder="url"
      />
      <p className="text-xs text-info-foreground">
        ✓ Validação automática de formato de URL
      </p>
    </div>
  </div>
);
