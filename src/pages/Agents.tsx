import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Bot, Plus, Trash2 } from "lucide-react";

const Agents = () => {
  const [user, setUser] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      else {
        setUser(session.user);
        loadAgents(session.user.id);
      }
    });
  }, [navigate]);

  const loadAgents = async (userId: string) => {
    const { data } = await supabase.from("agents").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setAgents(data || []);
  };

  const createAgent = async () => {
    if (!name.trim()) return toast.error("Nome obrigatório");
    const { error } = await supabase.from("agents").insert({ user_id: user.id, name, description });
    if (error) toast.error("Erro ao criar agente");
    else {
      toast.success("Agente criado!");
      setOpen(false);
      setName("");
      setDescription("");
      loadAgents(user.id);
    }
  };

  const deleteAgent = async (id: string) => {
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) toast.error("Erro ao deletar");
    else {
      toast.success("Agente deletado");
      loadAgents(user.id);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Meus Agentes</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo Agente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Agente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <Button onClick={createAgent} className="w-full">Criar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" />{agent.name}</CardTitle>
                <CardDescription>{agent.description || "Sem descrição"}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" size="sm" onClick={() => deleteAgent(agent.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Agents;
