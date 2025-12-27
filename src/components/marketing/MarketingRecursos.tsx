import React, { useState } from 'react';
import { ResourcesList } from './ResourcesList';
import { ResourceFormDialog } from './ResourceFormDialog';
import { ContentWizardDialog } from './ContentWizardDialog';
import { MarketingResource } from './types';
import { toast } from 'sonner';

const MarketingRecursos: React.FC = () => {
  const [resources, setResources] = useState<MarketingResource[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<MarketingResource | undefined>();
  const [wizardResource, setWizardResource] = useState<MarketingResource | null>(null);

  const handleSaveResource = (resource: MarketingResource) => {
    setResources((prev) => {
      const exists = prev.find((r) => r.id === resource.id);
      if (exists) {
        return prev.map((r) => (r.id === resource.id ? resource : r));
      }
      return [...prev, resource];
    });
    toast.success(editingResource ? 'Recurso atualizado!' : 'Recurso criado!');
    setEditingResource(undefined);
  };

  const handleDeleteResource = (resourceId: string) => {
    setResources((prev) => prev.filter((r) => r.id !== resourceId));
    toast.success('Recurso removido');
  };

  const handleEditResource = (resource: MarketingResource) => {
    setEditingResource(resource);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingResource(undefined);
  };

  return (
    <div>
      <ResourcesList
        resources={resources}
        onCreateNew={() => setIsFormOpen(true)}
        onEdit={handleEditResource}
        onDelete={handleDeleteResource}
        onUseResource={setWizardResource}
      />

      <ResourceFormDialog
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveResource}
        resource={editingResource}
      />

      {wizardResource && (
        <ContentWizardDialog
          open={!!wizardResource}
          onClose={() => setWizardResource(null)}
          resource={wizardResource}
        />
      )}
    </div>
  );
};

export default MarketingRecursos;
