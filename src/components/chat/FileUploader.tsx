import { useRef } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-config";
import { AnimatePresence, motion, Transition } from "framer-motion";
import { LucideIcon } from "lucide-react";

const buttonVariants = {
  initial: { gap: 0, paddingLeft: ".5rem", paddingRight: ".5rem" },
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

interface FileUploaderProps {
  accept: string;
  onFileSelected: (file: File, fileUrl: string) => void;
  disabled?: boolean;
  icon: React.ReactNode;
  tooltip: string;
  buttonClassName?: string;
  title?: string;
  isSelected?: boolean;
}

export default function FileUploader({
  accept,
  onFileSelected,
  disabled,
  icon,
  tooltip,
  buttonClassName,
  title,
  isSelected = false,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      onFileSelected(file, fileUrl);
      toast.success(`${file.name} selecionado`);
      
      // Reset input
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
        title={tooltip}
        className={cn(
          "relative flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300",
          isSelected
            ? "bg-muted text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed",
          buttonClassName
        )}
      >
        {icon}
        <AnimatePresence initial={false}>
          {isSelected && title && (
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
