import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield } from "lucide-react";

const InitialSetup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "elias.macedo@sagittadigital.com.br",
    password: "elias.macedo@sagittadigital.com.br",
    fullName: "Elias Macedo",
  });

  const createAdminAccount = async () => {
    setLoading(true);
    try {
      // Try to sign in first (user might already exist)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      let userId = signInData?.user?.id;

      // If sign in failed, try to create account
      if (signInError) {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
            },
          },
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error("Failed to create user");
        
        userId = authData.user.id;
      }

      if (!userId) throw new Error("No user ID available");

      // Check if admin role already exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      // Add admin role if it doesn't exist
      if (!existingRole) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'admin',
          });

        if (roleError) throw roleError;
      }

      toast.success("Conta de administrador configurada com sucesso!");
      navigate("/admin");
    } catch (error) {
      console.error("Error creating admin account:", error);
      toast.error("Erro ao criar conta de administrador");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>Configuração Inicial</CardTitle>
          <CardDescription>
            Crie a conta de administrador padrão para começar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <Button 
            onClick={createAdminAccount} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Criando..." : "Criar Conta de Administrador"}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Esta conta terá acesso total ao painel de administração
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InitialSetup;
