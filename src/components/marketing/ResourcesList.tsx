import React from 'react';
import { Plus, Pencil, Trash2, Image, Music, Video, FileText, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarketingResource, ReturnType, RETURN_TYPE_LABELS } from './types';

interface ResourcesListProps {
  resources: MarketingResource[];
  onCreateNew: () => void;
  onEdit: (resource: MarketingResource) => void;
  onDelete: (resourceId: string) => void;
  onUseResource: (resource: MarketingResource) => void;
}

const ReturnTypeIcon: React.FC<{ type: ReturnType }> = ({ type }) => {
  const icons: Record<ReturnType, React.ReactNode> = {
    image: <Image className="h-4 w-4" />,
    audio: <Music className="h-4 w-4" />,
    video: <Video className="h-4 w-4" />,
    text: <FileText className="h-4 w-4" />,
  };
  return <>{icons[type]}</>;
};

const returnTypeColors: Record<ReturnType, string> = {
  image: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  audio: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  video: 'bg-red-500/10 text-red-600 border-red-500/20',
  text: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

export const ResourcesList: React.FC<ResourcesListProps> = ({
  resources,
  onCreateNew,
  onEdit,
  onDelete,
  onUseResource,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Meus Recursos</h3>
          <p className="text-sm text-muted-foreground">
            Configure os recursos para criar conteúdo com IA
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Recurso
        </Button>
      </div>

      {resources.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Nenhum recurso criado</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Crie seu primeiro recurso para começar a gerar conteúdo com IA
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Recurso
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <Card key={resource.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base line-clamp-1">{resource.name}</CardTitle>
                    {resource.description && (
                      <CardDescription className="line-clamp-2 text-xs">
                        {resource.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant="outline" className={returnTypeColors[resource.returnType]}>
                    <ReturnTypeIcon type={resource.returnType} />
                    <span className="ml-1">{RETURN_TYPE_LABELS[resource.returnType]}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {resource.fields.length} campo{resource.fields.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(resource)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(resource.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onUseResource(resource)}
                      className="h-8"
                    >
                      <Play className="h-3.5 w-3.5 mr-1" />
                      Usar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
