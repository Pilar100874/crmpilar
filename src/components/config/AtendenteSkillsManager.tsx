import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Award } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import type { Skill } from "@/types/atendimento";

interface AtendenteSkillsManagerProps {
  atendenteId: string;
  estabelecimentoId: string;
}

interface SkillAtendente {
  id: string;
  skill_id: string;
  nivel: number;
  skill: Skill;
}

export const AtendenteSkillsManager = ({ atendenteId, estabelecimentoId }: AtendenteSkillsManagerProps) => {
  const [skillsAtendente, setSkillsAtendente] = useState<SkillAtendente[]>([]);
  const [skillsDisponiveis, setSkillsDisponiveis] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [nivel, setNivel] = useState<number>(5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [atendenteId, estabelecimentoId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadSkillsAtendente(),
      loadSkillsDisponiveis()
    ]);
    setLoading(false);
  };

  const loadSkillsAtendente = async () => {
    const { data, error } = await supabase
      .from("atendente_skills")
      .select(`
        id,
        skill_id,
        nivel,
        skills!inner(
          id,
          nome,
          descricao,
          cor,
          estabelecimento_id,
          created_at
        )
      `)
      .eq("atendente_id", atendenteId);

    if (error) {
      console.error("Erro ao carregar skills do atendente:", error);
      sonnerToast.error("Erro ao carregar skills do atendente");
      return;
    }

    const formatted = data?.map((item: any) => ({
      id: item.id,
      skill_id: item.skill_id,
      nivel: item.nivel,
      skill: item.skills
    })) || [];

    setSkillsAtendente(formatted);
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

    if (nivel < 1 || nivel > 10) {
      sonnerToast.error("Nível deve estar entre 1 e 10");
      return;
    }

    const { error } = await supabase
      .from("atendente_skills")
      .insert({
        atendente_id: atendenteId,
        skill_id: selectedSkill,
        nivel: nivel
      });

    if (error) {
      console.error("Erro ao adicionar skill:", error);
      sonnerToast.error("Erro ao adicionar skill");
      return;
    }

    sonnerToast.success("Skill adicionada com sucesso");
    setSelectedSkill("");
    setNivel(5);
    loadData();
  };

  const handleRemoveSkill = async (skillAtendenteId: string) => {
    const { error } = await supabase
      .from("atendente_skills")
      .delete()
      .eq("id", skillAtendenteId);

    if (error) {
      console.error("Erro ao remover skill:", error);
      sonnerToast.error("Erro ao remover skill");
      return;
    }

    sonnerToast.success("Skill removida com sucesso");
    loadData();
  };

  const handleUpdateNivel = async (skillAtendenteId: string, novoNivel: number) => {
    if (novoNivel < 1 || novoNivel > 10) {
      sonnerToast.error("Nível deve estar entre 1 e 10");
      return;
    }

    const { error } = await supabase
      .from("atendente_skills")
      .update({ nivel: novoNivel })
      .eq("id", skillAtendenteId);

    if (error) {
      console.error("Erro ao atualizar nível:", error);
      sonnerToast.error("Erro ao atualizar nível");
      return;
    }

    sonnerToast.success("Nível atualizado");
    loadData();
  };

  const skillsNaoAtribuidas = skillsDisponiveis.filter(
    disponivel => !skillsAtendente.some(atribuida => atribuida.skill_id === disponivel.id)
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
              <Label>Adicionar Habilidade</Label>
              <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma habilidade" />
                </SelectTrigger>
                <SelectContent>
                  {skillsNaoAtribuidas.map((skill) => (
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
              <Label>Nível de Proficiência (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={nivel}
                onChange={(e) => setNivel(Number(e.target.value))}
                placeholder="1 a 10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                1 = Iniciante, 5 = Intermediário, 10 = Especialista
              </p>
            </div>

            <Button onClick={handleAddSkill} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Habilidade
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Habilidades do Atendente ({skillsAtendente.length})</h3>
        
        {skillsAtendente.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mb-2 opacity-50" />
              <p>Nenhuma habilidade atribuída</p>
              <p className="text-xs mt-1">Adicione habilidades para melhorar o roteamento</p>
            </CardContent>
          </Card>
        ) : (
          skillsAtendente.map((skillAtendente) => (
            <Card key={skillAtendente.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3 flex-1">
                  {skillAtendente.skill.cor && (
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: skillAtendente.skill.cor }}
                    />
                  )}
                  <div>
                    <p className="font-medium">{skillAtendente.skill.nome}</p>
                    {skillAtendente.skill.descricao && (
                      <p className="text-sm text-muted-foreground">{skillAtendente.skill.descricao}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Nível:</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={skillAtendente.nivel}
                      onChange={(e) => handleUpdateNivel(skillAtendente.id, Number(e.target.value))}
                      className="w-16"
                    />
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveSkill(skillAtendente.id)}
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
