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

export const ListButtonsConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  const sections = config.sections || [];

  const addSection = () => {
    handleConfigChange("sections", [
      ...sections,
      { id: Date.now(), title: "", items: [] }
    ]);
  };

  const addItem = (sectionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].items = [
      ...(newSections[sectionIndex].items || []),
      { id: Date.now(), label: "" }
    ];
    handleConfigChange("sections", newSections);
  };

  const updateSection = (index: number, field: string, value: any) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    handleConfigChange("sections", newSections);
  };

  const removeSection = (index: number) => {
    const newSections = sections.filter((_: any, i: number) => i !== index);
    handleConfigChange("sections", newSections);
  };

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].items = newSections[sectionIndex].items.filter(
      (_: any, i: number) => i !== itemIndex
    );
    handleConfigChange("sections", newSections);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Header (optional)</Label>
        <Textarea
          value={config.header || ""}
          onChange={(e) => handleConfigChange("header", e.target.value)}
          placeholder="Header"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Text (max. 1024 characters)</Label>
        <Textarea
          value={config.text || ""}
          onChange={(e) => handleConfigChange("text", e.target.value)}
          placeholder="Body"
          rows={3}
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
          placeholder="Footer"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>List header / CTA</Label>
        <Input
          value={config.listHeader || ""}
          onChange={(e) => handleConfigChange("listHeader", e.target.value)}
          placeholder="Menu"
        />
      </div>

      <div className="space-y-3">
        <Label>Sections & Items (Max. 10 items)</Label>
        
        {sections.map((section: any, sIndex: number) => (
          <div key={section.id || sIndex} className="space-y-2">
            <div className="flex items-center gap-2 bg-pink-500 text-white p-2 rounded">
              <span>Item {sIndex}</span>
              <Button variant="ghost" size="icon" className="ml-auto h-6 w-6">
                <GripVertical className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 bg-pink-500 text-white p-2 rounded">
              <span>Item {sIndex + 1}</span>
              <Button variant="ghost" size="icon" className="ml-auto h-6 w-6">
                <GripVertical className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        <Button 
          variant="default" 
          size="lg" 
          onClick={addSection}
          className="w-full bg-slate-700 hover:bg-slate-800 text-white"
        >
          Add new item
        </Button>

        <Button 
          variant="secondary" 
          size="lg" 
          onClick={addSection}
          className="w-full"
        >
          Add new section
        </Button>
      </div>
    </div>
  );
};
