import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMacroRecorder } from '@/hooks/useMacroRecorder';

interface MacroSelectProps {
  macroId: string;
  macroLabel?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
}

export function MacroSelect({
  macroId,
  macroLabel,
  value,
  onValueChange,
  placeholder,
  options,
  disabled,
  className
}: MacroSelectProps) {
  const { isRecording, recordSelect } = useMacroRecorder();

  const handleValueChange = (newValue: string) => {
    if (isRecording) {
      const selectedOption = options.find(opt => opt.value === newValue);
      recordSelect(macroId, newValue, macroLabel || selectedOption?.label);
    }
    onValueChange?.(newValue);
  };

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger data-macro-id={macroId} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem 
            key={option.value} 
            value={option.value}
            data-macro-id={`${macroId}-option-${option.value}`}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
