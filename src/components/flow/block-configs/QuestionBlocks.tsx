import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Bold, Italic, Smile, Code, Heading, List, ListOrdered, Link, Quote, Info } from "lucide-react";

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

export const AskNameConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Question text</Label>
      <Textarea
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "What's your name?"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        placeholder="What's your name?"
        rows={2}
        className="resize-none"
      />
      <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => openVariablePicker(inputRefs.current['question'])}
        className="w-full"
      >
        Use field
      </Button>
    </div>

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          Save user answer in the field
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        </Label>
      </div>
      <Input
        value={config.variable || "name"}
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

export const AskQuestionConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const [showSettings, setShowSettings] = useState(true);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Question text</Label>
        <Textarea
          ref={(el) => (inputRefs.current['question'] = el)}
          value={config.question || "Ask anything"}
          onChange={(e) => handleConfigChange("question", e.target.value)}
          placeholder="Ask anything"
          rows={2}
          className="resize-none"
        />
        <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => openVariablePicker(inputRefs.current['question'])}
          className="w-full"
        >
          Use field
        </Button>
      </div>

      <div className="flex items-center justify-between py-2">
        <Label>Settings</Label>
        <Switch checked={showSettings} onCheckedChange={setShowSettings} />
      </div>

      {showSettings && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min. characters</Label>
              <Input
                type="number"
                value={config.minChars || 0}
                onChange={(e) => handleConfigChange("minChars", parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Max. characters</Label>
              <Input
                type="number"
                value={config.maxChars || 99999}
                onChange={(e) => handleConfigChange("maxChars", parseInt(e.target.value) || 99999)}
                placeholder="99999"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Regex pattern</Label>
            <Input
              value={config.validation || ""}
              onChange={(e) => handleConfigChange("validation", e.target.value)}
              placeholder=""
            />
          </div>

          <div className="space-y-2">
            <Label>Validation error message</Label>
            <Textarea
              value={config.errorMessage || "I'm afraid I didn't understand, could you try again, please?"}
              onChange={(e) => handleConfigChange("errorMessage", e.target.value)}
              placeholder="I'm afraid I didn't understand, could you try again, please?"
              rows={2}
              className="resize-none"
            />
          </div>
        </>
      )}

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

export const AskEmailConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Question text</Label>
      <Textarea
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "What's your email?"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        placeholder="What's your email?"
        rows={2}
        className="resize-none"
      />
      <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => openVariablePicker(inputRefs.current['question'])}
        className="w-full"
      >
        Use field
      </Button>
    </div>

    <div className="space-y-2">
      <Label>Validation error message</Label>
      <Textarea
        value={config.errorMessage || "I'm afraid I didn't understand, could you try again, please?"}
        onChange={(e) => handleConfigChange("errorMessage", e.target.value)}
        placeholder="I'm afraid I didn't understand, could you try again, please?"
        rows={2}
        className="resize-none"
      />
      <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => openVariablePicker(inputRefs.current['errorMessage'])}
        className="w-full"
      >
        Use field
      </Button>
    </div>

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          Save user answer in the field
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        </Label>
      </div>
      <div className="relative">
        <Input
          value={config.variable || "email"}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="email"
          className="bg-red-50 border-red-200"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded">
          T
        </span>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        ⚠️ If a field is not set, the answer won't be saved.
      </p>
    </div>
  </div>
);

