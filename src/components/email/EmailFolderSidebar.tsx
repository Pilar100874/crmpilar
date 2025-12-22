import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mail, 
  Star, 
  Send, 
  Archive, 
  Trash2, 
  FileText, 
  Inbox, 
  RefreshCw, 
  Edit3
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
  { id: "inbox", label: "Caixa de Entrada", icon: Inbox },
  { id: "starred", label: "Com Estrela", icon: Star },
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
    <div className="flex flex-col h-full">
      {/* Compose Button */}
      <div className="p-3">
        <Button 
          onClick={onComposeClick}
          className="w-full h-10 gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm shadow-sm"
        >
          <Edit3 className="w-4 h-4" />
          Escrever
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
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                  isActive 
                    ? "bg-orange-500 text-white" 
                    : "hover:bg-orange-50 dark:hover:bg-orange-950/30 text-muted-foreground hover:text-foreground"
                )}
              >
                <FolderIcon className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-white" : "text-orange-500"
                )} />
                <span className="flex-1 text-left font-medium truncate">{folder.label}</span>
                {count > 0 && (
                  <Badge 
                    className={cn(
                      "text-[10px] px-1.5 py-0 min-w-[18px] justify-center font-semibold",
                      isActive 
                        ? "bg-white/25 text-white border-0" 
                        : "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300 border-0"
                    )}
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
      <div className="p-2 border-t border-border/50">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full gap-2 text-muted-foreground hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg h-9 text-xs"
          onClick={onRefresh}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </Button>
      </div>
    </div>
  );
}
