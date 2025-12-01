import React, { useEffect, useState } from 'react';
import Lenis from '@studio-freight/lenis';
import { ZoomParallax } from '@/components/ui/zoom-parallax';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { motion } from 'framer-motion';
import logoPilar from '@/assets/logo-pilar.png';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkUser();

    // Setup smooth scroll
    const lenis = new Lenis();
    
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    
    requestAnimationFrame(raf);

    // Show login after scroll
    const handleScroll = () => {
      const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercentage > 85) {
        setShowLogin(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      lenis.destroy();
    };
  }, [navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Defer database queries to avoid deadlock
        setTimeout(async () => {
          try {
            // Buscar dados do usuário após autenticação
            const { data: usuario, error } = await supabase
              .from("usuarios")
              .select("id, estabelecimento_id")
              .eq("auth_user_id", session.user.id)
              .maybeSingle();

            if (error) {
              console.error("Erro ao buscar usuário:", error);
              return;
            }

            if (usuario) {
              // Salvar informações no localStorage
              localStorage.setItem("userType", "user");
              localStorage.setItem("userId", usuario.id);
              localStorage.setItem("estabelecimentoId", usuario.estabelecimento_id);
              
              navigate('/dashboard');
            } else {
              console.error("Usuário não encontrado no sistema");
              await supabase.auth.signOut();
            }
          } catch (err) {
            console.error("Erro ao processar login:", err);
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const images = [
    {
      src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1280&h=720&fit=crop&crop=entropy&auto=format&q=80',
      alt: 'Dashboard de análise de dados',
    },
    {
      src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1280&h=720&fit=crop&crop=entropy&auto=format&q=80',
      alt: 'Gráficos e métricas empresariais',
    },
    {
      src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=800&fit=crop&crop=entropy&auto=format&q=80',
      alt: 'Gestão empresarial moderna',
    },
    {
      src: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1280&h=720&fit=crop&crop=entropy&auto=format&q=80',
      alt: 'Equipe colaborativa',
    },
    {
      src: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=800&fit=crop&crop=entropy&auto=format&q=80',
      alt: 'Profissional trabalhando',
    },
    {
      src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1280&h=720&fit=crop&crop=entropy&auto=format&q=80',
      alt: 'Análise de negócios',
    },
    {
      src: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1280&h=720&fit=crop&crop=entropy&auto=format&q=80',
      alt: 'Reunião de equipe',
    },
  ];

  return (
    <main className="min-h-screen w-full bg-background">
      <div className="relative flex h-screen items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-transparent z-10" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-20 text-center px-4"
        >
          <motion.img
            src={logoPilar}
            alt="Pilar"
            className="h-32 md:h-48 w-auto mx-auto mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
          />
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Sistema de Gestão Empresarial
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Simplifique sua gestão, maximize seus resultados
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-sm text-muted-foreground"
          >
            Role para começar
          </motion.div>
        </motion.div>
      </div>

      <ZoomParallax images={images} />

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: showLogin ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-transparent to-background"
      >
        {showLogin && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="bg-card border border-border rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Bem-vindo de volta</h2>
                <p className="text-muted-foreground">
                  Faça login para acessar o sistema
                </p>
              </div>
              
              <Auth
                supabaseClient={supabase}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: 'hsl(var(--primary))',
                        brandAccent: 'hsl(var(--primary))',
                      },
                    },
                  },
                }}
                localization={{
                  variables: {
                    sign_in: {
                      email_label: 'Email',
                      password_label: 'Senha',
                      button_label: 'Entrar',
                      loading_button_label: 'Entrando...',
                      link_text: 'Já tem uma conta? Entre',
                    },
                    sign_up: {
                      email_label: 'Email',
                      password_label: 'Senha',
                      button_label: 'Criar conta',
                      loading_button_label: 'Criando conta...',
                      link_text: 'Não tem conta? Cadastre-se',
                    },
                  },
                }}
                providers={[]}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}
