import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Map, Table, Settings, BarChart3, Database } from 'lucide-react';
import ProspeccaoMapView from './ProspeccaoMapView';
import ProspeccaoTableView from './ProspeccaoTableView';
import ProspeccaoConfigView from './ProspeccaoConfigView';
import ProspeccaoGastosView from './ProspeccaoGastosView';
import ProspeccaoDadosAbertosView from './ProspeccaoDadosAbertosView';
import { useProspeccaoB2B } from './useProspeccaoB2B';

const ProspeccaoB2BView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('mapa');
  const prospeccao = useProspeccaoB2B();
  
  // Verificar fonte de dados configurada
  const fonteDados = (prospeccao.config as any)?.fonte_dados || 'google_places';
  const isGooglePlaces = fonteDados === 'google_places';
  const isDadosAbertos = fonteDados === 'dados_abertos';
  const isWebScraping = fonteDados === 'web_scraping';

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="mapa" className="flex items-center gap-2">
            {isDadosAbertos ? (
              <Database className="h-4 w-4" />
            ) : (
              <Map className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {isDadosAbertos ? 'Buscar' : 'Mapa'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="prospects" className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            <span className="hidden sm:inline">Prospects</span>
          </TabsTrigger>
          <TabsTrigger value="gastos" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Gastos</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Parâmetros</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mapa" className="flex-1 mt-0">
          {isDadosAbertos ? (
            <ProspeccaoDadosAbertosView 
              estabelecimentoId={prospeccao.estabelecimentoId}
              onProspectsFound={() => prospeccao.loadProspects()}
            />
          ) : (
            <ProspeccaoMapView {...prospeccao} />
          )}
        </TabsContent>

        <TabsContent value="prospects" className="flex-1 mt-0">
          <ProspeccaoTableView {...prospeccao} />
        </TabsContent>

        <TabsContent value="gastos" className="flex-1 mt-0">
          <ProspeccaoGastosView {...prospeccao} />
        </TabsContent>

        <TabsContent value="config" className="flex-1 mt-0">
          <ProspeccaoConfigView {...prospeccao} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProspeccaoB2BView;
