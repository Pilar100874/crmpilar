import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import type { Skill } from "@/types/atendimento";

interface SkillsManagerProps {
  skills: Skill[];
  onCreateSkill?: () => void;
  onEditSkill?: (skill: Skill) => void;
  onDeleteSkill?: (skillId: string) => void;
}

export const SkillsManager = ({ skills, onCreateSkill, onEditSkill, onDeleteSkill }: SkillsManagerProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gerenciamento de Habilidades</h2>
          <p className="text-muted-foreground">
            Configure as habilidades que os atendentes podem ter para roteamento avançado
          </p>
        </div>
        <Button onClick={onCreateSkill}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Habilidade
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {skills.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center h-64">
              <p className="text-center text-muted-foreground mb-4">
                Nenhuma habilidade configurada ainda
              </p>
              <Button onClick={onCreateSkill} variant="outline">
                Criar Primeira Habilidade
              </Button>
            </CardContent>
          </Card>
        ) : (
          skills.map((skill) => (
            <Card key={skill.id} className="hover:bg-accent/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{skill.nome}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {skill.descricao || "Sem descrição"}
                    </CardDescription>
                  </div>
                  {skill.cor && (
                    <div 
                      className="w-6 h-6 rounded-full border" 
                      style={{ backgroundColor: skill.cor }}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onEditSkill?.(skill)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onDeleteSkill?.(skill.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir
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
