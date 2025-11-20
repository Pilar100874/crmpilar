import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Award } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import type { Skill } from "@/types/atendimento";

interface SkillsFilaManagerProps {
  filaId: string;
  estabelecimentoId: string;
}

interface SkillVinculada {
  id: string;
  skill_id: string;
  nivel_minimo: number;
  skill: Skill;
}

export const SkillsFilaManager = ({ filaId, estabelecimentoId }: SkillsFilaManagerProps) => {
  const [skillsVinculadas, setSkillsVinculadas] = useState<SkillVinculada[]>([]);
  const [skillsDisponiveis, setSkillsDisponiveis] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [nivelMinimo, setNivelMinimo] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filaId, estabelecimentoId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadSkillsVinculadas(),
      loadSkillsDisponiveis()
    ]);
    setLoading(false);
  };

  const loadSkillsVinculadas = async () => {
    const { data, error } = await supabase
      .from("fila_skills")
      .select(`
        id,
        skill_id,
        nivel_minimo,
        skills!inner(
          id,
          nome,
          descricao,
          cor,
          estabelecimento_id,
          created_at
        )
      `)
      .eq("fila_id", filaId);

    if (error) {
      console.error("Erro ao carregar skills vinculadas:", error);
      sonnerToast.error("Erro ao carregar skills vinculadas");
      return;
    }

    const formatted = data?.map((item: any) => ({
      id: item.id,
      skill_id: item.skill_id,
      nivel_minimo: item.nivel_minimo,
      skill: item.skills
    })) || [];

    setSkillsVinculadas(formatted);
  };

  const loadSkillsDisponiveis = async () => {
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId);

    if (error) {
      console.error("Erro ao carregar skills disponíveis:", error);
      return;
    }

    setSkillsDisponiveis(data || []);
  };

  const handleAddSkill = async () => {
    if (!selectedSkill) {
      sonnerToast.error("Selecione uma skill");
      return;
    }

    if (nivelMinimo < 1 || nivelMinimo > 10) {
      sonnerToast.error("Nível mínimo deve estar entre 1 e 10");
      return;
    }

    const { error } = await supabase
      .from("fila_skills")
      .insert({
        fila_id: filaId,
        skill_id: selectedSkill,
        nivel_minimo: nivelMinimo
      });

    if (error) {
      console.error("Erro ao adicionar skill:", error);
      sonnerToast.error("Erro ao adicionar skill");
      return;
    }

    sonnerToast.success("Skill adicionada com sucesso");
    setSelectedSkill("");
    setNivelMinimo(1);
    loadData();
  };

  const handleRemoveSkill = async (vinculoId: string) => {
    const { error } = await supabase
      .from("fila_skills")
      .delete()
      .eq("id", vinculoId);

    if (error) {
      console.error("Erro ao remover skill:", error);
      sonnerToast.error("Erro ao remover skill");
      return;
    }

    sonnerToast.success("Skill removida com sucesso");
    loadData();
  };

  const handleUpdateNivel = async (vinculoId: string, novoNivel: number) => {
    if (novoNivel < 1 || novoNivel > 10) {
      sonnerToast.error("Nível mínimo deve estar entre 1 e 10");
      return;
    }

    const { error } = await supabase
      .from("fila_skills")
      .update({ nivel_minimo: novoNivel })
      .eq("id", vinculoId);

    if (error) {
      console.error("Erro ao atualizar nível:", error);
      sonnerToast.error("Erro ao atualizar nível");
      return;
    }

    sonnerToast.success("Nível atualizado");
    loadData();
  };

  const skillsNaoVinculadas = skillsDisponiveis.filter(
    disponivel => !skillsVinculadas.some(vinculada => vinculada.skill_id === disponivel.id)
  );

  if (loading) {
    return <div className="text-center py-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label>Adicionar Skill</Label>
              <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma skill" />
                </SelectTrigger>
                <SelectContent>
                  {skillsNaoVinculadas.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      <div className="flex items-center gap-2">
                        {skill.cor && (
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: skill.cor }}
                          />
                        )}
                        {skill.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nível Mínimo Requerido (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={nivelMinimo}
                onChange={(e) => setNivelMinimo(Number(e.target.value))}
                placeholder="1 a 10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Atendentes devem ter ao menos este nível na skill para atender esta fila
              </p>
            </div>

            <Button onClick={handleAddSkill} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Skill
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Skills Requeridas ({skillsVinculadas.length})</h3>
        
        {skillsVinculadas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mb-2 opacity-50" />
              <p>Nenhuma skill configurada para esta fila</p>
              <p className="text-xs mt-1">Qualquer atendente poderá atender</p>
            </CardContent>
          </Card>
        ) : (
          skillsVinculadas.map((vinculo) => (
            <Card key={vinculo.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3 flex-1">
                  {vinculo.skill.cor && (
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: vinculo.skill.cor }}
                    />
                  )}
                  <div>
                    <p className="font-medium">{vinculo.skill.nome}</p>
                    {vinculo.skill.descricao && (
                      <p className="text-sm text-muted-foreground">{vinculo.skill.descricao}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Nível Mín:</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={vinculo.nivel_minimo}
                      onChange={(e) => handleUpdateNivel(vinculo.id, Number(e.target.value))}
                      className="w-16"
                    />
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveSkill(vinculo.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
