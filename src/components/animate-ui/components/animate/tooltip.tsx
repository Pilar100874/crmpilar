'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TooltipProviderProps {
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
  /** @deprecated Use openDelay instead */
  delayDuration?: number;
  /** @deprecated Use closeDelay instead */
  skipDelayDuration?: number;
}

const TooltipProvider = ({ children, openDelay, closeDelay, delayDuration, skipDelayDuration }: TooltipProviderProps) => {
  return (
    <TooltipPrimitive.Provider 
      delayDuration={openDelay ?? delayDuration ?? 200} 
      skipDelayDuration={closeDelay ?? skipDelayDuration ?? 0}
    >
      {children}
    </TooltipPrimitive.Provider>
  );
};

interface TooltipContextValue {
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
}

const TooltipContext = React.createContext<TooltipContextValue>({});

interface TooltipProps {
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Tooltip = ({ 
  children, 
  side = 'top', 
  sideOffset = 4, 
  align = 'center', 
  alignOffset = 0,
  open,
  defaultOpen,
  onOpenChange
}: TooltipProps) => {
  return (
    <TooltipContext.Provider value={{ side, sideOffset, align, alignOffset }}>
      <TooltipPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        {children}
      </TooltipPrimitive.Root>
    </TooltipContext.Provider>
  );
};

const TooltipTrigger = TooltipPrimitive.Trigger;

const getAnimationVariants = (side: 'top' | 'bottom' | 'left' | 'right' = 'top') => {
  const offset = 8;
  switch (side) {
    case 'top':
      return {
        initial: { opacity: 0, y: offset, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: offset, scale: 0.96 },
      };
    case 'bottom':
      return {
        initial: { opacity: 0, y: -offset, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -offset, scale: 0.96 },
      };
    case 'left':
      return {
        initial: { opacity: 0, x: offset, scale: 0.96 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: offset, scale: 0.96 },
      };
    case 'right':
      return {
        initial: { opacity: 0, x: -offset, scale: 0.96 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: -offset, scale: 0.96 },
      };
  }
};

interface TooltipContentProps extends Omit<React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>, 'asChild'> {
  className?: string;
  children?: React.ReactNode;
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, children, side: sideProp, sideOffset: sideOffsetProp, align: alignProp, alignOffset: alignOffsetProp, ...props }, ref) => {
  const context = React.useContext(TooltipContext);
  
  const side = sideProp ?? context.side ?? 'top';
  const sideOffset = sideOffsetProp ?? context.sideOffset ?? 4;
  const align = alignProp ?? context.align ?? 'center';
  const alignOffset = alignOffsetProp ?? context.alignOffset ?? 0;
  
  const variants = getAnimationVariants(side);

  return (
    <AnimatePresence>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          ref={ref}
          side={side}
          sideOffset={sideOffset}
          align={align}
          alignOffset={alignOffset}
          asChild
          {...props}
        >
          <motion.div
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              mass: 0.5,
            }}
            className={cn(
              'z-[9999] overflow-hidden rounded-lg border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-lg',
              className
            )}
          >
            {children}
          </motion.div>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </AnimatePresence>
  );
});
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
