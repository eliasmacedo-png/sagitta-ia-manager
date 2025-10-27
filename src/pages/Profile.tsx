import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      else {
        setUser(session.user);
        loadProfile(session.user.id);
      }
    });
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setFullName(data.full_name || "");
  };

  const updateProfile = async () => {
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
    if (error) toast.error("Erro ao atualizar");
    else toast.success("Perfil atualizado!");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-4xl font-bold mb-8">Meu Perfil</h1>
        <Card>
          <CardHeader><CardTitle>Informações Pessoais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Email</Label><Input value={user.email} disabled /></div>
            <div><Label>Nome Completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <Button onClick={updateProfile}>Salvar Alterações</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
