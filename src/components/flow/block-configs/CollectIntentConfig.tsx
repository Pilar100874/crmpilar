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
          <Label className="flex items-center gap-2 text-slate-900">
            Save user answer in the field
            <Info className="h-4 w-4 text-slate-500 cursor-help" />
          </Label>
        </div>
        <div className="relative">
          <Input
            value={config.variable || "user_input"}
            onChange={(e) => handleConfigChange("variable", e.target.value)}
            placeholder="user_input"
            className="bg-white border-slate-200 text-slate-900"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
            T
          </span>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 flex gap-3 border border-blue-200">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-slate-700">
          Collect intent gather information from a user and store the answer in a field so you can use it later.
        </p>
      </div>
    </div>
  );
};
