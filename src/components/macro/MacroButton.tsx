import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useMacroRecorder } from '@/hooks/useMacroRecorder';

interface MacroButtonProps extends ButtonProps {
  macroId: string;
  macroLabel?: string;
}

export const MacroButton = React.forwardRef<HTMLButtonElement, MacroButtonProps>(
  ({ macroId, macroLabel, onClick, children, ...props }, ref) => {
    const { isRecording, recordClick } = useMacroRecorder();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isRecording) {
        recordClick(macroId, macroLabel || (typeof children === 'string' ? children : macroId));
      }
      onClick?.(e);
    };

    return (
      <Button
        ref={ref}
        data-macro-id={macroId}
        onClick={handleClick}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

MacroButton.displayName = 'MacroButton';
