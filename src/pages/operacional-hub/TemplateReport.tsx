import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useFrequencies } from "@/hooks/operacional-hub/useFrequencies";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, ArrowLeft, Clock, Users, Sun, Camera, MapPin, Link2, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  priority: number;
  priority_order: number | null;
  estimated_time_minutes: number | null;
  is_active: boolean;
  is_outdoor: boolean;
  requires_photo: boolean;
  required_workers: number;
  location_photos: string[] | null;
  is_irregularity_template: boolean;
  default_assigned_user_id: string | null;
  additional_assigned_user_ids: string[] | null;
  sectors: { id: string; name: string; color: string } | null;
  job_functions: { id: string; name: string } | null;
}

interface Dependency {
  task_template_id: string;
  depends_on_template_id: string;
}
interface TemplateNode {
  template: TemplateRow;
  children: TemplateNode[];
}

function TemplateTreeNode({
  node,
  depth,
  index,
  getPriorityInfo,
  dependsOnMap,
  templateMap,
  profiles,
}: {
  node: TemplateNode;
  depth: number;
  index: number;
  getPriorityInfo: (p: number) => { label: string; color: string };
  dependsOnMap: Map<string, Set<string>>;
  templateMap: Map<string, TemplateRow>;
  profiles: Map<string, string>;
}) {
  const { template } = node;
  const isChild = depth > 0;
  const pInfo = getPriorityInfo(template.priority);
  const depNames = isChild
    ? Array.from(dependsOnMap.get(template.id) || [])
        .map(id => templateMap.get(id)?.name)
        .filter(Boolean)
    : [];

  return (
    <>
      <div
        className={`flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors`}
        style={{ marginLeft: depth * 24 }}
      >
        {isChild && (
          <span className="border-l-2 border-primary/40 h-full absolute left-0" />
        )}
        <span className="text-xs text-muted-foreground w-6 text-right flex-shrink-0">
          {isChild ? "↳" : `${index}.`}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium truncate ${isChild ? "text-sm" : ""}`}>{template.name}</span>
            {isChild && depNames.length > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                <Link2 className="h-3 w-3" />
                após {depNames.join(", ")}
              </span>
            )}
          </div>
          {template.job_functions && (
            <span className="text-xs text-muted-foreground">
              {template.job_functions.name}
            </span>
          )}
          {(() => {
            const assignedNames: string[] = [];
            if (template.default_assigned_user_id) {
              const name = profiles.get(template.default_assigned_user_id);
              if (name) assignedNames.push(name);
            }
            if (template.additional_assigned_user_ids) {
              for (const uid of template.additional_assigned_user_ids) {
                const name = profiles.get(uid);
                if (name && !assignedNames.includes(name)) assignedNames.push(name);
              }
            }
            return assignedNames.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                👤 {assignedNames.join(", ")}
              </span>
            ) : null;
          })()}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          <Badge variant="outline" className="text-xs gap-1 h-5">
            <span className={`h-1.5 w-1.5 rounded-full ${pInfo.color}`} />
            P{template.priority_order ?? template.priority} · {pInfo.label}
          </Badge>
          <Badge variant="outline" className="text-xs gap-1 h-5">
            <Clock className="h-3 w-3" />
            {template.estimated_time_minutes != null ? `${template.estimated_time_minutes}m` : "—"}
          </Badge>
          {template.required_workers > 1 && (
            <Badge variant="outline" className="text-xs gap-1 h-5">
              <Users className="h-3 w-3" />
              {template.required_workers}
            </Badge>
          )}
          {template.is_outdoor && (
            <Badge variant="outline" className="text-xs h-5">
              <Sun className="h-3 w-3" />
            </Badge>
          )}
          {template.requires_photo && (
            <Badge variant="outline" className="text-xs h-5">
              <Camera className="h-3 w-3" />
            </Badge>
          )}
          {Array.isArray(template.location_photos) && template.location_photos.length > 0 && (
            <Badge variant="outline" className="text-xs h-5 text-emerald-600 border-emerald-300">
              <MapPin className="h-3 w-3" />
            </Badge>
          )}
        </div>
      </div>
      {node.children.map((child, i) => (
        <TemplateTreeNode
          key={child.template.id}
          node={child}
          depth={depth + 1}
          index={i + 1}
          getPriorityInfo={getPriorityInfo}
          dependsOnMap={dependsOnMap}
          templateMap={templateMap}
          profiles={profiles}
        />
      ))}
    </>
  );
}


export default function TemplateReport() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const { data: frequencies = [] } = useFrequencies();

  useEffect(() => {
    Promise.all([
      supabase
        .from("op_task_templates")
        .select("id, name, description, frequency, priority, priority_order, estimated_time_minutes, is_active, is_outdoor, requires_photo, required_workers, location_photos, is_irregularity_template, default_assigned_user_id, additional_assigned_user_ids, sectors:op_sectors(id, name, color), job_functions:op_job_functions(id, name)")
        .eq("is_irregularity_template", false)
        .order("name"),
      supabase.from("op_task_dependencies").select("task_template_id, depends_on_template_id"),
      supabase.from("op_profiles").select("user_id, full_name"),
    ]).then(([tRes, dRes, pRes]) => {
      if (tRes.data) setTemplates(tRes.data as any);
      if (dRes.data) setDependencies(dRes.data);
      if (pRes.data) {
        const map = new Map<string, string>();
        for (const p of pRes.data) map.set(p.user_id, p.full_name);
        setProfiles(map);
      }
      setLoading(false);
    });
  }, []);

  const frequencyLabels: Record<string, string> = {
    daily: "Diária",
    weekly: "Semanal",
    monthly: "Mensal",
    on_demand: "Sob Demanda",
  };

  const getFrequencyLabel = (freq: string) => {
    if (frequencyLabels[freq]) return frequencyLabels[freq];
    const custom = frequencies.find((f) => f.name === freq);
    if (custom) return custom.label + (custom.interval_days ? ` (${custom.interval_days}d)` : "");
    return freq;
  };

  const getPriorityInfo = (priority: number) => {
    if (priority >= 9) return { label: "Crítica", color: "bg-red-500" };
    if (priority >= 7) return { label: "Alta", color: "bg-orange-500" };
    if (priority >= 4) return { label: "Média", color: "bg-yellow-500" };
    return { label: "Baixa", color: "bg-gray-400" };
  };

  // Build dependency map: templateId -> depends on these template ids
  const dependsOnMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const d of dependencies) {
      if (!map.has(d.task_template_id)) map.set(d.task_template_id, new Set());
      map.get(d.task_template_id)!.add(d.depends_on_template_id);
    }
    return map;
  }, [dependencies]);

  // Reverse map: templateId -> templates that depend on it
  const dependedByMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const d of dependencies) {
      if (!map.has(d.depends_on_template_id)) map.set(d.depends_on_template_id, new Set());
      map.get(d.depends_on_template_id)!.add(d.task_template_id);
    }
    return map;
  }, [dependencies]);

  const templateMap = useMemo(() => {
    const map = new Map<string, TemplateRow>();
    for (const t of templates) map.set(t.id, t);
    return map;
  }, [templates]);


  // Build a tree: root items (no deps in this group) with nested dependents
  // Handles circular dependencies by detecting cycles and treating one node as root
  const buildTree = (items: TemplateRow[]): TemplateNode[] => {
    const itemIds = new Set(items.map(t => t.id));
    
    // Find root items: those that have no dependencies within this group
    let rootItems = items.filter(t => {
      const deps = dependsOnMap.get(t.id);
      if (!deps) return true;
      return !Array.from(deps).some(depId => itemIds.has(depId));
    });

    // Sort by priority
    const sortByPriority = (arr: TemplateRow[]) =>
      [...arr].sort((a, b) => {
        const aOrder = a.priority_order ?? 0;
        const bOrder = b.priority_order ?? 0;
        if (bOrder !== aOrder) return bOrder - aOrder;
        return b.priority - a.priority;
      });

    const visited = new Set<string>();

    const buildNode = (item: TemplateRow): TemplateNode => {
      visited.add(item.id);
      const childIds = dependedByMap.get(item.id);
      const children: TemplateNode[] = [];
      if (childIds) {
        const childItems = sortByPriority(
          Array.from(childIds)
            .filter(id => itemIds.has(id) && !visited.has(id))
            .map(id => templateMap.get(id)!)
            .filter(Boolean)
        );
        for (const child of childItems) {
          children.push(buildNode(child));
        }
      }
      return { template: item, children };
    };

    const result = sortByPriority(rootItems).map(item => buildNode(item));

    // Handle circular dependencies: any items not yet visited have no root path
    // Add them as roots to ensure all templates appear
    const remaining = sortByPriority(items.filter(t => !visited.has(t.id)));
    for (const item of remaining) {
      if (!visited.has(item.id)) {
        result.push(buildNode(item));
      }
    }

    return result;
  };

  // Available sectors for filter
  const availableSectors = useMemo(() => {
    const sectorSet = new Map<string, { id: string; name: string; color: string }>();
    for (const t of templates.filter(t => t.is_active)) {
      if (t.sectors) sectorSet.set(t.sectors.id, t.sectors);
    }
    return Array.from(sectorSet.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [templates]);

  // Group by sector -> frequency -> sorted templates
  const reportData = useMemo(() => {
    const activeTemplates = templates.filter(t => t.is_active);
    
    // Group by sector
    const sectorMap = new Map<string, { sector: { id: string; name: string; color: string }; templates: TemplateRow[] }>();
    const noSector: TemplateRow[] = [];

    for (const t of activeTemplates) {
      if (t.sectors) {
        const key = t.sectors.id;
        if (!sectorMap.has(key)) sectorMap.set(key, { sector: t.sectors, templates: [] });
        sectorMap.get(key)!.templates.push(t);
      } else {
        noSector.push(t);
      }
    }

    const sectors = Array.from(sectorMap.values()).sort((a, b) => a.sector.name.localeCompare(b.sector.name));
    if (noSector.length > 0) {
      sectors.push({ sector: { id: "none", name: "Sem Setor", color: "#9ca3af" }, templates: noSector });
    }

    // Apply sector filter
    const filteredSectors = selectedSector === "all" 
      ? sectors 
      : sectors.filter(s => s.sector.id === selectedSector);

    // Within each sector, group by frequency
    return filteredSectors.map(s => {
      const freqMap = new Map<string, TemplateRow[]>();
      for (const t of s.templates) {
        if (!freqMap.has(t.frequency)) freqMap.set(t.frequency, []);
        freqMap.get(t.frequency)!.push(t);
      }

      // Sort frequency groups: daily first, then by interval
      const freqOrder = (freq: string) => {
        if (freq === "daily") return 0;
        if (freq === "weekly") return 7;
        if (freq === "monthly") return 30;
        if (freq === "on_demand") return 999;
        const custom = frequencies.find(f => f.name === freq);
        return custom?.interval_days ?? 500;
      };

      const freqGroups = Array.from(freqMap.entries())
        .sort((a, b) => freqOrder(a[0]) - freqOrder(b[0]))
        .map(([freq, items]) => ({
          frequency: freq,
          label: getFrequencyLabel(freq),
          tree: buildTree(items),
        }));

      return { sector: s.sector, frequencyGroups: freqGroups, totalTemplates: s.templates.length };
    });
  }, [templates, frequencies, dependsOnMap, dependedByMap, templateMap, selectedSector]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/operacional/templates")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-[26px] font-semibold tracking-tight">Relatório de Templates</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {templates.filter(t => t.is_active && !t.is_irregularity_template).length} templates ativos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="w-[200px] gap-2">
                <Filter className="h-4 w-4 flex-shrink-0" />
                <SelectValue placeholder="Filtrar por setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os setores</SelectItem>
                {availableSectors.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="none">Sem Setor</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        <div className="hidden print:block mb-6">
          <h1 className="text-xl font-bold text-center">Relatório de Templates por Setor</h1>
          <p className="text-center text-sm text-muted-foreground">
            Gerado em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {reportData.map((sectorGroup) => (
          <Card key={sectorGroup.sector.id} className="break-inside-avoid-page">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sectorGroup.sector.color }}
                />
                {sectorGroup.sector.name}
                <Badge variant="secondary">{sectorGroup.totalTemplates}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {sectorGroup.frequencyGroups.map((freqGroup) => {
                const countNodes = (nodes: TemplateNode[]): number =>
                  nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0);

                return (
                  <div key={freqGroup.frequency} className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1">
                      {freqGroup.label}
                      <span className="ml-2 text-xs font-normal">({countNodes(freqGroup.tree)})</span>
                    </h3>
                    <div className="space-y-0.5">
                      {freqGroup.tree.map((node, idx) => (
                        <TemplateTreeNode key={node.template.id} node={node} depth={0} index={idx + 1} getPriorityInfo={getPriorityInfo} dependsOnMap={dependsOnMap} templateMap={templateMap} profiles={profiles} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {reportData.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum template ativo encontrado.
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
