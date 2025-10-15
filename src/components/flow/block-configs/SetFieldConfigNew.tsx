import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const SetFieldConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
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
        <Input
          value={config.field || ""}
          onChange={(e) => handleConfigChange("field", e.target.value)}
          placeholder="Search or create"
          className="bg-accent/50"
        />
      </div>

      {mode === "SET" && (
        <div className="space-y-2">
          <Label>Type the value</Label>
          <Textarea
            value={config.value || ""}
            onChange={(e) => handleConfigChange("value", e.target.value)}
            placeholder="Value"
            rows={6}
          />
          <Button variant="outline" size="sm" className="w-full">
            Use field
          </Button>
        </div>
      )}
    </div>
  );
};
