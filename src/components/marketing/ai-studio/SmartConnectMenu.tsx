import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StudioNodeType, NODE_CATEGORIES, getNodeMeta } from './types';
import { getDownstreamTargets, getUpstreamSources } from './nodeConnections';
import { Search, X } from 'lucide-react';

interface Props {
  x: number;
  y: number;
  fromType: StudioNodeType;
  handleType: 'source' | 'target';
  onPick: (type: StudioNodeType) => void;
  onClose: () => void;
}

const SmartConnectMenu: React.FC<Props> = ({ x, y, fromType, handleType, onPick, onClose }) => {
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    setTimeout(() => document.addEventListener('mousedown', handle), 0);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  const compatible = useMemo(() => {
    const types = handleType === 'source'
      ? getDownstreamTargets(fromType)
      : getUpstreamSources(fromType);
    return new Set(types);
  }, [fromType, handleType]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return NODE_CATEGORIES.map(cat => ({
      ...cat,
      nodes: cat.nodes.filter(n =>
        compatible.has(n.type) &&
        (!q || n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q))
      ),
    })).filter(c => c.nodes.length > 0);
  }, [compatible, query]);

  const fromMeta = getNodeMeta(fromType);

  // Constrain to viewport
  const MENU_W = 320;
  const MENU_H = 420;
  const left = Math.min(x, window.innerWidth - MENU_W - 16);
  const top = Math.min(y, window.innerHeight - MENU_H - 16);

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left, top, width: MENU_W, maxHeight: MENU_H, zIndex: 1000 }}
      className="bg-card/95 backdrop-blur-md border border-border/60 rounded-xl shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground truncate">
          {handleType === 'source' ? 'Conectar de' : 'Receber em'}{' '}
          <span className="text-foreground font-medium">{fromMeta?.icon} {fromMeta?.label}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-2 py-2 border-b border-border/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar bloco..."
            className="w-full pl-7 pr-2 py-1.5 text-sm bg-background/60 border border-border/40 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {grouped.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8 px-4">
            Nenhum bloco compatível encontrado.
          </div>
        ) : (
          grouped.map(cat => (
            <div key={cat.id} className="mb-1">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {cat.icon} {cat.label}
              </div>
              {cat.nodes.map(n => (
                <button
                  key={n.type}
                  onClick={() => { onPick(n.type); onClose(); }}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent/60 flex items-start gap-2 transition-colors"
                >
                  <span className="text-base leading-none mt-0.5">{n.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">{n.label}</span>
                    <span className="block text-[11px] text-muted-foreground line-clamp-1">{n.description}</span>
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SmartConnectMenu;
