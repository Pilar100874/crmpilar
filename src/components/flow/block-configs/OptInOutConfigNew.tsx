import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Info, Plus, GripVertical, CheckCircle2 } from "lucide-react";
import { Bold, Italic } from "lucide-react";
import { VariableTextarea } from "@/components/flow/VariableInput";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs?: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement | null }>;
  openVariablePicker?: (ref: HTMLInputElement | HTMLTextAreaElement) => void;
}

export const OptInOutConfigNew = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Get new subscribers</h3>
        <p className="text-sm text-muted-foreground">
          Ask your users if they want to subscribe to your WhatsApp Business. If they choose Yes – or the button associated with the green output – they will be automatically added to your Subscribers list.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Header (optional)</Label>
        <VariableTextarea
          ref={(el) => inputRefs && (inputRefs.current['header'] = el)}
          value={config.header || "Subscribe!"}
          onChange={(e) => handleConfigChange("header", e.target.value)}
          onVariableRequest={() => inputRefs?.current['header'] && openVariablePicker?.(inputRefs.current['header'])}
          placeholder="Subscribe!"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Text</Label>
        <VariableTextarea
          ref={(el) => inputRefs && (inputRefs.current['text'] = el)}
          value={config.text || "Would you like to receive news & updates from us?"}
          onChange={(e) => handleConfigChange("text", e.target.value)}
          onVariableRequest={() => inputRefs?.current['text'] && openVariablePicker?.(inputRefs.current['text'])}
          placeholder="Would you like to receive news & updates from us?"
          rows={3}
        />
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Italic className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto"
            onClick={() => inputRefs?.current['text'] && openVariablePicker?.(inputRefs.current['text'])}
          >
            usar variavel
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Footer (optional)</Label>
        <VariableTextarea
          ref={(el) => inputRefs && (inputRefs.current['footer'] = el)}
          value={config.footer || "Choose Yes to confirm"}
          onChange={(e) => handleConfigChange("footer", e.target.value)}
          onVariableRequest={() => inputRefs?.current['footer'] && openVariablePicker?.(inputRefs.current['footer'])}
          placeholder="Choose Yes to confirm"
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <Label>Buttons</Label>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-pink-500 text-white p-3 rounded">
            <span>Yes</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-auto h-6 w-6 text-white hover:bg-pink-600"
            >
              <GripVertical className="h-4 w-4" />
            </Button>
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-pink-500 text-white p-3 rounded">
            <span>No</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-auto h-6 w-6 text-white hover:bg-pink-600"
            >
              <GripVertical className="h-4 w-4" />
            </Button>
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
              <div className="w-3 h-3 rounded-full border-2 border-border"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
