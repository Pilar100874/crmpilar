import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
  <div className={cn("space-y-3 p-3 rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-800/40 border border-cyan-500/20 shadow-md", className)}>
    {title && (
      <div className="flex items-center gap-2 pb-2 border-b border-cyan-500/20">
        {icon && <div className="text-cyan-400">{icon}</div>}
        <h4 className="text-sm font-bold text-white">{title}</h4>
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
  className
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
}) => (
  <div className="space-y-2">
    <Label className="text-white text-sm font-semibold flex items-center gap-2">
      <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
      {label}
      {required && <Badge variant="outline" className="ml-1 text-[10px] h-4 border-cyan-500/40 text-cyan-400">obrigatório</Badge>}
    </Label>
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-bold">
          {prefix}
        </span>
      )}
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner font-medium",
          prefix && "pl-7",
          className
        )}
      />
    </div>
    {info && (
      <p className="text-xs text-slate-400 flex items-start gap-1.5 bg-blue-500/5 p-2 rounded border border-blue-500/20">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-blue-400" />
        {info}
      </p>
    )}
  </div>
);

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
  monospace = false
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
}) => (
  <div className="space-y-2">
    <Label className="text-white text-sm font-semibold flex items-center gap-2">
      <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
      {label}
      {required && <Badge variant="outline" className="ml-1 text-[10px] h-4 border-cyan-500/40 text-cyan-400">obrigatório</Badge>}
    </Label>
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        "bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner resize-none",
        monospace && "font-mono text-xs",
        className
      )}
    />
    {info && (
      <p className="text-xs text-slate-400 flex items-start gap-1.5 bg-blue-500/5 p-2 rounded border border-blue-500/20">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-blue-400" />
        {info}
      </p>
    )}
  </div>
);

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
    <Label className="text-white text-sm font-semibold flex items-center gap-2">
      <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
      {label}
      {required && <Badge variant="outline" className="ml-1 text-[10px] h-4 border-cyan-500/40 text-cyan-400">obrigatório</Badge>}
    </Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-slate-900/80 border-slate-700/50 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-slate-900 border-slate-700 text-white">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="focus:bg-slate-800 focus:text-white">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {info && (
      <p className="text-xs text-slate-400 flex items-start gap-1.5 bg-blue-500/5 p-2 rounded border border-blue-500/20">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-blue-400" />
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
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
      <Label className="text-white text-sm font-semibold flex items-center gap-2 cursor-pointer">
        <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
        {label}
      </Label>
      <Switch 
        checked={checked} 
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-cyan-500 data-[state=checked]:to-blue-500"
      />
    </div>
    {info && (
      <p className="text-xs text-slate-400 flex items-start gap-1.5 bg-blue-500/5 p-2 rounded border border-blue-500/20">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-blue-400" />
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
    info: "bg-blue-500/5 border-blue-500/30 text-blue-300",
    warning: "bg-yellow-500/5 border-yellow-500/30 text-yellow-300",
    success: "bg-green-500/5 border-green-500/30 text-green-300"
  };

  return (
    <div className={cn("p-3 rounded-lg border text-xs flex items-start gap-2", variants[variant])}>
      <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
};
