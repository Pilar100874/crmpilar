"use client";

import * as React from "react";
import { AnimatePresence, motion, Transition } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Tab {
  title: string;
  icon: LucideIcon;
  badge?: number;
  type?: never;
  disabled?: boolean;
  onClick?: () => void;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
}

type TabItem = Tab | Separator;

interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  activeIndex?: number | null;
  onChange?: (index: number | null) => void;
  deselectOnClickOutside?: boolean;
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

const SeparatorComponent = () => (
  <div className="mx-1 h-[24px] w-[1.2px] bg-border" aria-hidden="true" />
);

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-primary",
  activeIndex,
  onChange,
  deselectOnClickOutside = false,
}: ExpandableTabsProps) {
  const [selected, setSelected] = React.useState<number | null>(activeIndex ?? null);
  const outsideClickRef = React.useRef<HTMLDivElement>(null);

  useOnClickOutside(outsideClickRef as React.RefObject<HTMLElement>, () => {
    if (deselectOnClickOutside) {
      setSelected(null);
      onChange?.(null);
    }
  });

  React.useEffect(() => {
    if (activeIndex !== undefined) {
      setSelected(activeIndex);
    }
  }, [activeIndex]);

  const handleSelect = (index: number, tab: Tab) => {
    if (tab.onClick) {
      tab.onClick();
    }
    setSelected(index);
    onChange?.(index);
  };

  return (
    <div
      ref={outsideClickRef}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border bg-background p-1 shadow-sm",
        className
      )}
    >
      {tabs.map((tab, index) => {
        if ('type' in tab && tab.type === "separator") {
          return <SeparatorComponent key={`separator-${index}`} />;
        }

        const tabItem = tab as Tab;
        const Icon = tabItem.icon;
        return (
          <motion.button
            key={tabItem.title}
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={selected === index}
            onClick={() => handleSelect(index, tabItem)}
            disabled={tabItem.disabled}
            transition={transition}
            className={cn(
              "relative flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300",
              selected === index
                ? cn("bg-muted", activeColor)
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              tabItem.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Icon size={20} />
            <AnimatePresence initial={false}>
              {selected === index && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {tabItem.title}
                </motion.span>
              )}
            </AnimatePresence>
            {tabItem.badge !== undefined && tabItem.badge > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {tabItem.badge}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
