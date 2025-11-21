import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { OmnichannelNode } from "@/types/omnichannelFlow";

interface FlowSearchProps {
  nodes: OmnichannelNode[];
  onNodeSelect: (nodeId: string) => void;
}

export const FlowSearch = ({ nodes, onNodeSelect }: FlowSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);

  const filteredNodes = nodes.filter(node => {
    const term = searchTerm.toLowerCase();
    return (
      node.data.label.toLowerCase().includes(term) ||
      node.data.type.toLowerCase().includes(term) ||
      node.data.config.descricao?.toLowerCase().includes(term)
    );
  });

  const handleSelect = (nodeId: string) => {
    onNodeSelect(nodeId);
    setSearchTerm("");
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar blocos..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(e.target.value.length > 0);
          }}
          onFocus={() => searchTerm && setShowResults(true)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => {
              setSearchTerm("");
              setShowResults(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showResults && filteredNodes.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg">
          <ScrollArea className="max-h-[300px]">
            <div className="p-2">
              {filteredNodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleSelect(node.id)}
                  className="w-full text-left p-3 rounded hover:bg-accent transition-colors"
                >
                  <div className="font-medium text-sm">{node.data.label}</div>
                  <div className="text-xs text-muted-foreground capitalize mt-1">
                    {node.data.type.replace("_", " ")}
                  </div>
                  {node.data.config.descricao && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {node.data.config.descricao}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};
