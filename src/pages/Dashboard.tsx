import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Plus, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [agentCount, setAgentCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadAgents(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadAgents(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadAgents = async (userId: string) => {
    const { count } = await supabase
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    setAgentCount(count || 0);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo ao Sagitta iA</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Agentes</CardTitle>
              <Bot className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{agentCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Agentes Ativos</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ações Rápidas</CardTitle>
              <Plus className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/agents")} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Novo Agente
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
