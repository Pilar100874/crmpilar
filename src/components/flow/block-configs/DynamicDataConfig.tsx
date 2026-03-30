import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Info } from "lucide-react";
import { Bold, Italic, Smile, Code, Heading, List, ListOrdered, Link, Quote } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs: any;
  openVariablePicker: (ref: any) => void;
}

const RichTextToolbar = ({ onFormat }: { onFormat: (format: string) => void }) => (
  <div className="flex gap-1 mb-2 p-2 border rounded-md bg-muted/50">
    <Button variant="ghost" size="sm" onClick={() => onFormat('bold')} className="h-8 w-8 p-0">
      <Bold className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('italic')} className="h-8 w-8 p-0">
      <Italic className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('emoji')} className="h-8 w-8 p-0">
      <Smile className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('code')} className="h-8 w-8 p-0">
      <Code className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('heading')} className="h-8 w-8 p-0">
      <Heading className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('list')} className="h-8 w-8 p-0">
      <List className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('ordered')} className="h-8 w-8 p-0">
      <ListOrdered className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('link')} className="h-8 w-8 p-0">
      <Link className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('quote')} className="h-8 w-8 p-0">
      <Quote className="h-4 w-4" />
    </Button>
  </div>
);

export const DynamicDataConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const isObjects = config.arrayType === "OBJECTS";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Question text</Label>
        <Textarea
          ref={(el) => (inputRefs.current['question'] = el)}
          value={config.question || "What's your choice?"}
          onChange={(e) => handleConfigChange("question", e.target.value)}
          placeholder="What's your choice?"
          rows={2}
          className="resize-none"
        />
        <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => openVariablePicker(inputRefs.current['question'])}
          className="w-full"
        >
          usar variavel
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Select Array to iterate</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
          <Input
            value={config.arrayField || ""}
            onChange={(e) => handleConfigChange("arrayField", e.target.value)}
            placeholder="Type the name to search"
            className="pl-7"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>It's an Array of</Label>
        <div className="flex gap-2">
          <Button
            variant={!isObjects ? "default" : "outline"}
            className="flex-1"
            onClick={() => handleConfigChange("arrayType", "STRINGS")}
          >
            STRINGS
          </Button>
          <Button
            variant={isObjects ? "default" : "outline"}
            className="flex-1"
            onClick={() => handleConfigChange("arrayType", "OBJECTS")}
          >
            OBJECTS
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-foreground">
            Salvar resposta do usuário no campo
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </Label>
        </div>
        <div className="relative">
          <Input
            value={config.variable || "resposta_dinamica"}
            onChange={(e) => handleConfigChange("variable", e.target.value)}
            placeholder="resposta_dinamica"
            className="bg-white border-border text-foreground"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary/10 text-primary text-xs px-2 py-1 rounded">
            T
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox 
          id="saveArrayIndex"
          checked={config.saveArrayIndex || false}
          onCheckedChange={(checked) => handleConfigChange("saveArrayIndex", checked)}
        />
        <Label htmlFor="saveArrayIndex" className="font-normal cursor-pointer">
          Salvar índice do array
        </Label>
      </div>

      <div className="bg-primary/5 rounded-lg p-4 flex gap-3 border border-primary/20">
        <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground/80">
          Este bloco itera sobre um array e coleta respostas dinâmicas do usuário, salvando cada resposta e opcionalmente seu índice nos campos especificados.
        </p>
      </div>
    </div>
  );
};
