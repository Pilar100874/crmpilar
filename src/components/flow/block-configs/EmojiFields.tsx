import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmojiPickerButton } from "./EmojiPickerButton";
import { useRef, forwardRef } from "react";
import { cn } from "@/lib/utils";

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
  containerClassName?: string;
};

export const EmojiInput = forwardRef<HTMLInputElement, InputProps>(
  ({ value, onChange, className, containerClassName, ...props }, _ref) => {
    const ref = useRef<HTMLInputElement>(null);
    return (
      <div className={cn("flex items-start gap-2", containerClassName)}>
        <Input
          ref={ref}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className={cn("flex-1", className)}
          {...props}
        />
        <EmojiPickerButton targetRef={ref as any} value={value || ""} onChange={onChange} />
      </div>
    );
  }
);
EmojiInput.displayName = "EmojiInput";

type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
  containerClassName?: string;
};

export const EmojiTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ value, onChange, className, containerClassName, ...props }, _ref) => {
    const ref = useRef<HTMLTextAreaElement>(null);
    return (
      <div className={cn("flex items-start gap-2", containerClassName)}>
        <Textarea
          ref={ref}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className={cn("flex-1", className)}
          {...props}
        />
        <EmojiPickerButton targetRef={ref as any} value={value || ""} onChange={onChange} />
      </div>
    );
  }
);
EmojiTextarea.displayName = "EmojiTextarea";