export const AskNumberConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const [showSettings, setShowSettings] = useState(true);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Question text</Label>
        <Textarea
          ref={(el) => (inputRefs.current['question'] = el)}
          value={config.question || "Type a number, please"}
          onChange={(e) => handleConfigChange("question", e.target.value)}
          placeholder="Type a number, please"
          rows={2}
          className="resize-none"
        />
        <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => openVariablePicker(inputRefs.current['question'])}
          className="w-full"
        >
          Use field
        </Button>
      </div>

      <div className="flex items-center justify-between py-2">
        <Label>Settings</Label>
        <Switch checked={showSettings} onCheckedChange={setShowSettings} />
      </div>

      {showSettings && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={config.format || "Auto"} onValueChange={(v) => handleConfigChange("format", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Auto">Auto</SelectItem>
                  <SelectItem value="Integer">Integer</SelectItem>
                  <SelectItem value="Decimal">Decimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Add a prefix</Label>
              <Input
                value={config.prefix || ""}
                onChange={(e) => handleConfigChange("prefix", e.target.value)}
                placeholder="Examples: $, %"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min. value</Label>
              <Input
                type="number"
                value={config.min || 0}
                onChange={(e) => handleConfigChange("min", parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Max. value</Label>
              <Input
                type="number"
                value={config.max || 99999}
                onChange={(e) => handleConfigChange("max", parseFloat(e.target.value) || 99999)}
                placeholder="99999"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Validation error message</Label>
            <Textarea
              value={config.errorMessage || "I'm afraid I didn't understand, could you try again, please?"}
              onChange={(e) => handleConfigChange("errorMessage", e.target.value)}
              placeholder="I'm afraid I didn't understand, could you try again, please?"
              rows={2}
              className="resize-none"
            />
            <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => openVariablePicker(inputRefs.current['errorMessage'])}
              className="w-full"
            >
              Use field
            </Button>
          </div>
        </>
      )}

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

export const AskPhoneConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Question text</Label>
      <Textarea
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "What's your phone number?"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        placeholder="What's your phone number?"
        rows={2}
        className="resize-none"
      />
      <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => openVariablePicker(inputRefs.current['question'])}
        className="w-full"
      >
        Use field
      </Button>
    </div>

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          Save user answer in the field
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        </Label>
      </div>
      <Input
        value={config.variable || "phone"}
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

export const AskDateConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Question text</Label>
      <Textarea
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "Select a date, please"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        placeholder="Select a date, please"
        rows={2}
        className="resize-none"
      />
      <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => openVariablePicker(inputRefs.current['question'])}
        className="w-full"
      >
        Use field
      </Button>
    </div>

    <div className="space-y-2">
      <Label>Format to save the date</Label>
      <Select 
        value={config.dateFormat || "YYYY/MM/DD - 2025/10/15"} 
        onValueChange={(v) => handleConfigChange("dateFormat", v)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="YYYY/MM/DD - 2025/10/15">YYYY/MM/DD - 2025/10/15</SelectItem>
          <SelectItem value="DD/MM/YYYY - 15/10/2025">DD/MM/YYYY - 15/10/2025</SelectItem>
          <SelectItem value="MM/DD/YYYY - 10/15/2025">MM/DD/YYYY - 10/15/2025</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="flex items-center gap-2">
      <Checkbox 
        id="showDatePicker"
        checked={config.showDatePicker !== false}
        onCheckedChange={(checked) => handleConfigChange("showDatePicker", checked)}
      />
      <Label htmlFor="showDatePicker">Show date picker</Label>
    </div>

    <div className="space-y-2">
      <Label>Set available dates</Label>
      <Select 
        value={config.availableDates || "All"} 
        onValueChange={(v) => handleConfigChange("availableDates", v)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All</SelectItem>
          <SelectItem value="Future">Future only</SelectItem>
          <SelectItem value="Past">Past only</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label>Disable specific days</Label>
      <div className="flex gap-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
          const disabledDays = config.disabledDays || [];
          const isDisabled = disabledDays.includes(idx);
          return (
            <Button
              key={idx}
              variant={isDisabled ? "default" : "outline"}
              size="icon"
              className="w-10 h-10 rounded-full"
              onClick={() => {
                const newDisabled = isDisabled
                  ? disabledDays.filter((d: number) => d !== idx)
                  : [...disabledDays, idx];
                handleConfigChange("disabledDays", newDisabled);
              }}
            >
              {day}
            </Button>
          );
        })}
      </div>
    </div>

    <div className="space-y-2">
      <Label>Validation error message</Label>
      <Textarea
        value={config.errorMessage || "I'm afraid I didn't understand, could you try again, please?"}
        onChange={(e) => handleConfigChange("errorMessage", e.target.value)}
        placeholder="I'm afraid I didn't understand, could you try again, please?"
        rows={2}
        className="resize-none"
      />
      <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => openVariablePicker(inputRefs.current['errorMessage'])}
        className="w-full"
      >
        Use field
      </Button>
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

export const AskFileConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Question text</Label>
      <Textarea
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "File upload"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        placeholder="File upload"
        rows={2}
        className="resize-none"
      />
      <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => openVariablePicker(inputRefs.current['question'])}
        className="w-full"
      >
        Use field
      </Button>
    </div>

    <div className="space-y-2">
      <Label>Validation error message</Label>
      <Textarea
        value={config.errorMessage || "I'm afraid I didn't understand, could you try again, please?"}
        onChange={(e) => handleConfigChange("errorMessage", e.target.value)}
        placeholder="I'm afraid I didn't understand, could you try again, please?"
        rows={2}
        className="resize-none"
      />
      <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => openVariablePicker(inputRefs.current['errorMessage'])}
        className="w-full"
      >
        Use field
      </Button>
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

export const AskAddressConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Question text</Label>
      <Textarea
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "Type your address, please"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        placeholder="Type your address, please"
        rows={2}
        className="resize-none"
      />
      <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => openVariablePicker(inputRefs.current['question'])}
        className="w-full"
      >
        Use field
      </Button>
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

export const AskUrlConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Question text</Label>
      <Textarea
        ref={(el) => (inputRefs.current['question'] = el)}
        value={config.question || "Type a Url"}
        onChange={(e) => handleConfigChange("question", e.target.value)}
        placeholder="Type a Url"
        rows={2}
        className="resize-none"
      />
      <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => openVariablePicker(inputRefs.current['question'])}
        className="w-full"
      >
        Use field
      </Button>
    </div>

    <div className="space-y-2">
      <Label>Validation error message</Label>
      <Textarea
        value={config.errorMessage || "I'm afraid I didn't understand, could you try again, please?"}
        onChange={(e) => handleConfigChange("errorMessage", e.target.value)}
        placeholder="I'm afraid I didn't understand, could you try again, please?"
        rows={2}
        className="resize-none"
      />
      <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => openVariablePicker(inputRefs.current['errorMessage'])}
        className="w-full"
      >
        Use field
      </Button>
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
