import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Bot, Sparkles, Users, Zap } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section 
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Powered by AI Technology</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Sagitta <span className="text-primary">iA</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            Crie e gerencie agentes de inteligência artificial de forma simples e eficiente
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <Button 
              variant="hero" 
              size="xl"
              onClick={() => navigate("/auth")}
            >
              Começar Agora
            </Button>
            <Button 
              variant="outline" 
              size="xl"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Saiba Mais
            </Button>
          </div>
        </div>

        {/* Floating elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-700" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">
            Recursos <span className="text-primary">Principais</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card rounded-2xl p-8 shadow-[var(--shadow-card)] hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Gestão de Agentes</h3>
              <p className="text-muted-foreground">
                Crie, edite e gerencie múltiplos agentes de IA com interface intuitiva e fácil de usar
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 shadow-[var(--shadow-card)] hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Integração N8N</h3>
              <p className="text-muted-foreground">
                Conecte seus agentes ao N8N para processamento avançado e automação de workflows
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 shadow-[var(--shadow-card)] hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Multi-usuário</h3>
              <p className="text-muted-foreground">
                Sistema completo de autenticação e gerenciamento de usuários para sua equipe
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Pronto para começar?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Junte-se a nós e comece a criar seus agentes de IA hoje mesmo
          </p>
          <Button 
            variant="hero" 
            size="xl"
            onClick={() => navigate("/auth")}
          >
            Criar Conta Gratuita
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;
