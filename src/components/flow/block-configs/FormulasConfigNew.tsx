import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Info, ChevronRight, ChevronDown, Lock, Calendar, Hash, Type, Globe, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

const FieldIcon = ({ type, locked }: { type: string; locked?: boolean }) => {
  const iconClass = "w-4 h-4";
  const wrapperClass = "w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold";
  
  switch (type) {
    case "id":
      return <div className={cn(wrapperClass, "bg-primary")}>B</div>;
    case "text":
      return <div className={cn(wrapperClass, "bg-pink-500")}>T</div>;
    case "date":
      return <Calendar className={iconClass} />;
    case "number":
      return <Hash className={iconClass} />;
    case "logic":
      return <div className={cn(wrapperClass, "bg-purple-500")}>f(x)</div>;
    default:
      return <Type className={iconClass} />;
  }
};

const FieldItem = ({ 
  name, 
  type = "text", 
  locked = false,
  onClick 
}: { 
  name: string; 
  type?: string; 
  locked?: boolean;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 text-left text-sm group"
  >
    <FieldIcon type={type} locked={locked} />
    <span className="flex-1">{name}</span>
    {locked && <Lock className="w-3 h-3 text-muted-foreground" />}
  </button>
);

const CategorySection = ({ 
  title, 
  children,
  defaultOpen = false 
}: { 
  title: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 text-left font-medium"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span className="text-sm">{title}</span>
      </button>
      {isOpen && <div className="py-1">{children}</div>}
    </div>
  );
};

export const FormulasConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  const insertField = (field: string) => {
    const currentFormula = config.formula || "";
    handleConfigChange("formula", currentFormula + field);
  };

  return (
    <div className="space-y-4 p-1">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-lg">Fórmulas Avançadas</h2>
          <p className="text-xs text-muted-foreground">Configure operações matemáticas e lógicas</p>
        </div>
      </div>

      <Separator />

      {/* Output Section */}
      <div className="space-y-3 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-xs font-bold">
            1
          </div>
          <h3 className="font-semibold text-base">Campo de Saída</h3>
        </div>

        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border">
          📝 Escolha o campo onde o resultado da fórmula será salvo
        </p>

        <div className="space-y-2 bg-gradient-to-br from-muted/50 to-muted/30 p-3 rounded-lg border">
          <Label className="text-xs font-semibold">Nome do Campo</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">@</span>
              <Input
                value={config.outputField || "result"}
                onChange={(e) => handleConfigChange("outputField", e.target.value)}
                placeholder="result"
                className="pl-7 bg-background"
              />
            </div>
            <Button variant="default" size="sm" className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-md">
              CRIAR
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold">Saídas do Bloco</Label>
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 border-0">SUCCESS / ERROR</Badge>
            <Badge variant="outline" className="border-primary/50 text-primary dark:text-primary">TRUE / FALSE</Badge>
            <Badge variant="outline" className="border-purple-500/50 text-purple-600 dark:text-purple-400">CUSTOM</Badge>
          </div>
        </div>
      </div>
      
      <Separator />

      {/* Formula Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center text-xs font-bold">
            2
          </div>
          <h3 className="font-semibold text-base">Editor de Fórmulas</h3>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-5 gap-3 min-h-[450px]">
          {/* Left Sidebar - Fields */}
          <div className="col-span-2 border rounded-lg overflow-hidden bg-gradient-to-b from-muted/30 to-muted/10 shadow-sm">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-3 py-2 border-b">
              <p className="text-xs font-semibold">📚 Biblioteca de Funções</p>
            </div>
            <ScrollArea className="h-[410px]">
              <CategorySection title="Fields" defaultOpen={true}>
                <div className="space-y-0.5">
                  <div className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted/30">
                    Lead data
                  </div>
                  <FieldItem name="ID" type="id" onClick={() => insertField("@id")} />
                  <FieldItem name="Name" type="text" onClick={() => insertField("@name")} />
                  <FieldItem name="Email" type="text" onClick={() => insertField("@email")} />
                  <FieldItem name="Company" type="text" onClick={() => insertField("@company")} />
                  <FieldItem name="Phone" type="text" onClick={() => insertField("@phone")} />
                  <FieldItem name="API Payload" type="text" locked onClick={() => insertField("@api_payload")} />
                  
                  <div className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted/30">
                    Usage details
                  </div>
                  <FieldItem name="Chat transcriptio" type="text" onClick={() => insertField("@chat_transcript")} />
                  <FieldItem name="Agents online" type="id" locked onClick={() => insertField("@agents_online")} />
                  <FieldItem name="Last seen" type="date" locked onClick={() => insertField("@last_seen")} />
                  <FieldItem name="Created" type="date" locked onClick={() => insertField("@created")} />
                  <FieldItem name="url" type="text" onClick={() => insertField("@url")} />
                  <FieldItem name="country" type="text" onClick={() => insertField("@country")} />
                  <FieldItem name="Browser" type="text" locked onClick={() => insertField("@browser")} />
                  <FieldItem name="Device" type="text" locked onClick={() => insertField("@device")} />
                  <FieldItem name="OS" type="text" locked onClick={() => insertField("@os")} />
                </div>
              </CategorySection>

              <CategorySection title="Custom fields">
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                  No custom fields
                </div>
              </CategorySection>

              <CategorySection title="Time references">
                <FieldItem name="now()" type="date" onClick={() => insertField("now()")} />
                <FieldItem name="today()" type="date" onClick={() => insertField("today()")} />
              </CategorySection>

              <CategorySection title="Comparison">
                <FieldItem name="==" type="logic" onClick={() => insertField(" == ")} />
                <FieldItem name="!=" type="logic" onClick={() => insertField(" != ")} />
                <FieldItem name=">" type="logic" onClick={() => insertField(" > ")} />
                <FieldItem name="<" type="logic" onClick={() => insertField(" < ")} />
                <FieldItem name=">=" type="logic" onClick={() => insertField(" >= ")} />
                <FieldItem name="<=" type="logic" onClick={() => insertField(" <= ")} />
              </CategorySection>

              <CategorySection title="Logical">
                <FieldItem name="And" type="logic" onClick={() => insertField("And()")} />
                <FieldItem name="If" type="logic" onClick={() => insertField("If()")} />
                <FieldItem name="Not" type="logic" onClick={() => insertField("Not()")} />
                <FieldItem name="Or" type="logic" onClick={() => insertField("Or()")} />
              </CategorySection>

              <CategorySection title="Date">
                <FieldItem name="addDays(date, n)" type="date" onClick={() => insertField("addDays()")} />
                <FieldItem name="subtractDays(date, n)" type="date" onClick={() => insertField("subtractDays()")} />
                <FieldItem name="formatDate(date, format)" type="date" onClick={() => insertField("formatDate()")} />
              </CategorySection>

              <CategorySection title="Math">
                <FieldItem name="Sum(a, b)" type="number" onClick={() => insertField("Sum()")} />
                <FieldItem name="Subtract(a, b)" type="number" onClick={() => insertField("Subtract()")} />
                <FieldItem name="Multiply(a, b)" type="number" onClick={() => insertField("Multiply()")} />
                <FieldItem name="Divide(a, b)" type="number" onClick={() => insertField("Divide()")} />
                <FieldItem name="Round(n)" type="number" onClick={() => insertField("Round()")} />
              </CategorySection>

              <CategorySection title="String">
                <FieldItem name="concat(a, b)" type="text" onClick={() => insertField("concat()")} />
                <FieldItem name="uppercase(str)" type="text" onClick={() => insertField("uppercase()")} />
                <FieldItem name="lowercase(str)" type="text" onClick={() => insertField("lowercase()")} />
                <FieldItem name="length(str)" type="number" onClick={() => insertField("length()")} />
              </CategorySection>

              <CategorySection title="Array">
                <FieldItem name="length(arr)" type="number" onClick={() => insertField("length()")} />
                <FieldItem name="contains(arr, item)" type="logic" onClick={() => insertField("contains()")} />
                <FieldItem name="join(arr, separator)" type="text" onClick={() => insertField("join()")} />
              </CategorySection>

              <CategorySection title="Object">
                <FieldItem name="get(obj, key)" type="text" onClick={() => insertField("get()")} />
                <FieldItem name="has(obj, key)" type="logic" onClick={() => insertField("has()")} />
              </CategorySection>

              <CategorySection title="Regex">
                <FieldItem name="test(pattern, str)" type="logic" onClick={() => insertField("test()")} />
                <FieldItem name="match(pattern, str)" type="text" onClick={() => insertField("match()")} />
              </CategorySection>
            </ScrollArea>
          </div>

          {/* Right Side - Formula Editor */}
          <div className="col-span-3 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">💻 Editor de Código</Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Testar fórmula ↓
                </Button>
              </div>
              <div className="relative">
                <Textarea
                  value={config.formula || ""}
                  onChange={(e) => handleConfigChange("formula", e.target.value)}
                  placeholder="Digite uma fórmula ou clique nos campos à esquerda para inserir..."
                  rows={10}
                  className="bg-gradient-to-br from-slate-900 to-slate-800 text-white font-mono resize-none border-slate-700 shadow-inner placeholder:text-muted-foreground"
                />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2 py-1 bg-slate-950/50 rounded border border-slate-700/50 backdrop-blur-sm">
                  <span className="text-xs text-red-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    Aguardando validação
                  </span>
                  <span className="text-xs text-muted-foreground">Ln 1, Col 1</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 text-center border-dashed">
              <Globe className="w-10 h-10 mx-auto mb-2 text-primary/50 dark:text-primary/50" />
              <p className="text-sm text-muted-foreground font-medium">
                ✨ Explore funções e operações na coluna esquerda
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique em qualquer item para inserir no editor
              </p>
            </div>

            <div className="bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10 border border-primary/20 dark:border-primary/30 rounded-lg p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-primary dark:text-primary flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1.5">
                  <p className="font-bold text-primary dark:text-primary">💡 Dicas Importantes:</p>
                  <p className="text-primary/80 dark:text-primary/80">• Fórmulas são sensíveis a maiúsculas → <code className="bg-white/50 dark:bg-black/20 px-1 rounded">Sum(...)</code> ✓ <code className="bg-white/50 dark:bg-black/20 px-1 rounded">SUM(...)</code> ✗</p>
                  <p className="text-primary/80 dark:text-primary/80">• Campos do sistema precisam de aspas → <code className="bg-white/50 dark:bg-black/20 px-1 rounded">"@today"</code> ✓</p>
                  <p className="text-primary/80 dark:text-primary/80">• Você pode combinar funções → <code className="bg-white/50 dark:bg-black/20 px-1 rounded">Sum(2, Sum(4, 2))</code> ✓</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
