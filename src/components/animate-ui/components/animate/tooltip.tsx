'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

interface TooltipProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
}

const Tooltip = ({ 
  children, 
  open,
  defaultOpen,
  onOpenChange,
  delayDuration
}: TooltipProps) => {
  return (
    <TooltipPrimitive.Root 
      open={open} 
      defaultOpen={defaultOpen} 
      onOpenChange={onOpenChange}
      delayDuration={delayDuration}
    >
      {children}
    </TooltipPrimitive.Root>
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

interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  className?: string;
  children?: React.ReactNode;
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, children, side = 'top', sideOffset = 4, ...props }, ref) => {
  const variants = getAnimationVariants(side);

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        side={side}
        sideOffset={sideOffset}
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
