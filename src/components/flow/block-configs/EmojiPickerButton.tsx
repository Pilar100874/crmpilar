import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { useState, RefObject } from "react";

const EMOJIS = [
  "😀","😃","😄","😁","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘",
  "😋","😎","🤩","🥳","😏","🤔","🤨","😐","😴","😮","😢","😭","😤","😡","🥺","🙏",
  "👍","👎","👌","✌️","🤝","👏","🙌","💪","👉","👈","👆","👇","✋","🤚","💯","✅",
  "❌","⚠️","❗","❓","💡","🔔","📌","📍","🎯","🚀","🔥","⭐","✨","💎","🎉","🎊",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","💖","💕","💞","💌","💬","💭","🗣️",
  "📞","📱","✉️","📧","📨","📬","📦","📁","📄","📊","📈","📉","🗂️","📋","📝","🖊️",
  "💰","💵","💳","🛒","🛍️","🏷️","🎁","🏆","🥇","🎓","📚","🔍","🔎","🔗","⚙️","🔧",
  "⏰","⏳","⌛","📅","📆","🕐","🌟","☀️","🌙","☁️","🌧️","🌈","🍕","🍔","☕","🍻",
];

interface Props {
  /** Ref to the input/textarea to insert into */
  targetRef: RefObject<HTMLInputElement | HTMLTextAreaElement>;
  value: string;
  onChange: (next: string) => void;
  size?: "sm" | "icon";
  className?: string;
}

export const EmojiPickerButton = ({ targetRef, value, onChange, size = "sm", className }: Props) => {
  const [open, setOpen] = useState(false);

  const insert = (emoji: string) => {
    const el = targetRef.current;
    const current = value || "";
    if (!el) {
      onChange(current + emoji);
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = current.slice(0, start) + emoji + current.slice(end);
    onChange(next);
    setTimeout(() => {
      el.focus();
      const pos = start + emoji.length;
      try { el.setSelectionRange(pos, pos); } catch {}
    }, 0);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          className={"h-8 px-2 shrink-0 " + (className || "")}
          title="Inserir emoji"
        >
          <Smile className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <p className="text-[10px] text-muted-foreground mb-2 px-1">
          Clique para inserir emoji
        </p>
        <div className="grid grid-cols-8 gap-1 max-h-64 overflow-y-auto">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => insert(e)}
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-base transition-colors"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPickerButton;
