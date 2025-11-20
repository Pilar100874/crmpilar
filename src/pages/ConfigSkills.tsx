import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { SkillsManager } from "@/components/atendimento/SkillsManager";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast-config";
import type { Skill } from "@/types/atendimento";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ConfigSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<string | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    cor: "#3b82f6"
  });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const estabId = await getEstabelecimentoId();
    if (estabId) {
      setEstabelecimentoId(estabId);
      loadSkills(estabId);
    }
  };

  const loadSkills = async (estabId: string) => {
    try {
      setLoading(true);
      console.log("🔍 Carregando skills para estabelecimento:", estabId);
      
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .order("nome");

      console.log("📊 Skills retornadas:", data?.length || 0, data);
      
      if (error) {
        console.error("❌ Erro na query:", error);
        throw error;
      }
      
      setSkills(data || []);
    } catch (error) {
      console.error("Erro ao carregar skills:", error);
      toast.error("Erro ao carregar habilidades");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSkill = () => {
    setEditingSkill(null);
    setFormData({
      nome: "",
      descricao: "",
      cor: "#3b82f6"
    });
    setDialogOpen(true);
  };

  const handleEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setFormData({
      nome: skill.nome,
      descricao: skill.descricao || "",
      cor: skill.cor || "#3b82f6"
    });
    setDialogOpen(true);
  };

  const handleDeleteSkill = (skillId: string) => {
    setSkillToDelete(skillId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!skillToDelete) return;

    try {
      const { error } = await supabase
        .from("skills")
        .delete()
        .eq("id", skillToDelete);

      if (error) throw error;
      
      toast.success("Habilidade excluída com sucesso");
      loadSkills(estabelecimentoId);
    } catch (error) {
      console.error("Erro ao excluir skill:", error);
      toast.error("Erro ao excluir habilidade");
    } finally {
      setDeleteDialogOpen(false);
      setSkillToDelete(null);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome da habilidade é obrigatório");
      return;
    }

    try {
      if (editingSkill) {
        // Update
        const { error } = await supabase
          .from("skills")
          .update(formData)
          .eq("id", editingSkill.id);

        if (error) throw error;
        toast.success("Habilidade atualizada com sucesso");
      } else {
        // Create
        const { error } = await supabase
          .from("skills")
          .insert({
            ...formData,
            estabelecimento_id: estabelecimentoId
          });

        if (error) throw error;
        toast.success("Habilidade criada com sucesso");
      }

      setDialogOpen(false);
      loadSkills(estabelecimentoId);
    } catch (error) {
      console.error("Erro ao salvar skill:", error);
      toast.error("Erro ao salvar habilidade");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      {/* Debug temporário */}
      <div className="mb-4 p-4 bg-muted rounded-lg text-sm">
        <p><strong>Debug:</strong></p>
        <p>Estabelecimento ID: {estabelecimentoId || "não carregado"}</p>
        <p>Skills carregadas: {skills.length}</p>
      </div>
      
      <SkillsManager
        skills={skills}
        onCreateSkill={handleCreateSkill}
        onEditSkill={handleEditSkill}
        onDeleteSkill={handleDeleteSkill}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSkill ? "Editar Habilidade" : "Nova Habilidade"}</DialogTitle>
            <DialogDescription>
              Configure uma habilidade para roteamento avançado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="nome">Nome da Habilidade *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Inglês Fluente"
              />
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional da habilidade"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="cor">Cor</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="cor"
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingSkill ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta habilidade? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
