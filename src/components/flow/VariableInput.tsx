// This file is deprecated - use RichTextEditor instead
import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface VariableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onVariableRequest?: () => void;
}

interface VariableTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onVariableRequest?: () => void;
}

export const VariableInput = forwardRef<HTMLInputElement, VariableInputProps>(
  ({ onVariableRequest, className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        className={className}
        {...props}
      />
    );
  }
);
VariableInput.displayName = "VariableInput";

export const VariableTextarea = forwardRef<HTMLTextAreaElement, VariableTextareaProps>(
  ({ onVariableRequest, className, rows = 3, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        className={className}
        rows={rows}
        {...props}
      />
    );
  }
);
VariableTextarea.displayName = "VariableTextarea";
