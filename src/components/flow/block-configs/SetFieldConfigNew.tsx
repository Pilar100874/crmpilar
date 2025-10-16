import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VariableInput, VariableTextarea } from "@/components/flow/VariableInput";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs?: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement | null }>;
  openVariablePicker?: (ref: HTMLInputElement | HTMLTextAreaElement) => void;
}

export const SetFieldConfigNew = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const mode = config.mode || "SET";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Switch mode</Label>
        <div className="flex gap-2">
          <Button
            variant={mode === "SET" ? "default" : "outline"}
            className="flex-1"
            onClick={() => handleConfigChange("mode", "SET")}
          >
            SET
          </Button>
          <Button
            variant={mode === "UNSET" ? "default" : "outline"}
            className="flex-1"
            onClick={() => handleConfigChange("mode", "UNSET")}
          >
            UNSET
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            Field to edit
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </Label>
        </div>
        <VariableInput
          ref={(el) => inputRefs && (inputRefs.current['field'] = el)}
          value={config.field || ""}
          onChange={(e) => handleConfigChange("field", e.target.value)}
          onVariableRequest={() => inputRefs?.current['field'] && openVariablePicker?.(inputRefs.current['field'])}
          placeholder="Search or create"
          className="bg-accent/50"
        />
      </div>

      {mode === "SET" && (
        <div className="space-y-2">
          <Label>Type the value</Label>
          <VariableTextarea
            ref={(el) => inputRefs && (inputRefs.current['value'] = el)}
            value={config.value || ""}
            onChange={(e) => handleConfigChange("value", e.target.value)}
            onVariableRequest={() => inputRefs?.current['value'] && openVariablePicker?.(inputRefs.current['value'])}
            placeholder="Value"
            rows={6}
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => inputRefs?.current['value'] && openVariablePicker?.(inputRefs.current['value'])}
          >
            Use field
          </Button>
        </div>
      )}
    </div>
  );
};
