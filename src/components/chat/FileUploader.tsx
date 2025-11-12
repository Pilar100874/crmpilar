import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FileUploaderProps {
  accept: string;
  onFileSelected: (file: File, fileUrl: string) => void;
  disabled?: boolean;
  icon: React.ReactNode;
  tooltip: string;
}

export default function FileUploader({
  accept,
  onFileSelected,
  disabled,
  icon,
  tooltip,
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
      <Button
        variant="outline"
        size="icon"
        onClick={handleClick}
        disabled={disabled}
        title={tooltip}
        className="rounded-full"
      >
        {icon}
      </Button>
    </>
  );
}
