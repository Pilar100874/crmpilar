import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info, Plus, ExternalLink } from "lucide-react";
import { VariableInput } from "@/components/flow/VariableInput";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs?: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement | null }>;
  openVariablePicker?: (ref: HTMLInputElement | HTMLTextAreaElement) => void;
}

const IntegrationButton = ({ name, icon, url }: { name: string; icon: string; url: string }) => (
  <Button 
    variant="outline" 
    className="w-full justify-between h-auto py-3"
    onClick={() => window.open(url, '_blank')}
  >
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 flex items-center justify-center">
        <span className="text-xl">{icon}</span>
      </div>
      <span>{name}</span>
    </div>
    <ExternalLink className="h-4 w-4" />
  </Button>
);

export const TriggerAutomationConfigNew = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const testFields = config.testFields || [];

  const addTestField = () => {
    handleConfigChange("testFields", [
      ...testFields,
      { name: "", value: "" }
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Learn how to use it with</Label>
        
        <IntegrationButton 
          name="Zapier" 
          icon="⚡" 
          url="https://zapier.com"
        />
        <IntegrationButton 
          name="Make" 
          icon="🔧" 
          url="https://make.com"
        />
        <IntegrationButton 
          name="Pipedream" 
          icon="🔷" 
          url="https://pipedream.com"
        />
        <IntegrationButton 
          name="n8n" 
          icon="🔗" 
          url="https://n8n.io"
        />
      </div>

      <div className="space-y-4 pt-4 border-t">
        <Label>Paste the Webhook URL</Label>
        <p className="text-xs text-muted-foreground">
          Paste here the Webhook url provided by the webhook trigger in your automation platform
        </p>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700"
            >
              POST
            </Button>
            <VariableInput
              ref={(el) => inputRefs && (inputRefs.current['webhookUrl'] = el)}
              value={config.webhookUrl || ""}
              onChange={(e) => handleConfigChange("webhookUrl", e.target.value)}
              onVariableRequest={() => inputRefs?.current['webhookUrl'] && openVariablePicker?.(inputRefs.current['webhookUrl'])}
              placeholder="https://"
            />
          </div>
          
          <div className="bg-muted/50 p-2 rounded">
            <p className="text-xs text-muted-foreground">
              PREVIEW URL
            </p>
            <p className="text-xs font-mono">{config.webhookUrl || "https://"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Set data (fields) to be sent</Label>
        <p className="text-sm font-medium">Manually set test values for fields</p>
        <p className="text-xs text-muted-foreground">
          Use the inputs below to set up the fields data that you want to send. The "Test value" will be used only in the test to help you set up your webhook trigger.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Label className="text-xs">Field Name</Label>
          <Label className="text-xs">Test Value</Label>
        </div>

        {testFields.map((field: any, index: number) => (
          <div key={index} className="grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                value={field.name}
                onChange={(e) => {
                  const newFields = [...testFields];
                  newFields[index].name = e.target.value;
                  handleConfigChange("testFields", newFields);
                }}
                placeholder="Search fields"
                className="pl-7"
              />
            </div>
            <Input
              value={field.value}
              onChange={(e) => {
                const newFields = [...testFields];
                newFields[index].value = e.target.value;
                handleConfigChange("testFields", newFields);
              }}
            />
          </div>
        ))}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={addTestField}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>

        <Button 
          variant="default" 
          size="lg" 
          className="w-full bg-pink-500 hover:bg-pink-600"
        >
          Test webhook trigger
        </Button>
      </div>
    </div>
  );
};
