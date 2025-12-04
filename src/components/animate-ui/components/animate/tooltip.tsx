'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TooltipProviderProps {
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
  delayDuration?: number;
  skipDelayDuration?: number;
}

const TooltipProvider = ({ children, openDelay, closeDelay, delayDuration, skipDelayDuration }: TooltipProviderProps) => {
  return (
    <TooltipPrimitive.Provider 
      delayDuration={delayDuration ?? openDelay ?? 200} 
      skipDelayDuration={skipDelayDuration ?? closeDelay ?? 0}
    >
      {children}
    </TooltipPrimitive.Provider>
  );
};

interface TooltipContextValue {
  open: boolean;
  side: 'top' | 'bottom' | 'left' | 'right';
  sideOffset: number;
  align: 'start' | 'center' | 'end';
  alignOffset: number;
}

const TooltipContext = React.createContext<TooltipContextValue>({
  open: false,
  side: 'top',
  sideOffset: 4,
  align: 'center',
  alignOffset: 0,
});

interface TooltipProps {
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Tooltip = ({
  children,
  side = 'top',
  sideOffset = 4,
  align = 'center',
  alignOffset = 0,
  defaultOpen,
  open: controlledOpen,
  onOpenChange,
}: TooltipProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <TooltipContext.Provider value={{ open, side, sideOffset, align, alignOffset }}>
      <TooltipPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        {children}
      </TooltipPrimitive.Root>
    </TooltipContext.Provider>
  );
};

const TooltipTrigger = TooltipPrimitive.Trigger;

const getAnimationVariants = (side: 'top' | 'bottom' | 'left' | 'right') => {
  const offset = 10;
  switch (side) {
    case 'top':
      return {
        initial: { opacity: 0, y: offset, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: offset, scale: 0.95 },
      };
    case 'bottom':
      return {
        initial: { opacity: 0, y: -offset, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -offset, scale: 0.95 },
      };
    case 'left':
      return {
        initial: { opacity: 0, x: offset, scale: 0.95 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: offset, scale: 0.95 },
      };
    case 'right':
      return {
        initial: { opacity: 0, x: -offset, scale: 0.95 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: -offset, scale: 0.95 },
      };
  }
};

interface TooltipContentProps extends Omit<React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>, 'side' | 'sideOffset' | 'align' | 'alignOffset'> {
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, children, side: propSide, sideOffset: propSideOffset, align: propAlign, alignOffset: propAlignOffset, ...props }, ref) => {
  const context = React.useContext(TooltipContext);
  
  // Props têm prioridade sobre context
  const side = propSide ?? context.side;
  const sideOffset = propSideOffset ?? context.sideOffset;
  const align = propAlign ?? context.align;
  const alignOffset = propAlignOffset ?? context.alignOffset;
  
  const variants = getAnimationVariants(side);

  return (
    <AnimatePresence>
      {context.open && (
        <TooltipPrimitive.Portal forceMount>
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
      )}
    </AnimatePresence>
  );
});
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
