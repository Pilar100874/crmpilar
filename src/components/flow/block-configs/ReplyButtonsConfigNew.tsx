import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Info, Plus, GripVertical, Trash2 } from "lucide-react";
import { Bold, Italic } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const ReplyButtonsConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  const buttons = config.buttons || [];

  const addButton = () => {
    handleConfigChange("buttons", [
      ...buttons,
      { id: Date.now(), label: "Button" }
    ]);
  };

  const removeButton = (index: number) => {
    const newButtons = buttons.filter((_: any, i: number) => i !== index);
    handleConfigChange("buttons", newButtons);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Header (optional)</Label>
        <Textarea
          value={config.header || ""}
          onChange={(e) => handleConfigChange("header", e.target.value)}
          placeholder="Max. 20 characters"
          rows={3}
          maxLength={20}
        />
      </div>

      <div className="space-y-2">
        <Label>Text (max. 1024 characters)</Label>
        <Textarea
          value={config.text || ""}
          onChange={(e) => handleConfigChange("text", e.target.value)}
          placeholder="Text body"
          rows={3}
          maxLength={1024}
        />
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-auto">
            Use field
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Footer (optional)</Label>
        <Textarea
          value={config.footer || ""}
          onChange={(e) => handleConfigChange("footer", e.target.value)}
          placeholder="Max. 60 characters"
          rows={3}
          maxLength={60}
        />
      </div>

      <div className="space-y-3">
        <Label>Buttons (up to 3)</Label>
        
        {buttons.map((button: any, index: number) => (
          <div key={button.id || index} className="flex items-center gap-2 bg-pink-500 text-white p-3 rounded">
            <span>{button.label}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-auto h-6 w-6 text-white hover:bg-pink-600"
            >
              <GripVertical className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-white hover:bg-pink-600"
              onClick={() => removeButton(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button 
          variant="default" 
          size="lg" 
          onClick={addButton}
          className="w-full bg-slate-700 hover:bg-slate-800 text-white"
          disabled={buttons.length >= 3}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add another button
        </Button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
        <span className="text-xl">⚠️</span>
        <div className="text-sm space-y-1">
          <p className="font-semibold">Button's text restrictions</p>
          <p>- Buttons: max. 20 characters</p>
          <p>- Formatted text not allowed in buttons (example *this* for bold)</p>
          <p>- Body text: max. 1024 characters. If you use fields, the content of the field will count as additional characters and the text will be truncated.</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            Save user answer in the field
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </Label>
        </div>
        <Input
          value={config.variable || ""}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="Search or create"
          className="bg-accent/50"
        />
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          ⚠️ If a field is not set, the answer won't be saved.
        </p>
      </div>
    </div>
  );
};
