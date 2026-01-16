import { useEffect, useState } from "react";
import { useEmailManager } from "@/hooks/useEmailManager";
import { EmailPanel } from "@/components/email/EmailPanel";
import { ComposeEmailDialog } from "@/components/email/ComposeEmailDialog";
import { useIsMobile } from "@/hooks/use-mobile";

export default function EmailPage() {
  const isMobile = useIsMobile();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Track window width for tablet breakpoints
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    filteredEmails,
    selectedEmailId,
    selectedEmailData,
    emailFolder,
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

  // Layout idêntico ao Atendimento - apenas o EmailPanel
  return (
    <div className="h-full flex flex-col bg-background">
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
