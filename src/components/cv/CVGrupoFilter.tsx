import React from 'react';
import { Layers } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CV_GRUPO_ALL, type GrupoOpt } from '@/lib/cv/grupoFilter';

interface Props {
  value: string;
  onChange: (v: string) => void;
  grupos: GrupoOpt[];
  className?: string;
}

/** Seletor de grupo (unidade/filial) usado nas telas do Controle de Veículos. */
export const CVGrupoFilter: React.FC<Props> = ({ value, onChange, grupos, className }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className={className ?? 'w-full sm:w-[220px]'}>
      <div className="flex items-center gap-2 truncate">
        <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <SelectValue placeholder="Unidade" />
      </div>
    </SelectTrigger>
    <SelectContent className="z-[1001] bg-popover">
      <SelectItem value={CV_GRUPO_ALL}>Todos os grupos</SelectItem>
      {grupos.map(g => (
        <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);
