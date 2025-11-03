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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [aiConfig, setAiConfig] = useState({
    mode: "decentralized" as "centralized" | "decentralized",
    available_providers: {
      openai: true,
      anthropic: true,
      google: true,
    },
    provider_configs: {} as Record<string, any>,
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

    // Load AI config
    const { data: aiData } = await supabase
      .from("ai_config")
      .select("*")
      .single();

    if (aiData) {
      setAiConfig({
        mode: aiData.mode as "centralized" | "decentralized",
        available_providers: aiData.available_providers as { openai: boolean; anthropic: boolean; google: boolean },
        provider_configs: (aiData.provider_configs || {}) as Record<string, any>,
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

      // Save AI config
      const { data: existingAiConfig } = await supabase
        .from("ai_config")
        .select("id")
        .single();

      if (existingAiConfig) {
        await supabase
          .from("ai_config")
          .update({
            mode: aiConfig.mode,
            available_providers: aiConfig.available_providers,
            provider_configs: aiConfig.provider_configs,
          })
          .eq("id", existingAiConfig.id);
      } else {
        await supabase
          .from("ai_config")
          .insert({
            mode: aiConfig.mode,
            available_providers: aiConfig.available_providers,
            provider_configs: aiConfig.provider_configs,
          });
      }

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

        <Tabs defaultValue="evolution" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="evolution">Evolution API</TabsTrigger>
            <TabsTrigger value="ai">Configuração de IA</TabsTrigger>
          </TabsList>

          <TabsContent value="evolution">
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Inteligência Artificial</CardTitle>
                <CardDescription>
                  Configure como os modelos de IA serão utilizados pelos agentes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="ai_mode">Modo de Operação</Label>
                  <Select
                    value={aiConfig.mode}
                    onValueChange={(value: "centralized" | "decentralized") => 
                      setAiConfig({ ...aiConfig, mode: value })
                    }
                  >
                    <SelectTrigger id="ai_mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="centralized">
                        Centralizado (Admin gerencia tudo)
                      </SelectItem>
                      <SelectItem value="decentralized">
                        Descentralizado (Usuários configuram)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {aiConfig.mode === "centralized"
                      ? "Você paga pelos custos de IA e define quais modelos estão disponíveis"
                      : "Usuários configuram suas próprias APIs e arcam com os custos"}
                  </p>
                </div>

                {aiConfig.mode === "centralized" && (
                  <>
                    <div className="space-y-3">
                      <Label>Provedores Disponíveis</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="openai"
                            checked={aiConfig.available_providers.openai}
                            onCheckedChange={(checked) =>
                              setAiConfig({
                                ...aiConfig,
                                available_providers: {
                                  ...aiConfig.available_providers,
                                  openai: checked as boolean,
                                },
                              })
                            }
                          />
                          <label htmlFor="openai" className="text-sm font-medium">
                            OpenAI (GPT-4, GPT-3.5, etc)
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="anthropic"
                            checked={aiConfig.available_providers.anthropic}
                            onCheckedChange={(checked) =>
                              setAiConfig({
                                ...aiConfig,
                                available_providers: {
                                  ...aiConfig.available_providers,
                                  anthropic: checked as boolean,
                                },
                              })
                            }
                          />
                          <label htmlFor="anthropic" className="text-sm font-medium">
                            Anthropic (Claude)
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="google"
                            checked={aiConfig.available_providers.google}
                            onCheckedChange={(checked) =>
                              setAiConfig({
                                ...aiConfig,
                                available_providers: {
                                  ...aiConfig.available_providers,
                                  google: checked as boolean,
                                },
                              })
                            }
                          />
                          <label htmlFor="google" className="text-sm font-medium">
                            Google (Gemini)
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>API Keys dos Provedores</Label>
                      {aiConfig.available_providers.openai && (
                        <div className="space-y-2">
                          <Label htmlFor="openai_key" className="text-sm">OpenAI API Key</Label>
                          <Input
                            id="openai_key"
                            type="password"
                            placeholder="sk-..."
                            value={aiConfig.provider_configs.openai?.api_key || ""}
                            onChange={(e) =>
                              setAiConfig({
                                ...aiConfig,
                                provider_configs: {
                                  ...aiConfig.provider_configs,
                                  openai: { api_key: e.target.value },
                                },
                              })
                            }
                          />
                        </div>
                      )}
                      {aiConfig.available_providers.anthropic && (
                        <div className="space-y-2">
                          <Label htmlFor="anthropic_key" className="text-sm">Anthropic API Key</Label>
                          <Input
                            id="anthropic_key"
                            type="password"
                            placeholder="sk-ant-..."
                            value={aiConfig.provider_configs.anthropic?.api_key || ""}
                            onChange={(e) =>
                              setAiConfig({
                                ...aiConfig,
                                provider_configs: {
                                  ...aiConfig.provider_configs,
                                  anthropic: { api_key: e.target.value },
                                },
                              })
                            }
                          />
                        </div>
                      )}
                      {aiConfig.available_providers.google && (
                        <div className="space-y-2">
                          <Label htmlFor="google_key" className="text-sm">Google AI API Key</Label>
                          <Input
                            id="google_key"
                            type="password"
                            placeholder="AIza..."
                            value={aiConfig.provider_configs.google?.api_key || ""}
                            onChange={(e) =>
                              setAiConfig({
                                ...aiConfig,
                                provider_configs: {
                                  ...aiConfig.provider_configs,
                                  google: { api_key: e.target.value },
                                },
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <Button onClick={saveConfig} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </Tabs>

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
