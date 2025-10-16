export interface SavedProject {
  id: string;
  name: string;
  data: string;
  thumbnail: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'pilarcup_projects';

export const saveProject = (name: string, canvasData: string, thumbnail: string): SavedProject => {
  try {
    // Comprimir thumbnail reduzindo qualidade
    const compressedThumbnail = thumbnail.length > 50000 
      ? thumbnail.substring(0, thumbnail.indexOf(',') + 1) + 
        thumbnail.substring(thumbnail.indexOf(',') + 1).substring(0, 30000) + '...' 
      : thumbnail;

    const projects = getProjects();
    
    // Limitar a 10 projetos para economizar espaço
    if (projects.length >= 10) {
      projects.splice(0, projects.length - 9); // Manter apenas os 9 mais recentes
    }
    
    const project: SavedProject = {
      id: Date.now().toString(),
      name,
      data: canvasData,
      thumbnail: compressedThumbnail,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    projects.push(project);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    
    return project;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Se ainda assim exceder, limpar TODOS os projetos e tentar novamente
      try {
        localStorage.removeItem(STORAGE_KEY);
        
        const compressedThumbnail = thumbnail.length > 50000 
          ? thumbnail.substring(0, thumbnail.indexOf(',') + 1) + 
            thumbnail.substring(thumbnail.indexOf(',') + 1).substring(0, 20000) + '...' 
          : thumbnail;
        
        const project: SavedProject = {
          id: Date.now().toString(),
          name,
          data: canvasData,
          thumbnail: compressedThumbnail,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify([project]));
        return project;
      } catch (retryError) {
        console.error('Failed to save even after clearing:', retryError);
        throw new Error('Espaço insuficiente no navegador. Por favor, limpe o cache ou use outro navegador.');
      }
    }
    throw error;
  }
};

export const getProjects = (): SavedProject[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const deleteProject = (id: string): void => {
  const projects = getProjects().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export const updateProject = (id: string, name: string, canvasData: string, thumbnail: string): void => {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === id);
  
  if (index !== -1) {
    projects[index] = {
      ...projects[index],
      name,
      data: canvasData,
      thumbnail,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }
};
