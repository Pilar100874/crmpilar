import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ExpandableToolbarMenuProps {
  children: React.ReactNode;
  className?: string;
}

interface MenuItemProps {
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  isActive?: boolean;
  title?: string;
}

export function ExpandableMenuItem({ 
  children, 
  onClick, 
  disabled = false, 
  icon, 
  isActive = false,
  title 
}: MenuItemProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "w-full h-full flex items-center justify-center transition-all duration-200",
              "group",
              disabled 
                ? "text-muted-foreground/50 cursor-not-allowed" 
                : "text-muted-foreground hover:text-foreground",
              isActive && "text-primary"
            )}
            role="menuitem"
            onClick={onClick}
            disabled={disabled}
          >
            <span className="flex items-center justify-center h-full">
              {icon && (
                <span className="h-5 w-5 transition-all duration-200 group-hover:scale-110">
                  {icon}
                </span>
              )}
              {children}
            </span>
          </button>
        </TooltipTrigger>
        {title && <TooltipContent>{title}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}

export function ExpandableToolbarMenu({ children, className }: ExpandableToolbarMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const childrenArray = React.Children.toArray(children);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleItemClick = (child: React.ReactElement) => {
    if (child.props.onClick) {
      child.props.onClick();
    }
    // Don't close if it's a popover trigger (let the popover handle its own state)
    if (!child.props.keepOpen) {
      setIsExpanded(false);
    }
  };

  return (
    <div 
      ref={menuRef}
      className={cn("relative", className)} 
      data-expanded={isExpanded}
    >
      {/* Container for all items */}
      <div className="relative">
        {/* Main trigger button - always visible */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={cn(
                  "relative w-10 h-10 rounded-full cursor-pointer z-50",
                  "bg-background border border-border/50 shadow-sm",
                  "flex items-center justify-center",
                  "transition-all duration-300",
                  isExpanded && "bg-primary text-primary-foreground border-primary rotate-45"
                )}
                onClick={handleToggle}
              >
                <Plus className="h-5 w-5" />
              </div>
            </TooltipTrigger>
            <TooltipContent>{isExpanded ? "Fechar menu" : "Abrir menu"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Menu items - expand upward */}
        {childrenArray.map((child, index) => {
          if (!React.isValidElement(child)) return null;
          
          return (
            <div 
              key={index} 
              className={cn(
                "absolute left-0 w-10 h-10 rounded-full",
                "bg-background border border-border/50 shadow-sm",
                "flex items-center justify-center"
              )}
              style={{
                transform: `translateY(${isExpanded ? -((index + 1) * 44) : 0}px)`,
                opacity: isExpanded ? 1 : 0,
                zIndex: 40 - index,
                transition: `transform 300ms cubic-bezier(0.4, 0, 0.2, 1),
                           opacity ${isExpanded ? '300ms' : '200ms'}`,
                pointerEvents: isExpanded ? 'auto' : 'none',
              }}
              onClick={() => handleItemClick(child as React.ReactElement)}
            >
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
}
