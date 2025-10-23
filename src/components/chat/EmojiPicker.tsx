import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

export default function EmojiPicker({ onEmojiSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiSelect = (emoji: any) => {
    onEmojiSelect(emoji.native);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          title="Adicionar emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 border-0" align="end">
        <Picker
          data={data}
          onEmojiSelect={handleEmojiSelect}
          theme="light"
          locale="pt"
          previewPosition="none"
        />
      </PopoverContent>
    </Popover>
  );
}
