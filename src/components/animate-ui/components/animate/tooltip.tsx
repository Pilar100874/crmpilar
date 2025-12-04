'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

interface TooltipProps {
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
}

const Tooltip = ({ children, side, sideOffset, align, alignOffset }: TooltipProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === TooltipTrigger) {
            return child;
          }
          if (child.type === TooltipContent) {
            return React.cloneElement(child as React.ReactElement<any>, {
              open,
              side,
              sideOffset,
              align,
              alignOffset,
            });
          }
        }
        return child;
      })}
    </TooltipPrimitive.Root>
  );
};

const TooltipTrigger = TooltipPrimitive.Trigger;

interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  open?: boolean;
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 4, open, children, side = 'top', ...props }, ref) => {
  const getAnimationVariants = () => {
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
      default:
        return {
          initial: { opacity: 0, y: offset, scale: 0.96 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: offset, scale: 0.96 },
        };
    }
  };

  const variants = getAnimationVariants();

  return (
    <AnimatePresence>
      {open && (
        <TooltipPrimitive.Portal forceMount>
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
              exit={variants.exit}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
                mass: 0.8,
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
