import React, { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { useMacroRecorder } from '@/hooks/useMacroRecorder';

interface MacroInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  macroId: string;
  macroLabel?: string;
}

export const MacroInput = React.forwardRef<HTMLInputElement, MacroInputProps>(
  ({ macroId, macroLabel, onChange, onBlur, ...props }, ref) => {
    const { isRecording, recordSetValue } = useMacroRecorder();
    const lastValueRef = useRef<string>('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      lastValueRef.current = e.target.value;
      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isRecording && lastValueRef.current !== '') {
        recordSetValue(macroId, lastValueRef.current, macroLabel);
      }
      onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        data-macro-id={macroId}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

MacroInput.displayName = 'MacroInput';
