import { useEffect, useState } from "react";
import { Mail, ChevronLeft, Menu } from "lucide-react";
import { useEmailManager } from "@/hooks/useEmailManager";
import { EmailFolderSidebar } from "@/components/email/EmailFolderSidebar";
import { EmailPanel } from "@/components/email/EmailPanel";
import { ComposeEmailDialog } from "@/components/email/ComposeEmailDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export default function EmailPage() {
  const isMobile = useIsMobile();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [showSidebar, setShowSidebar] = useState(false);

  // Track window width for tablet breakpoints
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isTablet = !isMobile && windowWidth < 1280;
  const isSmallTablet = !isMobile && windowWidth >= 768 && windowWidth < 1024;

  const {
    emails,
    filteredEmails,
    selectedEmailId,
    selectedEmailData,
    emailFolder,
    showComposeEmail,
    composeEmailMode,
    composeEmailDefaults,
    estabelecimentoId,
    setShowComposeEmail,
    loadEmails,
    sendEmail,
    handleFolderChange,
    handleEmailSelect,
    handleEmailClose,
    handleComposeClick,
    handleReply,
    handleForward,
    handleRefresh,
  } = useEmailManager();

  // Load emails on mount
  useEffect(() => {
    loadEmails();
  }, []);

  // Handle email selection with mobile view switch
  const onEmailSelect = (id: string, data: any) => {
    handleEmailSelect(id, data);
    if (isMobile) {
      setMobileView("detail");
    }
  };

  // Handle back button on mobile
  const handleBack = () => {
    handleEmailClose();
    setMobileView("list");
  };

  // Folder sidebar content
  const sidebarContent = (
    <EmailFolderSidebar
      emails={emails}
      activeFolder={emailFolder}
      onFolderChange={(folder) => {
        handleFolderChange(folder);
        if (isMobile) {
          setShowSidebar(false);
        }
      }}
      onComposeClick={() => {
        handleComposeClick();
        if (isMobile) {
          setShowSidebar(false);
        }
      }}
      onRefresh={handleRefresh}
    />
  );

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Mobile Header */}
        <div className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-3 py-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {mobileView === "detail" ? (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : (
              <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  {sidebarContent}
                </SheetContent>
              </Sheet>
            )}
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">E-mail</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden relative">
          {/* List View */}
          <div className={cn(
            "absolute inset-0 transition-transform duration-300 ease-out",
            mobileView === "list" ? "translate-x-0" : "-translate-x-full"
          )}>
            <EmailPanel
              emails={filteredEmails}
              selectedEmailId={null}
              selectedEmailData={null}
              emailFolder={emailFolder}
              onFolderChange={handleFolderChange}
              onEmailSelect={onEmailSelect}
              onEmailClose={handleEmailClose}
              onComposeClick={handleComposeClick}
              onRefresh={handleRefresh}
              onReply={handleReply}
              onForward={handleForward}
              hideToolbar
            />
          </div>

          {/* Detail View */}
          <div className={cn(
            "absolute inset-0 transition-transform duration-300 ease-out bg-background",
            mobileView === "detail" ? "translate-x-0" : "translate-x-full"
          )}>
            {selectedEmailId && selectedEmailData && (
              <EmailPanel
                emails={filteredEmails}
                selectedEmailId={selectedEmailId}
                selectedEmailData={selectedEmailData}
                emailFolder={emailFolder}
                onFolderChange={handleFolderChange}
                onEmailSelect={onEmailSelect}
                onEmailClose={handleBack}
                onComposeClick={handleComposeClick}
                onRefresh={handleRefresh}
                onReply={handleReply}
                onForward={handleForward}
              />
            )}
          </div>
        </div>

        {/* Compose Email Dialog */}
        <ComposeEmailDialog
          open={showComposeEmail}
          onOpenChange={setShowComposeEmail}
          mode={composeEmailMode}
          defaultTo={composeEmailDefaults.to}
          defaultSubject={composeEmailDefaults.subject}
          defaultBody={composeEmailDefaults.body}
          onSend={sendEmail}
        />
      </div>
    );
  }

  // Tablet & Desktop Layout
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-4 sm:px-6 py-4 sm:py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">E-mail</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Gerenciamento de e-mails
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Responsive widths */}
        <div className={cn(
          "border-r bg-card/50 flex-shrink-0 flex flex-col transition-all duration-300",
          isSmallTablet ? "w-40" : isTablet ? "w-48" : "w-52"
        )}>
          {sidebarContent}
        </div>

        {/* Email Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <EmailPanel
            emails={filteredEmails}
            selectedEmailId={selectedEmailId}
            selectedEmailData={selectedEmailData}
            emailFolder={emailFolder}
            onFolderChange={handleFolderChange}
            onEmailSelect={handleEmailSelect}
            onEmailClose={handleEmailClose}
            onComposeClick={handleComposeClick}
            onRefresh={handleRefresh}
            onReply={handleReply}
            onForward={handleForward}
          />
        </div>
      </div>

      {/* Compose Email Dialog */}
      <ComposeEmailDialog
        open={showComposeEmail}
        onOpenChange={setShowComposeEmail}
        mode={composeEmailMode}
        defaultTo={composeEmailDefaults.to}
        defaultSubject={composeEmailDefaults.subject}
        defaultBody={composeEmailDefaults.body}
        onSend={sendEmail}
        estabelecimentoId={estabelecimentoId}
      />
    </div>
  );
}
