import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Save, Copy, Check } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState({
    base_url: "",
    api_key: "",
    webhook_url: "",
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (error || !roles) {
        toast.error("Acesso negado. Você não tem permissão de administrador.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      loadConfig();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    const { data, error } = await supabase
      .from("evolution_config")
      .select("*")
      .single();

    if (data) {
      setConfig({
        base_url: data.base_url,
        api_key: data.api_key,
        webhook_url: data.webhook_url,
      });
    }
  };

  const saveConfig = async () => {
    if (!config.base_url || !config.api_key) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate webhook URL if not provided
      const webhookUrl = config.webhook_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-webhook`;

      // Check if config exists
      const { data: existing } = await supabase
        .from("evolution_config")
        .select("id")
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("evolution_config")
          .update({
            base_url: config.base_url,
            api_key: config.api_key,
            webhook_url: webhookUrl,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("evolution_config")
          .insert({
            base_url: config.base_url,
            api_key: config.api_key,
            webhook_url: webhookUrl,
            created_by: user?.id,
          });

        if (error) throw error;
      }

      setConfig(prev => ({ ...prev, webhook_url: webhookUrl }));
      toast.success("Configuração salva com sucesso!");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = config.webhook_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-webhook`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("URL copiada para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6 flex items-center justify-center">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Painel de Administração</h1>
            <p className="text-muted-foreground">Configure a integração com Evolution API</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuração da Evolution API</CardTitle>
            <CardDescription>
              Configure a URL base e a chave API para conectar com a Evolution API.
              Todos os agentes usarão esta configuração.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="base_url">URL Base da Evolution API *</Label>
              <Input
                id="base_url"
                placeholder="https://api.evolution.com"
                value={config.base_url}
                onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key *</Label>
              <Input
                id="api_key"
                type="password"
                placeholder="sua-api-key-aqui"
                value={config.api_key}
                onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook_url">URL do Webhook</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook_url"
                  readOnly
                  value={config.webhook_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-webhook`}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyWebhookUrl}
                  title="Copiar URL"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Esta URL será configurada automaticamente nos webhooks de cada instância.
                Use esta URL para configurar os webhooks na Evolution API.
              </p>
            </div>

            <Button onClick={saveConfig} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• A URL do webhook será usada para receber eventos da Evolution API</p>
            <p>• Cada agente criará automaticamente uma instância separada no WhatsApp</p>
            <p>• Os usuários poderão escanear o QR code para conectar seus agentes</p>
            <p>• A configuração global é compartilhada entre todos os agentes</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
