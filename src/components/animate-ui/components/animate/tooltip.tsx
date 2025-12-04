'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

interface TooltipProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
}

interface TooltipContextValue {
  open: boolean;
  side: 'top' | 'bottom' | 'left' | 'right';
  sideOffset: number;
}

const TooltipContext = React.createContext<TooltipContextValue>({
  open: false,
  side: 'top',
  sideOffset: 4,
});

const Tooltip = ({ 
  children, 
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  delayDuration,
}: TooltipProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  }, [isControlled, onOpenChange]);

  return (
    <TooltipContext.Provider value={{ open, side: 'top', sideOffset: 4 }}>
      <TooltipPrimitive.Root 
        open={open} 
        onOpenChange={handleOpenChange}
        delayDuration={delayDuration}
      >
        {children}
      </TooltipPrimitive.Root>
    </TooltipContext.Provider>
  );
};

const TooltipTrigger = TooltipPrimitive.Trigger;

const getAnimationVariants = (side: 'top' | 'bottom' | 'left' | 'right' = 'top') => {
  const offset = 6;
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

interface TooltipContentProps extends Omit<React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>, 'children'> {
  className?: string;
  children?: React.ReactNode;
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, children, side = 'top', sideOffset = 4, ...props }, ref) => {
  const { open } = React.useContext(TooltipContext);
  const variants = getAnimationVariants(side);

  return (
    <AnimatePresence>
      {open && (
        <TooltipPrimitive.Portal forceMount>
          <TooltipPrimitive.Content
            ref={ref}
            side={side}
            sideOffset={sideOffset}
            forceMount
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
