import React, { useState } from 'react';
import { NODE_CATEGORIES } from './types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, X, ChevronRight, ChevronDown, Search, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';

const CATEGORY_GRADIENTS: Record<string, { from: string; to: string; accent: string }> = {
  input: { from: '#6366f1', to: '#8b5cf6', accent: 'rgba(99,102,241,0.12)' },
  'ai-text': { from: '#0ea5e9', to: '#06b6d4', accent: 'rgba(14,165,233,0.12)' },
  'ai-image': { from: '#f43f5e', to: '#ec4899', accent: 'rgba(244,63,94,0.12)' },
  'ai-video': { from: '#f59e0b', to: '#f97316', accent: 'rgba(245,158,11,0.12)' },
  'ai-audio': { from: '#22c55e', to: '#10b981', accent: 'rgba(34,197,94,0.12)' },
  output: { from: '#64748b', to: '#475569', accent: 'rgba(100,116,139,0.12)' },
};

const StudioNodeLibrary: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>(NODE_CATEGORIES.map(c => c.id));
  const [search, setSearch] = useState('');

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/studioNodeType', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const toggleCat = (catId: string) => {
    setExpandedCats(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const filteredCategories = NODE_CATEGORIES.map(cat => ({
    ...cat,
    nodes: cat.nodes.filter(n =>
      n.label.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.nodes.length > 0);

  return (
    <>
      {!isOpen && (
        <div className="absolute top-4 left-4 z-20">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="icon"
              onClick={() => setIsOpen(true)}
              className="h-11 w-11 rounded-xl shadow-xl border-0"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              }}
            >
              <Plus className="h-5 w-5 text-white" />
            </Button>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute top-3 left-3 z-20 w-[268px] flex flex-col overflow-hidden rounded-2xl border border-border/50"
            style={{
              maxHeight: 'calc(100% - 24px)',
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.6) inset',
            }}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    <Plus className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Blocos</h3>
                    <p className="text-[10px] text-muted-foreground leading-tight">Arraste para o canvas</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar blocos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-xs rounded-lg bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            <div className="h-px bg-border/50 mx-3" />

            {/* Node list */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {filteredCategories.map((cat) => {
                  const isExpanded = expandedCats.includes(cat.id);
                  const gradient = CATEGORY_GRADIENTS[cat.id] || CATEGORY_GRADIENTS.output;

                  return (
                    <div key={cat.id} className="rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleCat(cat.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-accent/50 transition-all text-left group"
                      >
                        <div
                          className="h-6 w-6 rounded-md flex items-center justify-center text-[11px] shrink-0"
                          style={{ background: gradient.accent }}
                        >
                          {cat.icon}
                        </div>
                        <span className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider flex-1">
                          {cat.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 mr-1">{cat.nodes.length}</span>
                        <motion.div
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                        </motion.div>
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
                            <div className="space-y-1.5 px-1 pb-2 pt-1">
                              {cat.nodes.map((node) => (
                                <motion.div
                                  key={node.type}
                                  draggable
                                  onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, node.type)}
                                  whileHover={{ scale: 1.02, y: -1 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing transition-all group/node"
                                  style={{
                                    background: `linear-gradient(135deg, ${gradient.accent}, transparent)`,
                                    border: '1px solid rgba(0,0,0,0.04)',
                                  }}
                                >
                                  <div
                                    className="h-8 w-8 rounded-lg flex items-center justify-center text-base shrink-0 shadow-sm"
                                    style={{
                                      background: `linear-gradient(135deg, ${node.color}20, ${node.color}10)`,
                                      border: `1px solid ${node.color}25`,
                                    }}
                                  >
                                    {node.icon}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-[11px] truncate text-foreground/80 group-hover/node:text-foreground">
                                      {node.label}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground truncate leading-tight mt-0.5">
                                      {node.description}
                                    </p>
                                  </div>
                                  <GripVertical className="h-3 w-3 text-muted-foreground/30 group-hover/node:text-muted-foreground/60 shrink-0 transition-colors" />
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {filteredCategories.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground">Nenhum bloco encontrado</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="h-px bg-border/50 mx-3" />
            <div className="px-4 py-2.5">
              <p className="text-[9px] text-muted-foreground/60 text-center">
                {NODE_CATEGORIES.reduce((acc, c) => acc + c.nodes.length, 0)} blocos disponíveis
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StudioNodeLibrary;
