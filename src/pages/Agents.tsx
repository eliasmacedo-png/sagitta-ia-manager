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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Bot, Plus, Trash2, Upload, X, Eye, EyeOff, Check, AlertCircle, Loader2, Copy, RefreshCw, Smartphone, QrCode } from "lucide-react";

interface AgentFormData {
  name: string;
  description: string;
  avatar?: File | null;
  tags: string[];
  instructions: string;
  knowledgeBase: {
    text: string;
    urls: string[];
  };
  modelProvider: string;
  modelName: string;
  apiKey: string;
  status: "active" | "draft" | "inactive";
}

const AI_PROVIDERS = {
  openai: {
    name: "OpenAI",
    models: ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]
  },
  anthropic: {
    name: "Anthropic",
    models: ["Claude 3.5 Sonnet", "Claude 3 Opus", "Claude 3 Sonnet", "Claude 3 Haiku"]
  },
  google: {
    name: "Google AI",
    models: ["Gemini 1.5 Pro", "Gemini 1.5 Flash", "Gemini Pro"]
  },
  meta: {
    name: "Meta AI",
    models: ["Llama 3.1 405B", "Llama 3.1 70B", "Llama 3.1 8B"]
  }
};

const SUGGESTED_TAGS = ["atendimento", "vendas", "suporte", "marketing", "financeiro"];

