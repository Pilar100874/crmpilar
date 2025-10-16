import { useState, useRef, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Variable } from "lucide-react";
import { cn } from "@/lib/utils";

interface VariableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onVariableRequest: () => void;
}

interface VariableTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onVariableRequest: () => void;
}

export const VariableInput = forwardRef<HTMLInputElement, VariableInputProps>(
  ({ onVariableRequest, className, ...props }, ref) => {
    return (
      <div className="relative">
        <Input
          ref={ref}
          className={cn("pr-10", className)}
          {...props}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <Variable className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    );
  }
);
VariableInput.displayName = "VariableInput";

export const VariableTextarea = forwardRef<HTMLTextAreaElement, VariableTextareaProps>(
  ({ onVariableRequest, className, rows = 3, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    return (
      <div className="relative">
        <Textarea
          ref={textareaRef}
          className={cn("pr-10", className)}
          rows={rows}
          {...props}
        />
        <div className="absolute right-2 top-2 pointer-events-none">
          <Variable className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    );
  }
);
VariableTextarea.displayName = "VariableTextarea";
