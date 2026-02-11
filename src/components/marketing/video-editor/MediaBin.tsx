import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Film, Music, Type, Image, Upload, FolderOpen } from 'lucide-react';

interface Props {
  onAddClip: (type: 'video' | 'audio' | 'image' | 'text') => void;
}

const MediaBin: React.FC<Props> = ({ onAddClip }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Biblioteca de Mídia
        </h3>
      </div>

      <div className="p-3 space-y-2">
        <Button onClick={() => onAddClip('video')} variant="outline" className="w-full justify-start gap-2 text-xs">
          <Film className="h-4 w-4 text-blue-500" />
          Adicionar Cena de Vídeo
        </Button>
        <Button onClick={() => onAddClip('image')} variant="outline" className="w-full justify-start gap-2 text-xs">
          <Image className="h-4 w-4 text-purple-500" />
          Adicionar Imagem / Frame
        </Button>
        <Button onClick={() => onAddClip('audio')} variant="outline" className="w-full justify-start gap-2 text-xs">
          <Music className="h-4 w-4 text-green-500" />
          Adicionar Áudio / SFX
        </Button>
        <Button onClick={() => onAddClip('text')} variant="outline" className="w-full justify-start gap-2 text-xs">
          <Type className="h-4 w-4 text-yellow-500" />
          Adicionar Texto / Legenda
        </Button>
      </div>

      <div className="p-3 border-t">
        <p className="text-xs text-muted-foreground mb-2">Importar arquivos</p>
        <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Arraste ou clique para importar</span>
          <span className="text-[10px] text-muted-foreground">MP4, MOV, MP3, WAV, PNG, JPG</span>
          <input type="file" className="hidden" accept="video/*,audio/*,image/*" multiple />
        </label>
      </div>

      <ScrollArea className="flex-1 p-3">
        <p className="text-xs text-muted-foreground text-center py-8">
          Adicione mídia ao projeto usando os botões acima ou importando arquivos.
        </p>
      </ScrollArea>
    </div>
  );
};

export default MediaBin;
