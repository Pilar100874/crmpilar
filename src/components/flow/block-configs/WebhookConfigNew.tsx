import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Info, Plus } from "lucide-react";
import { VariableInput } from "@/components/flow/VariableInput";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs?: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement | null }>;
  openVariablePicker?: (ref: HTMLInputElement | HTMLTextAreaElement) => void;
}

export const WebhookConfigNew = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const testFields = config.testFields || [];

  const addTestField = () => {
    handleConfigChange("testFields", [
      ...testFields,
      { name: "", value: "" }
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>URL & Method</Label>
          <Button variant="default" size="sm" className="bg-pink-500 hover:bg-pink-600">
            Set Domain Fields
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="flex items-center gap-2">
              Select the method and type the url
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </Label>
          </div>
          
          <div className="flex gap-2">
            <Select value={config.method || "POST"} onValueChange={(v) => handleConfigChange("method", v)}>
              <SelectTrigger className="w-32 bg-blue-600 text-white border-blue-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
            
            <VariableInput
              ref={(el) => inputRefs && (inputRefs.current['url'] = el)}
              value={config.url || ""}
              onChange={(e) => handleConfigChange("url", e.target.value)}
              onVariableRequest={() => inputRefs?.current['url'] && openVariablePicker?.(inputRefs.current['url'])}
              placeholder="https://"
              className="flex-1"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1">
              DOMAIN FIELDS
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => inputRefs?.current['url'] && openVariablePicker?.(inputRefs.current['url'])}
            >
              Use field
            </Button>
            <Button variant="ghost" size="icon">
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Send Params</Label>
          <Switch 
            checked={config.sendParams || false}
            onCheckedChange={(checked) => handleConfigChange("sendParams", checked)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Attach parameters to the end of request URL (example: ?email=elon@tesla.com)
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Customize Headers</Label>
          <Switch 
            checked={config.customHeaders || false}
            onCheckedChange={(checked) => handleConfigChange("customHeaders", checked)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Add headers to your request (example: Content-Type: application/json)
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Customize Body</Label>
          <Switch 
            checked={config.customBody || false}
            onCheckedChange={(checked) => handleConfigChange("customBody", checked)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Test Your Request</Label>
          <Switch 
            checked={config.enableTest || false}
            onCheckedChange={(checked) => handleConfigChange("enableTest", checked)}
          />
        </div>

        {config.enableTest && (
          <div className="space-y-3">
            <Label className="text-sm">Manually set values for test fields</Label>
            <p className="text-xs text-muted-foreground">
              If your request contains fields, you can manually set their values for testing purpose.
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
              Test the request
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Save Responses as Fields</Label>
          <Switch 
            checked={config.saveResponses || false}
            onCheckedChange={(checked) => handleConfigChange("saveResponses", checked)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Response Routing</Label>
          <Switch 
            checked={config.responseRouting || false}
            onCheckedChange={(checked) => handleConfigChange("responseRouting", checked)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Split your flow based on response status codes (200, 400, 500, etc)
        </p>
      </div>
    </div>
  );
};
