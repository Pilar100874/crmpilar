// This file is deprecated - use RichTextEditor instead
import React, { forwardRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface VariableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onVariableRequest?: () => void;
}

interface VariableTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onVariableRequest?: () => void;
}

// Normaliza placeholders legados (ex.: "§§VAR0§§") para o formato atual "{{VAR0}}"
const normalizeLegacyTokens = (value?: string) => {
  if (!value) return value;
  return value.replace(/§§VAR_?(\d+)§§/g, (_m, idx) => `{{VAR${idx}}}`);
};

export const VariableInput = forwardRef<HTMLInputElement, VariableInputProps>(
  ({ onVariableRequest, className, value, onChange, onBlur, ...props }, ref) => {
    const normalized = useMemo(() => normalizeLegacyTokens(value as string), [value]);

    const handleBlur: React.FocusEventHandler<HTMLInputElement> = (e) => {
      // Se houver tokens legados, atualiza o valor "para cima" no formato novo
      if (value !== normalized && onChange) {
        const synthetic = {
          ...e,
          target: { ...e.target, value: normalized || "" },
          currentTarget: { ...e.currentTarget, value: normalized || "" },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange(synthetic);
      }
      onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        className={cn(className)}
        value={normalized as any}
        onChange={onChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);
VariableInput.displayName = "VariableInput";

export const VariableTextarea = forwardRef<HTMLTextAreaElement, VariableTextareaProps>(
  ({ onVariableRequest, className, rows = 3, value, onChange, onBlur, ...props }, ref) => {
    const normalized = useMemo(() => normalizeLegacyTokens(value as string), [value]);

    const handleBlur: React.FocusEventHandler<HTMLTextAreaElement> = (e) => {
      if (value !== normalized && onChange) {
        const synthetic = {
          ...e,
          target: { ...e.target, value: normalized || "" },
          currentTarget: { ...e.currentTarget, value: normalized || "" },
        } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(synthetic);
      }
      onBlur?.(e);
    };

    return (
      <Textarea
        ref={ref}
        className={cn(className)}
        rows={rows}
        value={normalized as any}
        onChange={onChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);
VariableTextarea.displayName = "VariableTextarea";

