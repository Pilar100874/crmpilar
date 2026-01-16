import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Edit, 
  Trash2, 
  Copy, 
  Plus,
  Calendar,
  FileText,
  Loader2,
  Download
} from 'lucide-react';
import { SavedCatalog } from './hooks/useSavedCatalogs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SavedCatalogsListProps {
  catalogs: SavedCatalog[];
  isLoading: boolean;
  onCreateNew: () => void;
  onEdit: (catalog: SavedCatalog) => void;
  onDelete: (id: string) => void;
  onDuplicate: (catalog: SavedCatalog) => void;
  onGeneratePDF?: (catalog: SavedCatalog) => void;
}

export const SavedCatalogsList: React.FC<SavedCatalogsListProps> = ({
  catalogs,
  isLoading,
  onCreateNew,
  onEdit,
  onDelete,
  onDuplicate,
  onGeneratePDF,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Meus Catálogos</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie seus catálogos de produtos salvos
          </p>
        </div>
        <Button onClick={onCreateNew} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />
          Novo Catálogo
        </Button>
      </div>

      {/* Catalogs Grid */}
      {catalogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhum catálogo salvo</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Crie seu primeiro catálogo de produtos para começar
          </p>
          <Button onClick={onCreateNew} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Catálogo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogs.map((catalog) => (
            <div
              key={catalog.id}
              className="bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Thumbnail */}
              <div className="aspect-[4/3] bg-muted relative">
                {catalog.thumbnail ? (
                  <img
                    src={catalog.thumbnail}
                    alt={catalog.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-medium truncate">{catalog.nome}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(catalog.updated_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{catalog.products_page?.products?.length || 0} produtos</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 rounded-lg"
                    onClick={() => onEdit(catalog)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    Editar
                  </Button>
                  {onGeneratePDF && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => onGeneratePDF(catalog)}
                      title="Gerar PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => onDuplicate(catalog)}
                    title="Duplicar"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir catálogo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O catálogo "{catalog.nome}" será
                          permanentemente excluído.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(catalog.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
