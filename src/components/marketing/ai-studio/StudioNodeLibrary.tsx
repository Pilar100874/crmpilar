import React, { useState } from 'react';
import { NODE_CATEGORIES } from './types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, X, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StudioNodeLibrary: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>(NODE_CATEGORIES.map(c => c.id));

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/studioNodeType', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const toggleCat = (catId: string) => {
    setExpandedCats(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  return (
    <>
      {/* Collapsed: floating + button */}
      {!isOpen && (
        <div className="absolute top-4 left-4 z-20">
          <Button
            size="icon"
            onClick={() => setIsOpen(true)}
            className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Expanded: slide-in panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -260, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute top-4 left-4 z-20 w-60 bg-card border border-border rounded-xl shadow-lg flex flex-col overflow-hidden"
            style={{ maxHeight: 'calc(100% - 80px)' }}
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground">🧩 Blocos</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Arraste para o canvas</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {NODE_CATEGORIES.map((cat) => {
                  const isExpanded = expandedCats.includes(cat.id);
                  return (
                    <div key={cat.id}>
                      <button
                        onClick={() => toggleCat(cat.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {cat.icon} {cat.label}
                        </span>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-1 pl-2 pb-1">
                              {cat.nodes.map((node) => (
                                <div
                                  key={node.type}
                                  draggable
                                  onDragStart={(e) => onDragStart(e, node.type)}
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background cursor-grab active:cursor-grabbing hover:border-primary/30 hover:bg-accent hover:shadow-sm transition-all text-sm group"
                                  style={{ borderLeftColor: node.color, borderLeftWidth: 3 }}
                                >
                                  <span className="text-base">{node.icon}</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-xs truncate text-foreground/70 group-hover:text-foreground">{node.label}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{node.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StudioNodeLibrary;
