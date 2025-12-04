import { useRef } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-config";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const toolbarBtnClass = "h-10 w-10 rounded-full border border-border/50 bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";

interface FileUploaderProps {
  accept: string;
  onFileSelected: (file: File, fileUrl: string) => void;
  disabled?: boolean;
  icon: React.ReactNode;
  tooltip: string;
  buttonClassName?: string;
  title?: string;
}

export default function FileUploader({
  accept,
  onFileSelected,
  disabled,
  icon,
  tooltip,
  buttonClassName,
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
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleClick}
              disabled={disabled}
              className={cn(toolbarBtnClass, buttonClassName)}
            >
              {icon}
            </button>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
}
