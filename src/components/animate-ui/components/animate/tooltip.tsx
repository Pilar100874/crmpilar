'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
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

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const getAnimationVariants = (side: 'top' | 'bottom' | 'left' | 'right' = 'top') => {
  const offset = 8;
  switch (side) {
    case 'top':
      return {
        initial: { opacity: 0, y: offset, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
      };
    case 'bottom':
      return {
        initial: { opacity: 0, y: -offset, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
      };
    case 'left':
      return {
        initial: { opacity: 0, x: offset, scale: 0.96 },
        animate: { opacity: 1, x: 0, scale: 1 },
      };
    case 'right':
      return {
        initial: { opacity: 0, x: -offset, scale: 0.96 },
        animate: { opacity: 1, x: 0, scale: 1 },
      };
  }
};

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, children, side = 'top', ...props }, ref) => {
  const variants = getAnimationVariants(side);

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        side={side}
        asChild
        {...props}
      >
        <motion.div
          initial={variants.initial}
          animate={variants.animate}
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
  );
});
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
