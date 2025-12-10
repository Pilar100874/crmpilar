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
  Edit3,
  Sparkles
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
  { id: "inbox", label: "Caixa de Entrada", icon: Inbox, color: "from-blue-500 to-blue-600" },
  { id: "starred", label: "Com Estrela", icon: Star, color: "from-amber-500 to-amber-600" },
  { id: "sent", label: "Enviados", icon: Send, color: "from-emerald-500 to-emerald-600" },
  { id: "drafts", label: "Rascunhos", icon: FileText, color: "from-slate-500 to-slate-600" },
  { id: "archive", label: "Arquivo", icon: Archive, color: "from-purple-500 to-purple-600" },
  { id: "trash", label: "Lixeira", icon: Trash2, color: "from-red-500 to-red-600" },
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
    <div className="flex flex-col h-full bg-gradient-to-b from-blue-50/80 via-white to-white">
      {/* Compose Button */}
      <div className="p-4">
        <Button 
          onClick={onComposeClick}
          className="w-full h-12 gap-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25 rounded-xl font-medium text-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02]"
        >
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
            <Edit3 className="w-4 h-4" />
          </div>
          Escrever
        </Button>
      </div>
      
      {/* Folders List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-4">
          {folders.map((folder) => {
            const FolderIcon = folder.icon;
            const isActive = activeFolder === folder.id;
            const count = getCount(folder.id);
            
            return (
              <button
                key={folder.id}
                onClick={() => onFolderChange(folder.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-200",
                  isActive 
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25" 
                    : "hover:bg-blue-50 text-slate-600 hover:text-slate-900"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                  isActive 
                    ? "bg-white/20" 
                    : `bg-gradient-to-br ${folder.color} bg-opacity-10`
                )}>
                  <FolderIcon className={cn(
                    "w-4 h-4",
                    isActive ? "text-white" : "text-white"
                  )} />
                </div>
                <span className="flex-1 text-left font-medium">{folder.label}</span>
                {count > 0 && (
                  <Badge 
                    className={cn(
                      "text-[11px] px-2 py-0.5 font-semibold min-w-[24px] justify-center",
                      isActive 
                        ? "bg-white/25 text-white border-0 hover:bg-white/30" 
                        : "bg-blue-100 text-blue-700 border-0 hover:bg-blue-200"
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
      <div className="p-3 border-t border-blue-100/50">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full gap-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl h-10"
          onClick={onRefresh}
        >
          <RefreshCw className="w-4 h-4" />
          <span className="font-medium">Atualizar</span>
        </Button>
      </div>
    </div>
  );
}
