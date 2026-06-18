import { ReactNode, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmojiPickerButton } from "./EmojiPickerButton";


// Container para seções de configuração
export const ConfigSection = ({ 
  title, 
  icon, 
  children,
  className 
}: { 
  title?: string; 
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn("space-y-3 p-3 rounded-lg bg-muted border border-border", className)}>
    {title && (
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        {icon && <div className="text-foreground/80">{icon}</div>}
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
    )}
    {children}
  </div>
);

// Campo de texto padrão
export const ConfigInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder,
  type = "text",
  required = false,
  info,
  prefix,
  className,
  emoji = false,
}: { 
  label: string; 
  value: string | number; 
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  info?: string;
  prefix?: string;
  className?: string;
  emoji?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
  <div className="space-y-2">
    <Label className="text-foreground text-sm font-medium flex items-center gap-2">
      <span className="w-1 h-4 bg-primary rounded-full"></span>
      {label}
      {required && <Badge variant="outline" className="ml-1 text-[10px] h-4 border-primary/20 text-primary">obrigatório</Badge>}
    </Label>
    <div className="relative flex items-start gap-2">
      <div className="relative flex-1">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">
            {prefix}
          </span>
        )}
        <Input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "bg-white border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20",
            prefix && "pl-7",
            className
          )}
        />
      </div>
      {emoji && type === "text" && (
        <EmojiPickerButton
          targetRef={inputRef as any}
          value={String(value || "")}
          onChange={onChange}
        />
      )}
    </div>
    {info && (
      <p className="text-xs text-foreground/70 flex items-start gap-1.5 bg-primary/5 p-2 rounded border border-primary/20">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-primary" />
        {info}
      </p>
    )}
  </div>
  );
};


// Campo de texto longo
export const ConfigTextarea = ({ 
  label, 
  value, 
  onChange, 
  placeholder,
  rows = 3,
  required = false,
  info,
  className,
  monospace = false,
  emoji = true,
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  info?: string;
  className?: string;
  monospace?: boolean;
  emoji?: boolean;
}) => {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const showEmoji = emoji && !monospace;
  return (
  <div className="space-y-2">
    <Label className="text-foreground text-sm font-medium flex items-center gap-2">
      <span className="w-1 h-4 bg-primary rounded-full"></span>
      {label}
      {required && <Badge variant="outline" className="ml-1 text-[10px] h-4 border-primary/20 text-primary">obrigatório</Badge>}
    </Label>
    <div className="flex items-start gap-2">
      <Textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "flex-1 bg-white border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none",
          monospace && "font-mono text-xs",
          className
        )}
      />
      {showEmoji && (
        <EmojiPickerButton
          targetRef={taRef as any}
          value={value || ""}
          onChange={onChange}
        />
      )}
    </div>
    {info && (
      <p className="text-xs text-foreground/70 flex items-start gap-1.5 bg-primary/5 p-2 rounded border border-primary/20">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-primary" />
        {info}
      </p>
    )}
  </div>
  );
};


// Campo de seleção
export const ConfigSelect = ({ 
  label, 
  value, 
  onChange, 
  options,
  required = false,
  info,
  placeholder = "Selecione..."
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; }>;
  required?: boolean;
  info?: string;
  placeholder?: string;
}) => (
  <div className="space-y-2">
    <Label className="text-foreground text-sm font-medium flex items-center gap-2">
      <span className="w-1 h-4 bg-primary rounded-full"></span>
      {label}
      {required && <Badge variant="outline" className="ml-1 text-[10px] h-4 border-primary/20 text-primary">obrigatório</Badge>}
    </Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-white border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white border-border text-foreground">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="focus:bg-muted focus:text-foreground">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {info && (
      <p className="text-xs text-foreground/70 flex items-start gap-1.5 bg-primary/5 p-2 rounded border border-primary/20">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-primary" />
        {info}
      </p>
    )}
  </div>
);

// Campo de switch
export const ConfigSwitch = ({ 
  label, 
  checked, 
  onChange,
  info
}: { 
  label: string; 
  checked: boolean; 
  onChange: (checked: boolean) => void;
  info?: string;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-border hover:border-primary/30 transition-colors">
      <Label className="text-foreground text-sm font-medium flex items-center gap-2 cursor-pointer">
        <span className="w-1 h-4 bg-primary rounded-full"></span>
        {label}
      </Label>
      <Switch 
        checked={checked} 
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-primary"
      />
    </div>
    {info && (
      <p className="text-xs text-foreground/70 flex items-start gap-1.5 bg-primary/5 p-2 rounded border border-primary/20">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-primary" />
        {info}
      </p>
    )}
  </div>
);

// Card de informação/dica
export const ConfigInfo = ({ 
  children,
  variant = "info"
}: { 
  children: ReactNode;
  variant?: "info" | "warning" | "success";
}) => {
  const variants = {
    info: "bg-primary/5 border-primary/20 text-primary",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
    success: "bg-green-50 border-green-200 text-green-700"
  };

  return (
    <div className={cn("p-3 rounded-lg border text-xs flex items-start gap-2", variants[variant])}>
      <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
};