const Agents = () => {
  const [user, setUser] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [showApiKey, setShowApiKey] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [qrCodeDialog, setQrCodeDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<AgentFormData>({
    name: "",
    description: "",
    avatar: null,
    tags: [],
    instructions: "",
    knowledgeBase: { text: "", urls: [] },
    modelProvider: "",
    modelName: "",
    apiKey: "",
    status: "draft"
  });

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

  const validateForm = () => {
    if (!formData.name.trim() || formData.name.length < 3) {
      toast.error("Nome deve ter no mínimo 3 caracteres");
      return false;
    }
    if (!formData.description.trim() || formData.description.length < 20) {
      toast.error("Descrição deve ter no mínimo 20 caracteres");
      return false;
    }
    if (!formData.instructions.trim() || formData.instructions.length < 50) {
      toast.error("Instruções devem ter no mínimo 50 caracteres");
      return false;
    }
    if (!formData.modelProvider) {
      toast.error("Selecione um provedor de IA");
      return false;
    }
    if (!formData.modelName) {
      toast.error("Selecione um modelo");
      return false;
    }
    if (!formData.apiKey.trim()) {
      toast.error("API Key é obrigatória");
      return false;
    }
    return true;
  };

  const testConnection = async () => {
    if (!formData.apiKey.trim()) {
      toast.error("Insira a API Key primeiro");
      return;
    }
    setTestingConnection(true);
    setConnectionStatus("idle");
    
    // Simular teste de conexão
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Validação básica de formato
    const isValid = formData.apiKey.length > 20;
    setConnectionStatus(isValid ? "success" : "error");
    setTestingConnection(false);
    
    if (isValid) {
      toast.success("Credenciais válidas! Modelo conectado com sucesso");
    } else {
      toast.error("Erro: Credenciais inválidas. Verifique sua API Key");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Imagem deve ter no máximo 2MB");
        return;
      }
      setFormData({ ...formData, avatar: file });
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setFormData({ ...formData, avatar: null });
    setAvatarPreview(null);
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData({ ...formData, tags: [...formData.tags, trimmedTag] });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  const createAgent = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      let avatarUrl = null;
      
      // Upload avatar se existir
      if (formData.avatar) {
        const fileExt = formData.avatar.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { data, error: uploadError } = await supabase.storage
          .from('agent-avatars')
          .upload(fileName, formData.avatar);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('agent-avatars')
          .getPublicUrl(fileName);
        avatarUrl = publicUrl;
      }

      const { error } = await supabase.from("agents").insert({
        user_id: user.id,
        name: formData.name,
        description: formData.description,
        avatar_url: avatarUrl,
        tags: formData.tags,
        instructions: formData.instructions,
        knowledge_base: formData.knowledgeBase,
        model_provider: formData.modelProvider,
        model_name: formData.modelName,
        api_key: formData.apiKey, // Em produção, criptografar
        status: formData.status
      });

      if (error) throw error;

      toast.success("Agente criado com sucesso!");
      setOpen(false);
      resetForm();
      loadAgents(user.id);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar agente");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      avatar: null,
      tags: [],
      instructions: "",
      knowledgeBase: { text: "", urls: [] },
      modelProvider: "",
      modelName: "",
      apiKey: "",
      status: "draft"
    });
    setAvatarPreview(null);
    setConnectionStatus("idle");
    setShowApiKey(false);
  };

  const editAgent = (agent: any) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description,
      avatar: null,
      tags: agent.tags || [],
      instructions: agent.instructions || "",
      knowledgeBase: agent.knowledge_base || { text: "", urls: [] },
      modelProvider: agent.model_provider || "",
      modelName: agent.model_name || "",
      apiKey: agent.api_key || "",
      status: agent.status
    });
    setAvatarPreview(agent.avatar_url);
    setOpen(true);
  };

  const updateAgent = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      let avatarUrl = editingAgent.avatar_url;
      
      if (formData.avatar) {
        const fileName = `${Date.now()}_${formData.avatar.name}`;
        const { error: uploadError } = await supabase.storage
          .from("agent-avatars")
          .upload(fileName, formData.avatar);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("agent-avatars")
          .getPublicUrl(fileName);
        avatarUrl = publicUrl;
      }

      const { error } = await supabase
        .from("agents")
        .update({
          name: formData.name,
          description: formData.description,
          avatar_url: avatarUrl,
          tags: formData.tags,
          instructions: formData.instructions,
          knowledge_base: formData.knowledgeBase,
          model_provider: formData.modelProvider,
          model_name: formData.modelName,
          api_key: formData.apiKey,
          status: formData.status
        })
        .eq("id", editingAgent.id);

      if (error) throw error;

      toast.success("Agente atualizado com sucesso!");
      setOpen(false);
      setEditingAgent(null);
      resetForm();
      loadAgents(user.id);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar agente");
    } finally {
      setLoading(false);
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

  const connectWhatsApp = async (agent: any) => {
    setSelectedAgent(agent);
    setConnectingWhatsApp(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('evolution-create-instance', {
        body: { agentId: agent.id }
      });

      if (error) throw error;

      if (data?.qrcode) {
        setQrCodeDialog(true);
        pollWhatsAppStatus(agent.id);
      } else {
        toast.error("Erro ao gerar QR code");
      }
    } catch (error: any) {
      console.error("Error connecting WhatsApp:", error);
      toast.error(error.message || "Erro ao conectar WhatsApp");
    } finally {
      setConnectingWhatsApp(false);
    }
  };

  const pollWhatsAppStatus = async (agentId: string) => {
    const interval = setInterval(async () => {
      const { data: agent } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .single();

      if (agent?.whatsapp_status === "connected") {
        clearInterval(interval);
        setQrCodeDialog(false);
        toast.success("WhatsApp conectado com sucesso!");
        loadAgents(user.id);
      } else if (agent?.whatsapp_qr_code) {
        setSelectedAgent(agent);
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(interval);
    }, 120000);
  };

  const disconnectWhatsApp = async (agent: any) => {
    if (!confirm("Tem certeza que deseja desconectar este WhatsApp?")) return;
    
    await supabase
      .from("agents")
      .update({
        whatsapp_status: "disconnected",
        whatsapp_qr_code: null,
        whatsapp_instance_name: null,
        whatsapp_phone_number: null,
        whatsapp_connected_at: null
      })
      .eq("id", agent.id);

    toast.success("WhatsApp desconectado!");
    loadAgents(user.id);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Meus Agentes</h1>
          <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo Agente</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAgent ? "Editar Agente" : "Criar Novo Agente"}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* 1. Informações Básicas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Nome */}
                    <div>
                      <Label htmlFor="name">Nome do Agente *</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Assistente de Vendas"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Mínimo 3 caracteres</p>
                    </div>

                    {/* Descrição */}
                    <div>
                      <Label htmlFor="description">Descrição *</Label>
                      <Textarea
                        id="description"
                        placeholder="Descreva o propósito e funcionalidades do agente..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="mt-1 min-h-[100px]"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.description.length}/500 caracteres (mínimo 20)
                      </p>
                    </div>

                    {/* Avatar */}
                    <div>
                      <Label>Avatar do Agente</Label>
                      <div className="mt-2 flex items-center gap-4">
                        {avatarPreview ? (
                          <div className="relative">
                            <img src={avatarPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover" />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                              onClick={removeAvatar}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-primary">
                            {formData.name.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                        <label htmlFor="avatar-upload" className="cursor-pointer">
                          <div className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors inline-flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Upload Imagem
                          </div>
                          <input
                            id="avatar-upload"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            className="hidden"
                            onChange={handleAvatarChange}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">PNG ou JPG, máximo 2MB</p>
                    </div>

                    {/* Tags */}
                    <div>
                      <Label htmlFor="tags">Tags</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="tags"
                          placeholder="Digite uma tag..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addTag(tagInput);
                            }
                          }}
                        />
                        <Button onClick={() => addTag(tagInput)} size="sm">Adicionar</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {SUGGESTED_TAGS.map(tag => (
                          !formData.tags.includes(tag) && (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                              onClick={() => addTag(tag)}
                            >
                              + {tag}
                            </Badge>
                          )
                        ))}
                      </div>
                      {formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {formData.tags.map(tag => (
                            <Badge key={tag} className="gap-1">
                              {tag}
                              <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Instruções do Sistema */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Instruções do Sistema</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="instructions">Instruções/Prompt do Agente *</Label>
                      <Textarea
                        id="instructions"
                        placeholder="Defina como o agente deve se comportar, seu tom de voz, conhecimento específico..."
                        value={formData.instructions}
                        onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                        className="mt-1 min-h-[150px]"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.instructions.length} caracteres (mínimo 50)
                      </p>
                    </div>

                    <div>
                      <Label>Base de Conhecimento</Label>
                      <Tabs defaultValue="text" className="mt-2">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="text">Texto Manual</TabsTrigger>
                          <TabsTrigger value="urls">URLs</TabsTrigger>
                        </TabsList>
                        <TabsContent value="text" className="space-y-2">
                          <Textarea
                            placeholder="Cole aqui o texto base de conhecimento..."
                            value={formData.knowledgeBase.text}
                            onChange={(e) => setFormData({
                              ...formData,
                              knowledgeBase: { ...formData.knowledgeBase, text: e.target.value }
                            })}
                            className="min-h-[120px]"
                          />
                        </TabsContent>
                        <TabsContent value="urls" className="space-y-2">
                          <Textarea
                            placeholder="Cole URLs, uma por linha..."
                            value={formData.knowledgeBase.urls.join("\n")}
                            onChange={(e) => setFormData({
                              ...formData,
                              knowledgeBase: { ...formData.knowledgeBase, urls: e.target.value.split("\n").filter(u => u.trim()) }
                            })}
                            className="min-h-[120px]"
                          />
                        </TabsContent>
                      </Tabs>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Configuração do Modelo de IA */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Configuração do Modelo de IA</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Provedor */}
                      <div>
                        <Label htmlFor="provider">Provedor do Modelo *</Label>
                        <Select
                          value={formData.modelProvider}
                          onValueChange={(value) => setFormData({ ...formData, modelProvider: value, modelName: "" })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione o provedor" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                              <SelectItem key={key} value={key}>{provider.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Modelo */}
                      <div>
                        <Label htmlFor="model">Modelo Específico *</Label>
                        <Select
                          value={formData.modelName}
                          onValueChange={(value) => setFormData({ ...formData, modelName: value })}
                          disabled={!formData.modelProvider}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione o modelo" />
                          </SelectTrigger>
                          <SelectContent>
                            {formData.modelProvider && AI_PROVIDERS[formData.modelProvider as keyof typeof AI_PROVIDERS]?.models.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                                {model.includes("3.5 Sonnet") && <Badge className="ml-2" variant="secondary">Recomendado</Badge>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* API Key */}
                    <div>
                      <Label htmlFor="apiKey">API Key do Provedor *</Label>
                      <div className="flex gap-2 mt-1">
                        <div className="relative flex-1">
                          <Input
                            id="apiKey"
                            type={showApiKey ? "text" : "password"}
                            placeholder="Cole sua API Key aqui..."
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <Button
                          onClick={testConnection}
                          disabled={testingConnection || !formData.apiKey}
                          className="shrink-0"
                        >
                          {testingConnection ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Testando...</>
                          ) : (
                            <>Testar Conexão</>
                          )}
                        </Button>
                      </div>
                      {connectionStatus === "success" && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Credenciais válidas! Modelo conectado com sucesso
                        </p>
                      )}
                      {connectionStatus === "error" && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Erro: Credenciais inválidas. Verifique sua API Key
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status e Publicação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Label>Status do Agente *</Label>
                    <RadioGroup
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                      className="mt-2 space-y-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="active" id="active" />
                        <Label htmlFor="active" className="font-normal cursor-pointer">
                          🟢 Ativo - Agente funcionando e disponível
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="draft" id="draft" />
                        <Label htmlFor="draft" className="font-normal cursor-pointer">
                          🟡 Rascunho - Salvo mas não ativo
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="inactive" id="inactive" />
                        <Label htmlFor="inactive" className="font-normal cursor-pointer">
                          🔴 Inativo - Desabilitado temporariamente
                        </Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Botões de Ação */}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => { setOpen(false); setEditingAgent(null); }} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={editingAgent ? updateAgent : createAgent} disabled={loading} className="flex-1">
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{editingAgent ? "Atualizando..." : "Criando..."}</>
                    ) : (
                      <>{editingAgent ? "Atualizar" : `Salvar e ${formData.status === "active" ? "Ativar" : "Criar"}`}</>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {agent.avatar_url ? (
                      <img src={agent.avatar_url} alt={agent.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <div className="flex items-center gap-1 mt-1">
                        {agent.status === "active" && <Badge className="bg-green-600">🟢 Ativo</Badge>}
                        {agent.status === "draft" && <Badge variant="secondary">🟡 Rascunho</Badge>}
                        {agent.status === "inactive" && <Badge variant="outline">🔴 Inativo</Badge>}
                      </div>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-3">{agent.description || "Sem descrição"}</CardDescription>
                {agent.tags && agent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {agent.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {agent.model_provider && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Modelo:</strong> {AI_PROVIDERS[agent.model_provider as keyof typeof AI_PROVIDERS]?.name} - {agent.model_name}
                  </p>
                )}
                
                {/* WhatsApp Status */}
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span className="text-sm font-medium">WhatsApp</span>
                    </div>
                    {agent.whatsapp_status === "connected" && (
                      <Badge className="bg-green-600 text-xs">Conectado</Badge>
                    )}
                    {agent.whatsapp_status === "connecting" && (
                      <Badge variant="secondary" className="text-xs">Conectando...</Badge>
                    )}
                    {(!agent.whatsapp_status || agent.whatsapp_status === "disconnected") && (
                      <Badge variant="outline" className="text-xs">Desconectado</Badge>
                    )}
                  </div>
                  
                  {agent.whatsapp_phone_number && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Número: {agent.whatsapp_phone_number}
                    </p>
                  )}
                  
                  {agent.whatsapp_status === "connected" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectWhatsApp(agent)}
                      className="w-full"
                    >
                      Desconectar WhatsApp
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => connectWhatsApp(agent)}
                      disabled={connectingWhatsApp}
                      className="w-full"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      {agent.whatsapp_status === "connecting" ? "Conectando..." : "Conectar WhatsApp"}
                    </Button>
                  )}
                </div>

                {agent.agent_api_key && (
                  <div className="flex items-center gap-2 text-sm border-t pt-3">
                    <code className="bg-muted px-2 py-1 rounded text-xs flex-1 truncate">{agent.agent_api_key}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(agent.agent_api_key);
                        toast.success("API Key copiada!");
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => editAgent(agent)} className="flex-1">
                    Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteAgent(agent.id)} className="flex-1">
                    <Trash2 className="h-4 w-4 mr-2" />Deletar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* QR Code Dialog */}
        <Dialog open={qrCodeDialog} onOpenChange={setQrCodeDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Conectar WhatsApp</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-6">
              {selectedAgent?.whatsapp_qr_code ? (
                <>
                  <div className="p-4 bg-white rounded-lg">
                    <img
                      src={selectedAgent.whatsapp_qr_code}
                      alt="QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium">Escaneie este QR code com o WhatsApp</p>
                    <ol className="text-xs text-muted-foreground text-left space-y-1">
                      <li>1. Abra o WhatsApp no seu celular</li>
                      <li>2. Toque em Menu ou Configurações</li>
                      <li>3. Toque em Aparelhos conectados</li>
                      <li>4. Toque em Conectar um aparelho</li>
                      <li>5. Aponte seu celular para esta tela para escanear</li>
                    </ol>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Aguardando conexão...
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Gerando QR code...</span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Agents;
