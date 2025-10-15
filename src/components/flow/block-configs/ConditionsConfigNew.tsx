import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Plus } from "lucide-react";
import { useState } from "react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const ConditionsConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  const conditions = config.conditions || [];

  const addCondition = () => {
    handleConfigChange("conditions", [
      ...conditions,
      { field: "", operator: "EQUAL TO", value: "" }
    ]);
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    handleConfigChange("conditions", newConditions);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Set the condition(s)</Label>
        
        {conditions.map((condition: any, index: number) => (
          <div key={index} className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Input
                value={condition.field || ""}
                onChange={(e) => updateCondition(index, "field", e.target.value)}
                placeholder="Type or select the field"
                className="border-2"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-red-500 font-bold">IF</span>
                <span>@</span>
              </div>
            </div>

            <Select
              value={condition.operator || "EQUAL TO"}
              onValueChange={(v) => updateCondition(index, "operator", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EQUAL TO">EQUAL TO</SelectItem>
                <SelectItem value="NOT EQUAL TO">NOT EQUAL TO</SelectItem>
                <SelectItem value="CONTAINS">CONTAINS</SelectItem>
                <SelectItem value="NOT CONTAINS">NOT CONTAINS</SelectItem>
                <SelectItem value="GREATER THAN">GREATER THAN</SelectItem>
                <SelectItem value="LESS THAN">LESS THAN</SelectItem>
                <SelectItem value="IS SET">IS SET</SelectItem>
                <SelectItem value="IS NOT SET">IS NOT SET</SelectItem>
              </SelectContent>
            </Select>

            {condition.operator !== "IS SET" && condition.operator !== "IS NOT SET" && (
              <div className="space-y-2">
                <Input
                  value={condition.value || ""}
                  onChange={(e) => updateCondition(index, "value", e.target.value)}
                  placeholder="Type a value or select a field"
                />
                <Button variant="outline" size="sm" className="w-full">
                  Use field
                </Button>
              </div>
            )}
          </div>
        ))}

        <Button 
          variant="default" 
          size="lg" 
          onClick={addCondition}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
        </Button>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 flex gap-3">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Conditional allows you to split the flow based on conditions.</p>
          <p>Example: if the answer of an email question (saved in the field @email) 'CONTAINS' the text 'gmail'.</p>
          <p>Each Conditional block has two outputs, one green and one red.</p>
          <p>The green represents that the condition 'is true' (in the example above, the @email contains 'gmail'), and the red that condition 'is false'.</p>
        </div>
      </div>
    </div>
  );
};
