import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info, Plus, GripVertical, Trash2 } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const KeywordJumpConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  const keywords = config.keywords || [];

  const addKeyword = () => {
    handleConfigChange("keywords", [
      ...keywords,
      { id: Date.now(), text: "" }
    ]);
  };

  const removeKeyword = (index: number) => {
    const newKeywords = keywords.filter((_: any, i: number) => i !== index);
    handleConfigChange("keywords", newKeywords);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            Field to match with keywords
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

      <div className="space-y-3">
        {keywords.map((keyword: any, index: number) => (
          <div key={keyword.id || index} className="flex items-center gap-2 bg-pink-500 text-white p-3 rounded">
            <span className="flex-1">Click to edit</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-white hover:bg-pink-600"
            >
              <GripVertical className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-white hover:bg-pink-600"
              onClick={() => removeKeyword(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button 
          variant="default" 
          size="lg" 
          onClick={addKeyword}
          className="w-full bg-slate-700 hover:bg-slate-800 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add another keyword
        </Button>
      </div>
    </div>
  );
};
