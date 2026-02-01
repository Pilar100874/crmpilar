import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Monitor, Apple, Smartphone, CheckCircle2, AlertCircle, Globe } from "lucide-react";

export function ExtensionInstallManual() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <BookOpen className="h-4 w-4" />
          Manual de Instalação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Manual de Instalação da Extensão
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="windows-chrome" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="windows-chrome" className="gap-1 text-xs sm:text-sm">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Chrome</span>
            </TabsTrigger>
            <TabsTrigger value="windows-edge" className="gap-1 text-xs sm:text-sm">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Edge</span>
            </TabsTrigger>
            <TabsTrigger value="mac" className="gap-1 text-xs sm:text-sm">
              <Apple className="h-4 w-4" />
              <span className="hidden sm:inline">Mac</span>
            </TabsTrigger>
            <TabsTrigger value="android" className="gap-1 text-xs sm:text-sm">
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Android</span>
            </TabsTrigger>
          </TabsList>

          {/* Chrome Windows Tab */}
          <TabsContent value="windows-chrome" className="mt-4 space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
                Requisitos
              </h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Google Chrome instalado</li>
                <li>• Windows 10 ou superior</li>
              </ul>
            </div>

            <div className="space-y-4">
              <Step number={1} title="Baixar a extensão">
                <p>Clique no botão <strong>"Baixar Extensão"</strong> acima.</p>
                <p className="text-muted-foreground">O arquivo <code className="bg-muted px-1 rounded">crm-pilar-monitor-extension.zip</code> será baixado.</p>
              </Step>

              <Step number={2} title="Extrair o arquivo ZIP">
                <p>Localize o arquivo na pasta <strong>Downloads</strong>.</p>
                <p>Clique com o botão direito → <strong>"Extrair tudo..."</strong></p>
                <p className="text-muted-foreground">Escolha um local fácil de lembrar (ex: Área de Trabalho).</p>
              </Step>

              <Step number={3} title="Abrir as extensões do Chrome">
                <p>Abra o Google Chrome.</p>
                <p>Digite na barra de endereço: <code className="bg-muted px-2 py-1 rounded">chrome://extensions</code></p>
                <p>Pressione <strong>Enter</strong>.</p>
              </Step>

              <Step number={4} title="Ativar o Modo do desenvolvedor">
                <p>No canto <strong>superior direito</strong> da página de extensões, ative o botão <strong>"Modo do desenvolvedor"</strong>.</p>
              </Step>

              <Step number={5} title="Carregar a extensão">
                <p>Clique em <strong>"Carregar sem compactação"</strong>.</p>
                <p>Navegue até a pasta que você extraiu e selecione-a.</p>
                <p>Clique em <strong>"Selecionar pasta"</strong>.</p>
              </Step>

              <Step number={6} title="Abrir o popup da extensão">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 my-2">
                  <p className="font-medium text-primary mb-2">🧩 Como abrir:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Procure o ícone de <strong>quebra-cabeça (puzzle)</strong> no canto superior direito do Chrome</li>
                    <li>Clique nele para ver a lista de extensões</li>
                    <li>Clique em <strong>"CRM Pilar - Monitor de Tela"</strong></li>
                  </ol>
                </div>
                <p className="text-xs text-muted-foreground">💡 Dica: Clique no alfinete (📌) para fixar a extensão na barra e ter acesso rápido.</p>
              </Step>

              <Step number={7} title="Iniciar o monitoramento">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 my-2">
                  <p className="font-medium text-green-600 dark:text-green-400 mb-2">📋 No popup que abrir:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Seu ID de usuário será preenchido automaticamente</li>
                    <li>Clique no botão <strong>"Iniciar Monitoramento"</strong></li>
                    <li>Selecione <strong>"Tela inteira"</strong> na janela que aparecer</li>
                    <li>Clique em <strong>"Compartilhar"</strong></li>
                  </ol>
                </div>
                <p className="text-xs text-muted-foreground">Após iniciar, o status mudará para <strong>"Ativo"</strong> (verde).</p>
              </Step>
            </div>
          </TabsContent>

          {/* Edge Windows Tab */}
          <TabsContent value="windows-edge" className="mt-4 space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
                Requisitos
              </h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Microsoft Edge instalado (já vem com Windows 10/11)</li>
                <li>• Windows 10 ou superior</li>
              </ul>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-600 dark:text-green-400 mb-1">
                    Compatibilidade Total
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    O Microsoft Edge é baseado no Chromium, então a extensão funciona perfeitamente!
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Step number={1} title="Baixar a extensão">
                <p>Clique no botão <strong>"Baixar Extensão"</strong> acima.</p>
                <p className="text-muted-foreground">O arquivo <code className="bg-muted px-1 rounded">crm-pilar-monitor-extension.zip</code> será baixado.</p>
              </Step>

              <Step number={2} title="Extrair o arquivo ZIP">
                <p>Localize o arquivo na pasta <strong>Downloads</strong>.</p>
                <p>Clique com o botão direito → <strong>"Extrair tudo..."</strong></p>
                <p className="text-muted-foreground">Escolha um local fácil de lembrar (ex: Área de Trabalho).</p>
              </Step>

              <Step number={3} title="Abrir as extensões do Edge">
                <p>Abra o Microsoft Edge.</p>
                <p>Digite na barra de endereço: <code className="bg-muted px-2 py-1 rounded">edge://extensions</code></p>
                <p>Pressione <strong>Enter</strong>.</p>
              </Step>

              <Step number={4} title="Ativar o Modo do desenvolvedor">
                <p>No canto <strong>inferior esquerdo</strong> da página de extensões, ative o botão <strong>"Modo do desenvolvedor"</strong>.</p>
                <p className="text-muted-foreground">⚠️ No Edge, o botão fica embaixo, diferente do Chrome!</p>
              </Step>

              <Step number={5} title="Carregar a extensão">
                <p>Clique em <strong>"Carregar descompactada"</strong>.</p>
                <p>Navegue até a pasta que você extraiu e selecione-a.</p>
                <p>Clique em <strong>"Selecionar pasta"</strong>.</p>
              </Step>

              <Step number={6} title="Abrir o popup da extensão">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 my-2">
                  <p className="font-medium text-primary mb-2">🧩 Como abrir:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Procure o ícone de <strong>extensões (puzzle)</strong> no canto superior direito do Edge</li>
                    <li>Clique nele para ver a lista de extensões</li>
                    <li>Clique em <strong>"CRM Pilar - Monitor de Tela"</strong></li>
                  </ol>
                </div>
                <p className="text-xs text-muted-foreground">💡 Dica: Clique no ícone de olho (👁) para fixar a extensão na barra de ferramentas.</p>
              </Step>

              <Step number={7} title="Iniciar o monitoramento">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 my-2">
                  <p className="font-medium text-green-600 dark:text-green-400 mb-2">📋 No popup que abrir:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Seu ID de usuário será preenchido automaticamente</li>
                    <li>Clique no botão <strong>"Iniciar Monitoramento"</strong></li>
                    <li>Selecione <strong>"Tela inteira"</strong> na janela que aparecer</li>
                    <li>Clique em <strong>"Compartilhar"</strong></li>
                  </ol>
                </div>
                <p className="text-xs text-muted-foreground">Após iniciar, o status mudará para <strong>"Ativo"</strong> (verde).</p>
              </Step>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-600 dark:text-amber-400 mb-1">
                    Aviso Normal
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    O Edge pode mostrar um aviso dizendo que a extensão não é do "Edge Add-ons". 
                    Isso é normal e não afeta o funcionamento - a extensão funciona perfeitamente!
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Mac Tab */}
          <TabsContent value="mac" className="mt-4 space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
                Requisitos
              </h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Google Chrome ou Microsoft Edge instalado</li>
                <li>• macOS 10.15 (Catalina) ou superior</li>
              </ul>
            </div>

            <div className="space-y-4">
              <Step number={1} title="Baixar a extensão">
                <p>Clique no botão <strong>"Baixar Extensão"</strong> acima.</p>
                <p className="text-muted-foreground">O arquivo será baixado para a pasta <strong>Downloads</strong>.</p>
              </Step>

              <Step number={2} title="Extrair o arquivo ZIP">
                <p>Abra o <strong>Finder</strong> e vá para <strong>Downloads</strong>.</p>
                <p>Dê um <strong>duplo clique</strong> no arquivo ZIP para extrair.</p>
                <p className="text-muted-foreground">Uma nova pasta será criada automaticamente.</p>
              </Step>

              <Step number={3} title="Abrir as extensões do navegador">
                <p>Abra o Google Chrome ou Microsoft Edge.</p>
                <p>No menu superior, clique em <strong>Chrome → Extensões → Gerenciar extensões</strong></p>
                <p className="text-muted-foreground">Ou digite: <code className="bg-muted px-2 py-1 rounded">chrome://extensions</code> ou <code className="bg-muted px-2 py-1 rounded">edge://extensions</code></p>
              </Step>

              <Step number={4} title="Ativar o Modo do desenvolvedor">
                <p>Chrome: No canto <strong>superior direito</strong> da página.</p>
                <p>Edge: No canto <strong>inferior esquerdo</strong> da página.</p>
                <p>Ative o botão <strong>"Modo do desenvolvedor"</strong>.</p>
              </Step>

              <Step number={5} title="Carregar a extensão">
                <p>Clique em <strong>"Carregar sem compactação"</strong> (Chrome) ou <strong>"Carregar descompactada"</strong> (Edge).</p>
                <p>Use o Finder para navegar até a pasta extraída.</p>
                <p>Selecione a pasta e clique em <strong>"Selecionar"</strong>.</p>
              </Step>

              <Step number={6} title="Permitir captura de tela">
                <p>No Mac, você precisa permitir o navegador a capturar a tela.</p>
                <p>Vá em <strong>Preferências do Sistema → Privacidade e Segurança → Gravação de Tela</strong>.</p>
                <p>Marque a caixa ao lado do navegador (Chrome ou Edge).</p>
              </Step>

              <Step number={7} title="Abrir o popup da extensão">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 my-2">
                  <p className="font-medium text-primary mb-2">🧩 Como abrir:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Procure o ícone de <strong>quebra-cabeça (puzzle)</strong> no canto superior direito</li>
                    <li>Clique nele para ver a lista de extensões</li>
                    <li>Clique em <strong>"CRM Pilar - Monitor de Tela"</strong></li>
                  </ol>
                </div>
              </Step>

              <Step number={8} title="Iniciar o monitoramento">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 my-2">
                  <p className="font-medium text-green-600 dark:text-green-400 mb-2">📋 No popup que abrir:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Seu ID de usuário será preenchido automaticamente</li>
                    <li>Clique no botão <strong>"Iniciar Monitoramento"</strong></li>
                    <li>Selecione <strong>"Tela inteira"</strong> na janela que aparecer</li>
                    <li>Clique em <strong>"Compartilhar"</strong></li>
                  </ol>
                </div>
                <p className="text-xs text-muted-foreground">Após iniciar, o status mudará para <strong>"Ativo"</strong> (verde).</p>
              </Step>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-600 dark:text-amber-400 mb-1">
                    Importante no Mac
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Na primeira vez que iniciar o monitoramento, o sistema pedirá permissão para gravar a tela. 
                    Você pode precisar <strong>reiniciar o navegador</strong> após conceder a permissão.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Android Tab */}
          <TabsContent value="android" className="mt-4 space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-600 dark:text-amber-400 mb-1">
                    Limitação no Android
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    O Chrome para Android <strong>não suporta extensões</strong>. 
                    Para monitoramento em dispositivos Android, utilize o navegador <strong>Kiwi Browser</strong> 
                    que é baseado no Chrome e suporta extensões.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Step number={1} title="Instalar o Kiwi Browser">
                <p>Abra a <strong>Play Store</strong> no seu Android.</p>
                <p>Pesquise por <strong>"Kiwi Browser"</strong>.</p>
                <p>Instale o navegador desenvolvido pela Geometry OU.</p>
              </Step>

              <Step number={2} title="Baixar a extensão">
                <p>No Kiwi Browser, acesse o CRM Pilar e vá para seu <strong>Perfil</strong>.</p>
                <p>Clique em <strong>"Baixar Extensão"</strong>.</p>
                <p className="text-muted-foreground">O arquivo ZIP será baixado.</p>
              </Step>

              <Step number={3} title="Extrair o arquivo ZIP">
                <p>Use um aplicativo de arquivos (como <strong>Files by Google</strong>).</p>
                <p>Localize o arquivo ZIP em <strong>Downloads</strong>.</p>
                <p>Toque e segure → <strong>"Extrair"</strong>.</p>
              </Step>

              <Step number={4} title="Abrir as extensões">
                <p>No Kiwi Browser, toque nos <strong>três pontos</strong> (menu).</p>
                <p>Toque em <strong>"Extensões"</strong>.</p>
              </Step>

              <Step number={5} title="Ativar o Modo de desenvolvedor">
                <p>Ative o <strong>"Modo de desenvolvedor"</strong> no topo da página.</p>
              </Step>

              <Step number={6} title="Carregar a extensão">
                <p>Toque em <strong>"+ (from .zip/.crx/.user.js)"</strong>.</p>
                <p>Navegue até a pasta extraída e selecione-a.</p>
                <p className="text-muted-foreground">Se não funcionar, tente selecionar o arquivo manifest.json dentro da pasta.</p>
              </Step>

              <Step number={7} title="Abrir e configurar a extensão">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 my-2">
                  <p className="font-medium text-green-600 dark:text-green-400 mb-2">📋 No popup da extensão:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Toque no ícone da extensão no menu</li>
                    <li>Seu ID de usuário será preenchido automaticamente</li>
                    <li>Toque em <strong>"Iniciar Monitoramento"</strong></li>
                    <li>Selecione a tela para compartilhar</li>
                  </ol>
                </div>
              </Step>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-600 dark:text-green-400 mb-1">
                    Dica
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    O Kiwi Browser funciona da mesma forma que o Chrome, então você pode usar o CRM Pilar 
                    normalmente nele enquanto a extensão monitora sua tela.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div className="flex-1 space-y-1">
        <h4 className="font-semibold">{title}</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          {children}
        </div>
      </div>
    </div>
  );
}
