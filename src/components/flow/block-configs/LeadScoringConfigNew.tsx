import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info, Plus } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const LeadScoringConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  const ruleGroups = config.ruleGroups || [];

  const addRuleGroup = () => {
    handleConfigChange("ruleGroups", [
      ...ruleGroups,
      { id: Date.now(), field: "" }
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold">Save Score As</h3>
        <p className="text-sm text-muted-foreground">
          Choose the field you would like to save the final score as
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              value={config.scoreField || "score"}
              onChange={(e) => handleConfigChange("scoreField", e.target.value)}
              placeholder="score"
              className="pl-7"
            />
          </div>
          <Button variant="default" size="sm" className="bg-pink-500 hover:bg-pink-600">
            CREATE
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          The field format must be NUMBER
        </p>
      </div>

      <div className="space-y-4 border-t pt-4">
        {ruleGroups.map((group: any, index: number) => (
          <div key={group.id || index} className="space-y-3">
            <h3 className="font-semibold">Rule group #{index + 1}</h3>
            <p className="text-sm text-muted-foreground">
              Choose a field to create scoring rules for
            </p>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">IF @</span>
              <Input
                value={group.field || ""}
                onChange={(e) => {
                  const newGroups = [...ruleGroups];
                  newGroups[index].field = e.target.value;
                  handleConfigChange("ruleGroups", newGroups);
                }}
                placeholder="Type or select the field"
                className="pl-12"
              />
            </div>
          </div>
        ))}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={addRuleGroup}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 flex gap-3">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground space-y-3">
          <div>
            <p className="font-semibold text-foreground">How can lead scoring be used?</p>
            <p>
              Lead scoring is a popular method used by marketing teams to prioritize leads based on actions or attributes.{" "}
              <a href="#" className="text-pink-500 hover:underline">Click here to learn more</a>.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Why is there a "Failed" output for this block?</p>
            <p>
              In some rare cases (for example: wrongly formatted conditions), the score calculation might fail. Although it's unlikely to happen, we recommend setting up a failed path to avoid a dead end.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
