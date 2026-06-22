import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Mask = (value: string) => string;

interface MaskedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  mask: Mask;
  value: string;
  onValueChange: (masked: string) => void;
  invalid?: boolean;
}

export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value, onValueChange, invalid, className, onBlur, ...rest }, ref) => {
    return (
      <Input
        ref={ref}
        inputMode="numeric"
        autoComplete="off"
        className={cn(invalid && "border-destructive focus-visible:ring-destructive", className)}
        value={mask(value ?? "")}
        onChange={(e) => onValueChange(mask(e.target.value))}
        onBlur={onBlur}
        {...rest}
      />
    );
  }
);
MaskedInput.displayName = "MaskedInput";
