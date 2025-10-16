import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const BotJumpConfig = ({ config, handleConfigChange }: ConfigProps) => {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-700">
        Select a bot you want to Jump To. You can point to a specific block, otherwise, it will jump to the starting point.
      </p>

      <div className="space-y-4">
        <Button 
          variant="secondary" 
          className="w-full h-auto py-4 text-base bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200"
          onClick={() => {
            // Open bot selector
            console.log('Open bot selector');
          }}
        >
          SELECT THE BOT
        </Button>

        <div className="space-y-3">
          <Label className="text-slate-900">Point to a specific block</Label>
          <RadioGroup
            value={config.pointToBlock ? "YES" : "NO"}
            onValueChange={(value) => handleConfigChange("pointToBlock", value === "YES")}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="NO" id="no" />
                <Label htmlFor="no" className="font-normal cursor-pointer text-slate-900">
                  NO
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="YES" id="yes" />
                <Label htmlFor="yes" className="font-normal cursor-pointer text-slate-900">
                  YES
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
};
