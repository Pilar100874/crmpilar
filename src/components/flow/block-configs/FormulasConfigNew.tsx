import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

const FormulaHelper = ({ category, items }: { category: string; items: string[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 hover:bg-muted/50 text-left"
      >
        <span className="text-sm font-medium">{category}</span>
        <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-2 space-y-1 bg-muted/30">
          {items.map((item, idx) => (
            <div key={idx} className="text-xs text-muted-foreground font-mono">
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const FormulasConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">1. Output</h3>
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
            ✓
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Pick the field where the result of the formula will be saved
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              value={config.outputField || "result"}
              onChange={(e) => handleConfigChange("outputField", e.target.value)}
              placeholder="result"
              className="pl-7"
            />
          </div>
          <Button variant="default" size="sm" className="bg-pink-500 hover:bg-pink-600">
            CREATE
          </Button>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Block outputs</Label>
          <div className="flex gap-2">
            <Badge variant="default" className="bg-blue-600">SUCCESS / ERROR</Badge>
            <Badge variant="outline">TRUE / FALSE</Badge>
            <Badge variant="outline">CUSTOM</Badge>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">2. Formula</h3>
          <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs"></div>
        </div>

        <div className="space-y-2">
          <Textarea
            value={config.formula || ""}
            onChange={(e) => handleConfigChange("formula", e.target.value)}
            placeholder="Type a formula or field"
            rows={3}
            className="bg-slate-800 text-white font-mono"
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-red-400">= Error</span>
            <Button variant="ghost" size="sm" className="text-xs">
              Test values ↓
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <FormulaHelper 
            category="Fields" 
            items={["@field_name", "@user_input", "@email"]} 
          />
          <FormulaHelper 
            category="Comparison" 
            items={["==", "!=", ">", "<", ">=", "<="]} 
          />
          <FormulaHelper 
            category="Logical" 
            items={["&&", "||", "!"]} 
          />
          <FormulaHelper 
            category="Date" 
            items={["now()", "today()", "addDays(date, n)"]} 
          />
          <FormulaHelper 
            category="Math" 
            items={["Sum(a, b)", "Subtract(a, b)", "Multiply(a, b)", "Divide(a, b)", "Round(n)"]} 
          />
          <FormulaHelper 
            category="String" 
            items={["concat(a, b)", "uppercase(str)", "lowercase(str)", "length(str)"]} 
          />
          <FormulaHelper 
            category="Array" 
            items={["length(arr)", "contains(arr, item)", "join(arr, separator)"]} 
          />
          <FormulaHelper 
            category="Object" 
            items={["get(obj, key)", "has(obj, key)"]} 
          />
          <FormulaHelper 
            category="Regex" 
            items={["test(pattern, str)", "match(pattern, str)"]} 
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold">Tips:</p>
              <p>- Formulas are case sensitive → Sum(...) ✓ SUM(...) ✗</p>
              <p>- System fields and static text need quotes → "@today" ✓</p>
              <p>- You can combine different functions → Sum(2, Sum(4, 2)) ✓</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
