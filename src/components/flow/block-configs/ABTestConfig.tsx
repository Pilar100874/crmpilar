import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Info } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const ABTestConfig = ({ config, handleConfigChange }: ConfigProps) => {
  const splitPercentage = config.splitPercentage || 50;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Define AB split percentage</Label>
        
        <div className="relative px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-pink-500 text-white flex items-center justify-center font-bold">
                A
              </div>
              <span className="font-semibold">{splitPercentage}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{100 - splitPercentage}%</span>
              <div className="w-8 h-8 rounded bg-pink-500 text-white flex items-center justify-center font-bold">
                B
              </div>
            </div>
          </div>

          <div className="relative">
            <Slider
              value={[splitPercentage]}
              onValueChange={(value) => handleConfigChange("splitPercentage", value[0])}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0</span>
              <span>20</span>
              <span>40</span>
              <span>60</span>
              <span>80</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 flex gap-3">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Experiment by splitting your users into two groups (A/B) and find out which path converts better.
        </p>
      </div>
    </div>
  );
};
