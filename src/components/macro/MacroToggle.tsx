import React from 'react';
import { Switch } from '@/components/ui/switch';
import { useMacroRecorder } from '@/hooks/useMacroRecorder';

interface MacroToggleProps {
  macroId: string;
  macroLabel?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function MacroToggle({
  macroId,
  macroLabel,
  checked,
  onCheckedChange,
  disabled,
  className
}: MacroToggleProps) {
  const { isRecording, recordToggle } = useMacroRecorder();

  const handleCheckedChange = (newChecked: boolean) => {
    if (isRecording) {
      recordToggle(macroId, macroLabel || `Alternar ${macroId}`);
    }
    onCheckedChange?.(newChecked);
  };

  return (
    <Switch
      data-macro-id={macroId}
      checked={checked}
      onCheckedChange={handleCheckedChange}
      disabled={disabled}
      className={className}
    />
  );
}
