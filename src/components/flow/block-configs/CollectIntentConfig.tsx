import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const CollectIntentConfig = ({ config, handleConfigChange }: ConfigProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-foreground">
            Save user answer in the field
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </Label>
        </div>
        <div className="relative">
          <Input
            value={config.variable || "user_input"}
            onChange={(e) => handleConfigChange("variable", e.target.value)}
            placeholder="user_input"
            className="bg-white border-border text-foreground"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary/10 text-primary text-xs px-2 py-1 rounded">
            T
          </span>
        </div>
      </div>

      <div className="bg-primary/5 rounded-lg p-4 flex gap-3 border border-primary/20">
        <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground/80">
          Collect intent gather information from a user and store the answer in a field so you can use it later.
        </p>
      </div>
    </div>
  );
};
