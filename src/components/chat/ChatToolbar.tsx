"use client";

import * as React from "react";
import { AnimatePresence, motion, Transition } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

interface ToolbarButtonProps {
  title: string;
  icon: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onDeselect?: () => void;
}

export function ToolbarButton({
  title,
  icon: Icon,
  onClick,
  disabled = false,
  isSelected = false,
  onSelect,
  onDeselect,
}: ToolbarButtonProps) {
  const handleClick = () => {
    if (isSelected) {
      onDeselect?.();
    } else {
      onSelect?.();
    }
    onClick?.();
  };

  return (
    <motion.button
      variants={buttonVariants}
      initial={false}
      animate="animate"
      custom={isSelected}
      onClick={handleClick}
      disabled={disabled}
      transition={transition}
      title={title}
      className={cn(
        "relative flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300",
        isSelected
          ? "bg-muted text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Icon size={20} />
      <AnimatePresence initial={false}>
        {isSelected && (
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

interface ToolbarPopoverButtonProps {
  title: string;
  icon: LucideIcon;
  disabled?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  popoverAlign?: "start" | "center" | "end";
}

export function ToolbarPopoverButton({
  title,
  icon: Icon,
  disabled = false,
  isOpen,
  onOpenChange,
  children,
  popoverAlign = "start",
}: ToolbarPopoverButtonProps) {
  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <motion.button
          variants={buttonVariants}
          initial={false}
          animate="animate"
          custom={isOpen}
          disabled={disabled}
          transition={transition}
          title={title}
          className={cn(
            "relative flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300",
            isOpen
              ? "bg-muted text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Icon size={20} />
          <AnimatePresence initial={false}>
            {isOpen && (
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
      </PopoverTrigger>
      <PopoverContent className="w-80 z-50 rounded-2xl" align={popoverAlign}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

interface ToolbarFileButtonProps {
  title: string;
  icon: LucideIcon;
  accept: string;
  onFileSelected: (file: File, fileUrl: string) => void;
  disabled?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onDeselect?: () => void;
}

export function ToolbarFileButton({
  title,
  icon: Icon,
  accept,
  onFileSelected,
  disabled = false,
  isSelected = false,
  onSelect,
  onDeselect,
}: ToolbarFileButtonProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (isSelected) {
      onDeselect?.();
    } else {
      onSelect?.();
    }
    inputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      onFileSelected(file, fileUrl);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <motion.button
        variants={buttonVariants}
        initial={false}
        animate="animate"
        custom={isSelected}
        onClick={handleClick}
        disabled={disabled}
        transition={transition}
        title={title}
        className={cn(
          "relative flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300",
          isSelected
            ? "bg-muted text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Icon size={20} />
        <AnimatePresence initial={false}>
          {isSelected && (
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
    </>
  );
}

interface ChatToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function ChatToolbar({ children, className }: ChatToolbarProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const outsideClickRef = React.useRef<HTMLDivElement>(null);

  useOnClickOutside(outsideClickRef as React.RefObject<HTMLElement>, () => {
    setSelectedIndex(null);
  });

  return (
    <ChatToolbarContext.Provider value={{ selectedIndex, setSelectedIndex }}>
      <div
        ref={outsideClickRef}
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-2xl border bg-background p-1 shadow-sm justify-center",
          className
        )}
      >
        {children}
      </div>
    </ChatToolbarContext.Provider>
  );
}

interface ChatToolbarContextType {
  selectedIndex: number | null;
  setSelectedIndex: (index: number | null) => void;
}

const ChatToolbarContext = React.createContext<ChatToolbarContextType>({
  selectedIndex: null,
  setSelectedIndex: () => {},
});

export function useChatToolbar() {
  return React.useContext(ChatToolbarContext);
}

export const ToolbarSeparator = () => (
  <div className="mx-1 h-[24px] w-[1.2px] bg-border" aria-hidden="true" />
);
