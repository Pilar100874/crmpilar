import { useState, useCallback, useMemo } from 'react';

/**
 * Hook that reads the folder assignments from localStorage (same system used by MarketingGaleria)
 * and provides folder navigation for any gallery picker.
 */
export function useGalleryFolders() {
  const estabId = typeof window !== 'undefined' ? localStorage.getItem('estabelecimentoId') || '' : '';

  // Read folder assignments from localStorage (same keys as MarketingGaleria)
  const getFolderAssignments = useCallback((): Record<string, string | null> => {
    try {
      const stored = localStorage.getItem(`galeria_content_assignments_${estabId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, [estabId]);

  const getManualFolders = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(`galeria_content_folders_${estabId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [estabId]);

  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  /** Given a list of gallery items, compute available folders and filter by active folder */
  const getFilteredItems = useCallback(<T extends { id: string }>(items: T[]): {
    folders: string[];
    filteredItems: T[];
    activeFolder: string | null;
    setActiveFolder: (f: string | null) => void;
  } => {
    const assignments = getFolderAssignments();
    const manualFolders = getManualFolders();

    // Compute all folders that have items assigned
    const assignedFolders = new Set<string>();
    items.forEach(item => {
      const folder = assignments[item.id];
      if (folder) assignedFolders.add(folder);
    });

    // Merge with manual folders
    const allFolders = Array.from(new Set([...assignedFolders, ...manualFolders])).sort();

    // Filter items by active folder
    const filteredItems = activeFolder === null
      ? items // Show all when "Todos" is selected
      : activeFolder === '__root__'
        ? items.filter(item => !assignments[item.id])
        : items.filter(item => assignments[item.id] === activeFolder);

    return {
      folders: allFolders,
      filteredItems,
      activeFolder,
      setActiveFolder,
    };
  }, [activeFolder, getFolderAssignments, getManualFolders]);

  return { getFilteredItems, activeFolder, setActiveFolder };
}

/**
 * Compact folder tabs component for inline gallery pickers.
 * Shows "Todos" + folder buttons in a scrollable row.
 */

