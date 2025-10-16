import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Download, Plus, Save, FileX } from "lucide-react";
import { getProjects, deleteProject, SavedProject } from "@/lib/projectStorage";
import { useState, useEffect } from "react";
import { useCanvas } from "@/contexts/CanvasContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { saveProject } from "@/lib/projectStorage";

const ProjectsPanel = () => {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showLoadConfirmDialog, setShowLoadConfirmDialog] = useState(false);
  const [projectToLoad, setProjectToLoad] = useState<SavedProject | null>(null);
  const [projectName, setProjectName] = useState("Novo Design");
  const { fabricCanvas } = useCanvas();

  useEffect(() => {
    loadProjects();
    
    // Atualizar lista quando um projeto for salvo
    const handleProjectSaved = () => loadProjects();
    window.addEventListener('projectSaved', handleProjectSaved);
    
    return () => window.removeEventListener('projectSaved', handleProjectSaved);
  }, []);

  const loadProjects = () => {
    const savedProjects = getProjects();
    setProjects(savedProjects);
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    loadProjects();
    toast.success("Projeto excluído!");
  };

  const handleLoadClick = (project: SavedProject) => {
    if (!fabricCanvas) {
      toast.error("Canvas não está pronto ainda");
      return;
    }
    
    // Verificar se há objetos no canvas
    const hasObjects = fabricCanvas.getObjects().length > 0;
    
    if (hasObjects) {
      // Se houver objetos, mostrar diálogo de confirmação
      setProjectToLoad(project);
      setShowLoadConfirmDialog(true);
    } else {
      // Se não houver objetos, carregar direto
      loadProject(project);
    }
  };

  const loadProject = (project: SavedProject) => {
    if (!fabricCanvas) return;
    
    try {
      const data = JSON.parse(project.data);
      
      // Limpar o canvas antes de carregar
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = "#ffffff";
      
      // Carregar o JSON
      fabricCanvas.loadFromJSON(data).then(() => {
        fabricCanvas.renderAll();
        fabricCanvas.requestRenderAll();
        toast.success(`Projeto "${project.name}" carregado!`);
        
        // Forçar renderização adicional após um delay
        setTimeout(() => {
          fabricCanvas.renderAll();
          fabricCanvas.requestRenderAll();
        }, 50);
      }).catch((error: any) => {
        console.error('Erro ao carregar JSON:', error);
        toast.error("Erro ao carregar projeto");
      });
      
      setShowLoadConfirmDialog(false);
      setProjectToLoad(null);
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      toast.error("Erro ao carregar projeto");
    }
  };

  const handleConfirmLoad = () => {
    if (projectToLoad) {
      loadProject(projectToLoad);
    }
  };

  const handleCancelLoad = () => {
    setShowLoadConfirmDialog(false);
    setProjectToLoad(null);
  };

  const handleDownload = (project: SavedProject) => {
    const link = document.createElement('a');
    link.download = `${project.name}.png`;
    link.href = project.thumbnail;
    link.click();
    toast.success("Download iniciado!");
  };

  const handleNewProject = () => {
    setShowNewProjectDialog(true);
  };

  const handleSaveAndNew = () => {
    if (!fabricCanvas) return;
    
    try {
      const json = JSON.stringify(fabricCanvas.toJSON());
      const thumbnail = fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.3,
        multiplier: 0.2,
      });
      
      saveProject(projectName, json, thumbnail);
      toast.success(`Projeto "${projectName}" salvo!`);
      window.dispatchEvent(new CustomEvent('projectSaved'));
      
      // Criar novo projeto
      createNewProject();
    } catch (error) {
      toast.error("Erro ao salvar: armazenamento cheio. Exclua projetos antigos.");
    }
  };

  const createNewProject = () => {
    if (!fabricCanvas) return;
    
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    setShowNewProjectDialog(false);
    setProjectName("Novo Design");
    toast.success("Novo projeto criado!");
  };

  const handleDiscardAndNew = () => {
    createNewProject();
  };

  return (
    <div className="w-full bg-background">
      <div className="px-4 py-3 space-y-3">
        <div>
          <h2 className="text-base font-semibold">Meus Projetos</h2>
          <p className="text-xs text-muted-foreground">
            {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
          </p>
        </div>
        
        <Button 
          onClick={handleNewProject}
          className="w-full h-10"
          variant="default"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>
      
      <div className="px-4 pb-4">
        {projects.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-[10px]">Nenhum projeto salvo</p>
            <p className="text-[9px] mt-0.5 opacity-75">Salve seus designs aqui</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="group hover:shadow-md transition-all overflow-hidden cursor-pointer"
                onClick={() => handleLoadClick(project)}
              >
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <img 
                    src={project.thumbnail} 
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground px-2.5 py-1 rounded-md font-medium text-[10px]">
                      Abrir
                    </div>
                  </div>
                </div>
                <CardContent className="p-2">
                  <h3 className="font-medium text-[11px] truncate">{project.name}</h3>
                  <p className="text-[9px] text-muted-foreground">{new Date(project.updatedAt).toLocaleDateString('pt-BR')}</p>
                </CardContent>
                
                <div className="flex gap-0.5 px-1.5 pb-1.5 bg-muted/10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(project);
                    }}
                    className="flex-1 h-6 text-[10px] px-1"
                  >
                    <Download className="h-2.5 w-2.5 mr-1" />
                    Baixar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(project.id);
                    }}
                    className="flex-1 h-6 text-[10px] px-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-2.5 w-2.5 mr-1" />
                    Excluir
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog para Novo Projeto */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Criar Novo Projeto
            </DialogTitle>
            <DialogDescription>
              Deseja salvar o projeto atual antes de criar um novo?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Nome do projeto atual</label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Digite o nome do projeto"
                className="w-full h-11"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleDiscardAndNew}
              className="w-full sm:w-auto h-11"
            >
              <FileX className="h-4 w-4 mr-2" />
              Descartar e Criar Novo
            </Button>
            <Button
              variant="default"
              onClick={handleSaveAndNew}
              className="w-full sm:w-auto h-11"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar e Criar Novo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação para carregar projeto */}
      <Dialog open={showLoadConfirmDialog} onOpenChange={setShowLoadConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir Projeto</DialogTitle>
            <DialogDescription>
              Você tem um design em andamento. O que deseja fazer?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Abrir o projeto <span className="font-semibold text-foreground">"{projectToLoad?.name}"</span> irá substituir o design atual.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCancelLoad}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmLoad}
              className="w-full sm:w-auto"
            >
              Sobrepor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPanel;
