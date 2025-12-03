import { useRef } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-config";

interface FileUploaderProps {
  accept: string;
  onFileSelected: (file: File, fileUrl: string) => void;
  disabled?: boolean;
  icon: React.ReactNode;
  tooltip: string;
  buttonClassName?: string;
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

  const defaultClassName = "relative flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50 disabled:opacity-50 disabled:pointer-events-none";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={handleClick}
        disabled={disabled}
        title={tooltip}
        className={cn(defaultClassName, buttonClassName)}
      >
        {icon}
      </button>
    </>
  );
}
