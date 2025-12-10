import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Star, 
  Send, 
  Archive, 
  Trash2, 
  FileText, 
  Inbox, 
  RefreshCw, 
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Email {
  id: string;
  folder: string;
  read: boolean;
  starred: boolean;
}

interface EmailFolderSidebarProps {
  emails: Email[];
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  onComposeClick: () => void;
  onRefresh: () => void;
}

const folders = [
  { id: "inbox", label: "Entrada", icon: Inbox },
  { id: "starred", label: "Favoritos", icon: Star },
  { id: "sent", label: "Enviados", icon: Send },
  { id: "drafts", label: "Rascunhos", icon: FileText },
  { id: "archive", label: "Arquivo", icon: Archive },
  { id: "trash", label: "Lixeira", icon: Trash2 },
];

export function EmailFolderSidebar({
  emails,
  activeFolder,
  onFolderChange,
  onComposeClick,
  onRefresh,
}: EmailFolderSidebarProps) {
  const getCount = (folderId: string) => {
    if (folderId === "starred") {
      return emails.filter(e => e.starred).length;
    }
    if (folderId === "inbox") {
      return emails.filter(e => e.folder === "inbox" && !e.read).length;
    }
    if (folderId === "drafts") {
      return emails.filter(e => e.folder === "drafts").length;
    }
    return 0;
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Compose Button */}
      <div className="p-3">
        <Button 
          onClick={onComposeClick}
          size="sm"
          className="w-full gap-2 h-9"
        >
          <Plus className="w-4 h-4" />
          Novo Email
        </Button>
      </div>
      
      {/* Folders List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5 pb-4">
          {folders.map((folder) => {
            const FolderIcon = folder.icon;
            const isActive = activeFolder === folder.id;
            const count = getCount(folder.id);
            
            return (
              <button
                key={folder.id}
                onClick={() => onFolderChange(folder.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive 
                    ? "bg-accent text-accent-foreground font-medium" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <FolderIcon className="w-4 h-4" />
                <span className="flex-1 text-left">{folder.label}</span>
                {count > 0 && (
                  <Badge 
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 min-w-[20px] justify-center"
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* Refresh Button */}
      <div className="p-2 border-t">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full gap-2 text-muted-foreground h-8"
          onClick={onRefresh}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </Button>
      </div>
    </div>
  );
}
