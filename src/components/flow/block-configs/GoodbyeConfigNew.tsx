import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bold, Italic, Smile, Code, Heading, List, ListOrdered, Link, Quote } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs: any;
  openVariablePicker: (ref: any) => void;
}

const RichTextToolbar = ({ onFormat }: { onFormat: (format: string) => void }) => (
  <div className="flex gap-1 mb-2 p-2 border rounded-md bg-muted/50">
    <Button variant="ghost" size="sm" onClick={() => onFormat('bold')} className="h-8 w-8 p-0">
      <Bold className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('italic')} className="h-8 w-8 p-0">
      <Italic className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('emoji')} className="h-8 w-8 p-0">
      <Smile className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('code')} className="h-8 w-8 p-0">
      <Code className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('heading')} className="h-8 w-8 p-0">
      <Heading className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('list')} className="h-8 w-8 p-0">
      <List className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('ordered')} className="h-8 w-8 p-0">
      <ListOrdered className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('link')} className="h-8 w-8 p-0">
      <Link className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('quote')} className="h-8 w-8 p-0">
      <Quote className="h-4 w-4" />
    </Button>
  </div>
);

export const GoodbyeConfigNew = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Type here your goodbye message</Label>
        <Textarea
          ref={(el) => (inputRefs.current['message'] = el)}
          value={config.message || "Goodbye message"}
          onChange={(e) => handleConfigChange("message", e.target.value)}
          placeholder="Goodbye message"
          rows={4}
          className="resize-none"
        />
        <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => openVariablePicker(inputRefs.current['message'])}
          className="w-full"
        >
          Use field
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Start again button</Label>
          <Switch 
            checked={config.showStartAgainButton !== false}
            onCheckedChange={(checked) => handleConfigChange("showStartAgainButton", checked)}
          />
        </div>
        <p className="text-xs text-muted-foreground italic">
          This will provide buttons to start again the conversation (going back to the first flow message)
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Mostrar Botões Sociais</Label>
          <Switch 
            checked={config.showSocialButtons === true}
            onCheckedChange={(checked) => handleConfigChange("showSocialButtons", checked)}
          />
        </div>
        <p className="text-xs text-muted-foreground italic">
          Exibe botões com links das redes sociais configuradas
        </p>
        
        {config.showSocialButtons && (
          <div className="ml-4 mt-3 space-y-2 border-l-2 border-muted pl-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">WhatsApp</Label>
              <Switch 
                checked={config.socialWhatsApp === true}
                onCheckedChange={(checked) => handleConfigChange("socialWhatsApp", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Instagram</Label>
              <Switch 
                checked={config.socialInstagram === true}
                onCheckedChange={(checked) => handleConfigChange("socialInstagram", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Facebook</Label>
              <Switch 
                checked={config.socialFacebook === true}
                onCheckedChange={(checked) => handleConfigChange("socialFacebook", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Website</Label>
              <Switch 
                checked={config.socialWebsite === true}
                onCheckedChange={(checked) => handleConfigChange("socialWebsite", checked)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
