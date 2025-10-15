import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info, ChevronDown, Plus } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const GoalConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-4 flex gap-3">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm space-y-2">
          <p className="font-semibold">What is this feature for?</p>
          <p className="text-muted-foreground">
            With this block you'll be able to track the conversion of specific goals within the flows (for example: after a sale, or whenever you qualify a lead).
          </p>
          <p className="text-muted-foreground">
            You can see your goal metrics in the Analyze section.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Name your goal</Label>
        
        <div className="relative">
          <Input
            value={config.goalName || ""}
            onChange={(e) => handleConfigChange("goalName", e.target.value)}
            placeholder="e.g. Email collected"
            className="pr-10"
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create a new Goal
        </Button>
      </div>
    </div>
  );
};
