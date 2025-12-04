import * as React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger } from '@/components/ui/popover';

interface TooltipPopoverTriggerProps {
  children: React.ReactNode;
  tooltipContent: React.ReactNode;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  disabled?: boolean;
  asPopoverTrigger?: boolean;
}

/**
 * A wrapper component that properly combines Tooltip with Popover trigger.
 * Use this when you need a button that shows a tooltip AND opens a popover.
 */
export const TooltipPopoverTrigger = React.forwardRef<
  HTMLDivElement,
  TooltipPopoverTriggerProps
>(({ children, tooltipContent, tooltipSide = 'top', className, disabled, asPopoverTrigger = true }, ref) => {
  const content = (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div ref={ref} className={className}>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (asPopoverTrigger) {
    return (
      <PopoverTrigger asChild>
        {content}
      </PopoverTrigger>
    );
  }

  return content;
});

TooltipPopoverTrigger.displayName = 'TooltipPopoverTrigger';

interface TooltipButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltipContent: React.ReactNode;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * A button with an animated tooltip.
 */
export const TooltipButton = React.forwardRef<HTMLButtonElement, TooltipButtonProps>(
  ({ tooltipContent, tooltipSide = 'top', children, ...props }, ref) => {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button ref={ref} {...props}>
              {children}
            </button>
          </TooltipTrigger>
          <TooltipContent side={tooltipSide}>
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

TooltipButton.displayName = 'TooltipButton';
