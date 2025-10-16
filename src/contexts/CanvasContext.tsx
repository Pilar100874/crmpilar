import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Canvas as FabricCanvas } from 'fabric';

interface CanvasContextType {
  selectedTemplate: string | null;
  setSelectedTemplate: (template: string | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingProgress: number;
  setLoadingProgress: (value: number) => void;
  fabricCanvas: FabricCanvas | null;
  setFabricCanvas: (canvas: FabricCanvas | null) => void;
  selectedObjectType: string | null;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export const useCanvas = () => {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
};

interface CanvasProviderProps {
  children: ReactNode;
  onSelectionChange?: (objectType: string | null) => void;
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children, onSelectionChange }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObjectType, setSelectedObjectType] = useState<string | null>(null);

  useEffect(() => {
    if (!fabricCanvas) return;

    const handleSelection = () => {
      const activeObject = fabricCanvas.getActiveObject();
      const objType = activeObject ? (activeObject as any).type : null;
      setSelectedObjectType(objType);
      onSelectionChange?.(objType);
    };

    const handleCleared = () => {
      setSelectedObjectType(null);
      onSelectionChange?.(null);
    };

    fabricCanvas.on('selection:created', handleSelection);
    fabricCanvas.on('selection:updated', handleSelection);
    fabricCanvas.on('selection:cleared', handleCleared);

    return () => {
      fabricCanvas.off('selection:created', handleSelection);
      fabricCanvas.off('selection:updated', handleSelection);
      fabricCanvas.off('selection:cleared', handleCleared);
    };
  }, [fabricCanvas, onSelectionChange]);

  return (
    <CanvasContext.Provider 
      value={{
        selectedTemplate,
        setSelectedTemplate,
        isLoading,
        setIsLoading,
        loadingProgress,
        setLoadingProgress,
        fabricCanvas,
        setFabricCanvas,
        selectedObjectType,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
};
