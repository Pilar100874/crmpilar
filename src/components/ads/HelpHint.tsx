import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  steps?: string[];
  link?: { label: string; url: string };
  children?: React.ReactNode;
}

export const HelpHint: React.FC<Props> = ({ title, steps, link, children }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground">
        <HelpCircle className="h-3.5 w-3.5" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-80 text-sm space-y-2" align="start">
      <div className="font-semibold">{title}</div>
      {children}
      {steps && (
        <ol className="list-decimal pl-5 space-y-1 text-muted-foreground text-xs">
          {steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      {link && (
        <a href={link.url} target="_blank" rel="noreferrer" className="text-primary underline text-xs block">
          {link.label} ↗
        </a>
      )}
    </PopoverContent>
  </Popover>
);
