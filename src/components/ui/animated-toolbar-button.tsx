"use client";

import * as React from "react";
import { AnimatePresence, motion, Transition } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface AnimatedToolbarButtonProps {
  title: string;
  icon: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  isActive?: boolean;
  children?: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: ".5rem",
    paddingRight: ".5rem",
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".5rem" : 0,
    paddingLeft: isSelected ? "1rem" : ".5rem",
    paddingRight: isSelected ? "1rem" : ".5rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition: Transition = { delay: 0.1, type: "spring", bounce: 0, duration: 0.6 };

export function AnimatedToolbarButton({
  title,
  icon: Icon,
  onClick,
  disabled = false,
  isActive = false,
  children,
  className,
  asChild = false,
}: AnimatedToolbarButtonProps) {
  const [isSelected, setIsSelected] = React.useState(false);

  const handleClick = () => {
    setIsSelected(true);
    onClick?.();
    // Auto-deselect after a short delay
    setTimeout(() => setIsSelected(false), 2000);
  };

  const showExpanded = isSelected || isActive;

  if (asChild && children) {
    return (
      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          className: cn(
            "relative flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300",
            showExpanded
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            className
          ),
        })}
      </div>
    );
  }

  return (
    <motion.button
      variants={buttonVariants}
      initial={false}
      animate="animate"
      custom={showExpanded}
      onClick={handleClick}
      disabled={disabled}
      transition={transition}
      className={cn(
        "relative flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300",
        showExpanded
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      title={title}
    >
      <Icon size={20} />
      <AnimatePresence initial={false}>
        {showExpanded && (
          <motion.span
            variants={spanVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            className="overflow-hidden whitespace-nowrap"
          >
            {title}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// Wrapper component for Popovers that need the animated button as trigger
interface AnimatedPopoverTriggerProps {
  title: string;
  icon: LucideIcon;
  disabled?: boolean;
  isActive?: boolean;
  isOpen?: boolean;
  className?: string;
  onClick?: () => void;
}

export const AnimatedPopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  AnimatedPopoverTriggerProps
>(({ title, icon: Icon, disabled, isActive, isOpen, className, onClick }, ref) => {
  const showExpanded = isOpen || isActive;

  return (
    <motion.button
      ref={ref}
      variants={buttonVariants}
      initial={false}
      animate="animate"
      custom={showExpanded}
      disabled={disabled}
      transition={transition}
      onClick={onClick}
      className={cn(
        "relative flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300",
        showExpanded
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      title={title}
    >
      <Icon size={20} />
      <AnimatePresence initial={false}>
        {showExpanded && (
          <motion.span
            variants={spanVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            className="overflow-hidden whitespace-nowrap"
          >
            {title}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

AnimatedPopoverTrigger.displayName = "AnimatedPopoverTrigger";
