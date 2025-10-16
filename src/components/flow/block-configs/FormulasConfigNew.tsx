import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, ChevronRight, ChevronDown, Lock, Calendar, Hash, Type, AtSign, Globe } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

const FieldIcon = ({ type, locked }: { type: string; locked?: boolean }) => {
  const iconClass = "w-4 h-4";
  const wrapperClass = "w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold";
  
  switch (type) {
    case "id":
      return <div className={cn(wrapperClass, "bg-blue-500")}>B</div>;
    case "text":
      return <div className={cn(wrapperClass, "bg-pink-500")}>T</div>;
    case "date":
      return <Calendar className={iconClass} />;
    case "number":
      return <Hash className={iconClass} />;
    case "logic":
      return <div className={cn(wrapperClass, "bg-purple-500")}>f(x)</div>;
    default:
      return <Type className={iconClass} />;
  }
};

const FieldItem = ({ 
  name, 
  type = "text", 
  locked = false,
  onClick 
}: { 
  name: string; 
  type?: string; 
  locked?: boolean;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 text-left text-sm group"
  >
    <FieldIcon type={type} locked={locked} />
    <span className="flex-1">{name}</span>
    {locked && <Lock className="w-3 h-3 text-muted-foreground" />}
  </button>
);

const CategorySection = ({ 
  title, 
  children,
  defaultOpen = false 
}: { 
  title: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 text-left font-medium"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span className="text-sm">{title}</span>
      </button>
      {isOpen && <div className="py-1">{children}</div>}
    </div>
  );
};

export const FormulasConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  const insertField = (field: string) => {
    const currentFormula = config.formula || "";
    handleConfigChange("formula", currentFormula + field);
  };

  return (
    <div className="space-y-4">
      {/* Output Section */}
      <div className="space-y-3 pb-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">1. Output</h3>
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
            ✓
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Pick the field where the result of the formula will be saved
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              value={config.outputField || "result"}
              onChange={(e) => handleConfigChange("outputField", e.target.value)}
              placeholder="result"
              className="pl-7"
            />
          </div>
          <Button variant="default" size="sm" className="bg-pink-500 hover:bg-pink-600">
            CREATE
          </Button>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Block outputs</Label>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="default" className="bg-blue-600">SUCCESS / ERROR</Badge>
            <Badge variant="outline">TRUE / FALSE</Badge>
            <Badge variant="outline">CUSTOM</Badge>
          </div>
        </div>
      </div>

      {/* Formula Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">2. Formula</h3>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-5 gap-3 min-h-[400px]">
          {/* Left Sidebar - Fields */}
          <div className="col-span-2 border rounded-lg overflow-hidden bg-muted/20">
            <ScrollArea className="h-[400px]">
              <CategorySection title="Fields" defaultOpen={true}>
                <div className="space-y-0.5">
                  <div className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted/30">
                    Lead data
                  </div>
                  <FieldItem name="ID" type="id" onClick={() => insertField("@id")} />
                  <FieldItem name="Name" type="text" onClick={() => insertField("@name")} />
                  <FieldItem name="Email" type="text" onClick={() => insertField("@email")} />
                  <FieldItem name="Company" type="text" onClick={() => insertField("@company")} />
                  <FieldItem name="Phone" type="text" onClick={() => insertField("@phone")} />
                  <FieldItem name="API Payload" type="text" locked onClick={() => insertField("@api_payload")} />
                  
                  <div className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted/30">
                    Usage details
                  </div>
                  <FieldItem name="Chat transcriptio" type="text" onClick={() => insertField("@chat_transcript")} />
                  <FieldItem name="Agents online" type="id" locked onClick={() => insertField("@agents_online")} />
                  <FieldItem name="Last seen" type="date" locked onClick={() => insertField("@last_seen")} />
                  <FieldItem name="Created" type="date" locked onClick={() => insertField("@created")} />
                  <FieldItem name="url" type="text" onClick={() => insertField("@url")} />
                  <FieldItem name="country" type="text" onClick={() => insertField("@country")} />
                  <FieldItem name="Browser" type="text" locked onClick={() => insertField("@browser")} />
                  <FieldItem name="Device" type="text" locked onClick={() => insertField("@device")} />
                  <FieldItem name="OS" type="text" locked onClick={() => insertField("@os")} />
                </div>
              </CategorySection>

              <CategorySection title="Custom fields">
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                  No custom fields
                </div>
              </CategorySection>

              <CategorySection title="Time references">
                <FieldItem name="now()" type="date" onClick={() => insertField("now()")} />
                <FieldItem name="today()" type="date" onClick={() => insertField("today()")} />
              </CategorySection>

              <CategorySection title="Comparison">
                <FieldItem name="==" type="logic" onClick={() => insertField(" == ")} />
                <FieldItem name="!=" type="logic" onClick={() => insertField(" != ")} />
                <FieldItem name=">" type="logic" onClick={() => insertField(" > ")} />
                <FieldItem name="<" type="logic" onClick={() => insertField(" < ")} />
                <FieldItem name=">=" type="logic" onClick={() => insertField(" >= ")} />
                <FieldItem name="<=" type="logic" onClick={() => insertField(" <= ")} />
              </CategorySection>

              <CategorySection title="Logical">
                <FieldItem name="And" type="logic" onClick={() => insertField("And()")} />
                <FieldItem name="If" type="logic" onClick={() => insertField("If()")} />
                <FieldItem name="Not" type="logic" onClick={() => insertField("Not()")} />
                <FieldItem name="Or" type="logic" onClick={() => insertField("Or()")} />
              </CategorySection>

              <CategorySection title="Date">
                <FieldItem name="addDays(date, n)" type="date" onClick={() => insertField("addDays()")} />
                <FieldItem name="subtractDays(date, n)" type="date" onClick={() => insertField("subtractDays()")} />
                <FieldItem name="formatDate(date, format)" type="date" onClick={() => insertField("formatDate()")} />
              </CategorySection>

              <CategorySection title="Math">
                <FieldItem name="Sum(a, b)" type="number" onClick={() => insertField("Sum()")} />
                <FieldItem name="Subtract(a, b)" type="number" onClick={() => insertField("Subtract()")} />
                <FieldItem name="Multiply(a, b)" type="number" onClick={() => insertField("Multiply()")} />
                <FieldItem name="Divide(a, b)" type="number" onClick={() => insertField("Divide()")} />
                <FieldItem name="Round(n)" type="number" onClick={() => insertField("Round()")} />
              </CategorySection>

              <CategorySection title="String">
                <FieldItem name="concat(a, b)" type="text" onClick={() => insertField("concat()")} />
                <FieldItem name="uppercase(str)" type="text" onClick={() => insertField("uppercase()")} />
                <FieldItem name="lowercase(str)" type="text" onClick={() => insertField("lowercase()")} />
                <FieldItem name="length(str)" type="number" onClick={() => insertField("length()")} />
              </CategorySection>

              <CategorySection title="Array">
                <FieldItem name="length(arr)" type="number" onClick={() => insertField("length()")} />
                <FieldItem name="contains(arr, item)" type="logic" onClick={() => insertField("contains()")} />
                <FieldItem name="join(arr, separator)" type="text" onClick={() => insertField("join()")} />
              </CategorySection>

              <CategorySection title="Object">
                <FieldItem name="get(obj, key)" type="text" onClick={() => insertField("get()")} />
                <FieldItem name="has(obj, key)" type="logic" onClick={() => insertField("has()")} />
              </CategorySection>

              <CategorySection title="Regex">
                <FieldItem name="test(pattern, str)" type="logic" onClick={() => insertField("test()")} />
                <FieldItem name="match(pattern, str)" type="text" onClick={() => insertField("match()")} />
              </CategorySection>
            </ScrollArea>
          </div>

          {/* Right Side - Formula Editor */}
          <div className="col-span-3 space-y-3">
            <div className="space-y-2">
              <Label>Type a formula or field</Label>
              <Textarea
                value={config.formula || ""}
                onChange={(e) => handleConfigChange("formula", e.target.value)}
                placeholder="Type a formula or field"
                rows={8}
                className="bg-slate-800 text-white font-mono resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-500">= Error</span>
                <Button variant="ghost" size="sm" className="text-xs">
                  Test values ↓
                </Button>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-muted/20 text-center text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                Browse methods and operations in the left column
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold">Tips:</p>
                  <p>- Formulas are case sensitive → Sum(...) ✓ SUM(...) ✗</p>
                  <p>- System fields and static text need quotes → "@today" ✓</p>
                  <p>- You can combine different functions → Sum(2, Sum(4, 2)) ✓</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
