import React, { useState } from 'react';
import { NODE_CATEGORIES } from './types';
import { getConnectionHelp } from './nodeConnections';
import { Button } from '@/components/ui/button';
import { Plus, X, Search, GripVertical, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const CATEGORY_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  input: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.15)', dot: '#6366f1' },
  'ai-text': { bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.15)', dot: '#0ea5e9' },
  'ai-image': { bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.15)', dot: '#f43f5e' },
  'ai-video': { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)', dot: '#f59e0b' },
  'ai-audio': { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.15)', dot: '#22c55e' },
  loop: { bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.15)', dot: '#7c3aed' },
  
  output: { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.15)', dot: '#64748b' },
  refinement: { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.15)', dot: '#f97316' },
};

const StudioNodeLibrary: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/studioNodeType', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAddNode = (nodeType: string) => {
    window.dispatchEvent(new CustomEvent('ai-studio:add-node', { detail: { type: nodeType } }));
    setIsOpen(false);
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
        <div className="absolute top-3 left-3 z-20">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              onClick={() => setIsOpen(true)}
              className="h-9 rounded-lg shadow-lg border-0 gap-1.5 px-3 text-xs font-medium"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <Plus className="h-4 w-4 text-white" />
              <span className="text-white">Adicionar Bloco</span>
            </Button>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute top-3 left-3 z-20 w-[calc(100%-24px)] sm:w-[300px] max-w-[340px] flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl"
            style={{
              maxHeight: 'calc(100% - 24px)',
            }}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 shrink-0">
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

            <div className="h-px bg-border/40 mx-3 shrink-0" />

            {/* Flat list - native scroll */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="p-2.5 space-y-3">
                {filteredCategories.map((cat) => {
                  const colors = CATEGORY_COLORS[cat.id] || CATEGORY_COLORS.output;

                  return (
                    <div key={cat.id}>
                      {/* Category label */}
                      <div className="flex items-center gap-2 px-2 mb-1.5">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: colors.dot }}
                        />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          {cat.icon} {cat.label}
                        </span>
                        <div className="flex-1 h-px bg-border/40" />
                      </div>

                      <div className="space-y-1">
                        {cat.nodes.map((node) => {

                          const help = getConnectionHelp(node.type);
                          return (
                          <motion.div
                            key={node.type}
                            whileHover={{ x: 3 }}
                            whileTap={{ scale: 0.97 }}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all group/node hover:shadow-sm"
                            style={{
                              background: colors.bg,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            <div
                              draggable
                              onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, node.type)}
                              onClick={() => handleAddNode(node.type)}
                              className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer md:cursor-grab active:cursor-grabbing"
                            >
                              <div
                                className="h-7 w-7 rounded-md flex items-center justify-center text-sm shrink-0"
                                style={{
                                  background: `${node.color}18`,
                                  border: `1px solid ${node.color}30`,
                                }}
                              >
                                {node.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-[11px] truncate text-foreground/80 group-hover/node:text-foreground leading-tight">
                                  {node.label}
                                </p>
                                <p className="text-[9px] text-muted-foreground truncate leading-tight">
                                  {node.description}
                                </p>
                              </div>
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                                  aria-label="Ver conexões compatíveis"
                                >
                                  <HelpCircle className="h-3.5 w-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent side="right" align="start" className="w-72 p-3 z-[10000]">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                    <span className="text-base">{node.icon}</span>
                                    <p className="font-semibold text-xs text-foreground">{node.label}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                      ➡️ Pode conectar EM ({help.downstream.length})
                                    </p>
                                    {help.downstream.length === 0 ? (
                                      <p className="text-[11px] text-muted-foreground italic">Bloco final – não conecta em outros.</p>
                                    ) : (
                                      <div className="flex flex-wrap gap-1">
                                        {help.downstream.map((d) => (
                                          <span key={d.type} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-foreground border border-primary/20">
                                            {d.icon} {d.label}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                      ⬅️ Recebe DE ({help.upstream.length})
                                    </p>
                                    {help.upstream.length === 0 ? (
                                      <p className="text-[11px] text-muted-foreground italic">Bloco de entrada – não recebe conexões.</p>
                                    ) : (
                                      <div className="flex flex-wrap gap-1">
                                        {help.upstream.map((u) => (
                                          <span key={u.type} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground border border-border/50">
                                            {u.icon} {u.label}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <GripVertical className="h-3 w-3 text-muted-foreground/20 group-hover/node:text-muted-foreground/50 shrink-0 transition-colors hidden md:block" />
                          </motion.div>
                          );
                        })}


                      </div>
                    </div>
                  );
                })}

                {filteredCategories.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground">Nenhum bloco encontrado</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="h-px bg-border/40 mx-3 shrink-0" />
            <div className="px-4 py-2 shrink-0">
              <p className="text-[9px] text-muted-foreground/60 text-center">
                {NODE_CATEGORIES.reduce((acc, c) => acc + c.nodes.length, 0)} blocos · arraste para adicionar
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StudioNodeLibrary;
