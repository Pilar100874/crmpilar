import { useNavigate } from 'react-router-dom';
import AutoVideoWizardDialog from '@/components/marketing/ai-studio/AutoVideoWizardDialog';

export default function AutoVideoWizardPage() {
  const navigate = useNavigate();
  return (
    <div className="h-full p-4 sm:p-6 overflow-auto">
      <div className="max-w-5xl mx-auto bg-card border border-border rounded-xl p-4 sm:p-6 h-full flex flex-col">
        <AutoVideoWizardDialog open={true} onOpenChange={() => navigate('/marketing')} inline />
      </div>
    </div>
  );
}
