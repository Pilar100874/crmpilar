import React from 'react';
import { Layers } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GRUPO_ALL, UnidadeOpt } from '@/lib/logistica/grupoFilter';

interface Props {
  value: string;
  onChange: (v: string) => void;
  unidades: UnidadeOpt[];
  className?: string;
  size?: 'sm' | 'md';
}

export const GrupoFilterSelect: React.FC<Props> = ({ value, onChange, unidades, className, size = 'md' }) => {
  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={size === 'sm' ? 'h-8 text-xs min-w-[140px]' : 'min-w-[180px]'}>
          <div className="flex items-center gap-2 truncate">
            <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <SelectValue placeholder="Grupo" />
          </div>
        </SelectTrigger>
        <SelectContent className="z-[1001]">
          <SelectItem value={GRUPO_ALL}>Todos os grupos</SelectItem>
          {unidades.map(u => (
            <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
