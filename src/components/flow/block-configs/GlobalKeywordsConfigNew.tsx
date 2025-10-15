import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Info } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const GlobalKeywordsConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  const keywords = config.keywords || [];

  const addKeyword = () => {
    handleConfigChange("keywords", [
      ...keywords,
      { id: Date.now(), text: "" }
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Add & set global keywords</Label>
        
        <Button 
          variant="default" 
          size="lg" 
          onClick={addKeyword}
          className="w-full bg-slate-700 hover:bg-slate-800 text-white h-auto py-4"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add another button
        </Button>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 flex gap-3">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Please follow the indications below when creating the keywords:</p>
          <ul className="space-y-1 ml-4">
            <li>- They cannot contain any space.</li>
            <li>- They can contain special characters.</li>
            <li>- They are key sensitive.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
