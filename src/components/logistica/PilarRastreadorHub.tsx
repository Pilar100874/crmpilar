import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Radio, Smartphone } from 'lucide-react';
import TrackerDeviceModels from './TrackerDeviceModels';
import PilarRastreadorApps from './PilarRastreadorApps';

interface Props { estabelecimentoId: string; }

const PilarRastreadorHub: React.FC<Props> = ({ estabelecimentoId }) => {
  return (
    <Tabs defaultValue="modelos" className="w-full">
      <TabsList>
        <TabsTrigger value="modelos" className="gap-2">
          <Radio className="h-4 w-4" /> Modelos de Rastreador
        </TabsTrigger>
        <TabsTrigger value="apps" className="gap-2">
          <Smartphone className="h-4 w-4" /> Apps para Celular
        </TabsTrigger>
      </TabsList>
      <TabsContent value="modelos" className="mt-4">
        <TrackerDeviceModels estabelecimentoId={estabelecimentoId} />
      </TabsContent>
      <TabsContent value="apps" className="mt-4">
        <PilarRastreadorApps />
      </TabsContent>
    </Tabs>
  );
};

export default PilarRastreadorHub;
