import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface RadialMenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick?: () => void;
}

interface RadialMenuProps {
  items: RadialMenuItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (item: RadialMenuItem) => void;
  size?: number;
  itemSize?: number;
  centerIcon?: React.ReactNode;
  className?: string;
}

export function RadialMenu({
  items,
  isOpen,
  onClose,
  onSelect,
  size = 200,
  itemSize = 56,
  centerIcon,
  className,
}: RadialMenuProps) {
  const radius = size / 2 - itemSize / 2 - 8;
  const angleStep = (2 * Math.PI) / items.length;

  const handleItemClick = (item: RadialMenuItem) => {
    onSelect?.(item);
    item.onClick?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Menu Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
              className
            )}
            style={{ width: size, height: size }}
          >
            {/* Ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 rounded-full border-2 border-primary/20 bg-card/50 backdrop-blur-md"
            />

            {/* Center Button */}
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              onClick={onClose}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors z-10"
            >
              {centerIcon || <X className="w-6 h-6" />}
            </motion.button>

            {/* Menu Items */}
            {items.map((item, index) => {
              const angle = angleStep * index - Math.PI / 2;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <motion.button
                  key={item.id}
                  initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1,
                    x: x,
                    y: y,
                  }}
                  exit={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                  transition={{ 
                    delay: index * 0.05,
                    duration: 0.3,
                    ease: "easeOut"
                  }}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                    "flex flex-col items-center justify-center gap-1",
                    "w-14 h-14 rounded-full",
                    "bg-card border border-border shadow-lg",
                    "hover:bg-accent hover:scale-110 hover:shadow-xl",
                    "transition-all duration-200",
                    "group"
                  )}
                  style={{
                    width: itemSize,
                    height: itemSize,
                  }}
                >
                  <div className="relative">
                    {item.icon}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-medium bg-primary text-primary-foreground rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  
                  {/* Label tooltip */}
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs font-medium bg-popover text-popover-foreground rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {item.label}
                  </motion.span>
                </motion.button>
              );
            })}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Trigger Button Component
interface RadialMenuTriggerProps {
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
  badge?: number;
}

export function RadialMenuTrigger({
  onClick,
  icon,
  className,
  badge,
}: RadialMenuTriggerProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative w-14 h-14 rounded-full",
        "bg-primary text-primary-foreground",
        "flex items-center justify-center",
        "shadow-lg hover:shadow-xl",
        "transition-shadow duration-200",
        className
      )}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center text-xs font-medium bg-destructive text-destructive-foreground rounded-full">
          {badge}
        </span>
      )}
    </motion.button>
  );
}
