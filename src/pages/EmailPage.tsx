import { useEffect } from "react";
import { Mail } from "lucide-react";
import { useEmailManager } from "@/hooks/useEmailManager";
import { EmailFolderSidebar } from "@/components/email/EmailFolderSidebar";
import { EmailPanel } from "@/components/email/EmailPanel";
import { ComposeEmailDialog } from "@/components/email/ComposeEmailDialog";

export default function EmailPage() {
  const {
    emails,
    filteredEmails,
    selectedEmailId,
    selectedEmailData,
    emailFolder,
    loading,
    showComposeEmail,
    composeEmailMode,
    composeEmailDefaults,
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
        {/* Sidebar */}
        <div className="w-52 border-r bg-card/50 flex-shrink-0 flex flex-col">
          <EmailFolderSidebar
            emails={emails}
            activeFolder={emailFolder}
            onFolderChange={handleFolderChange}
            onComposeClick={handleComposeClick}
            onRefresh={handleRefresh}
          />
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
      />
    </div>
  );
}
