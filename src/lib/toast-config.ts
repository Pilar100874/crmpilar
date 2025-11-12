import { toast as sonnerToast, ExternalToast } from "sonner";

/**
 * Verifica se as mensagens de confirmação estão habilitadas
 */
export const shouldShowToast = (isError: boolean = false): boolean => {
  // Mensagens de erro sempre aparecem
  if (isError) return true;
  
  // Verifica a flag no localStorage
  const showConfirmationMessages = localStorage.getItem('showConfirmationMessages');
  return showConfirmationMessages !== 'false';
};

/**
 * Wrapper para o toast do Sonner que respeita a configuração de notificações
 */
export const toast = {
  success: (message: string | React.ReactNode, data?: ExternalToast) => {
    if (shouldShowToast(false)) {
      return sonnerToast.success(message, data);
    }
  },
  
  error: (message: string | React.ReactNode, data?: ExternalToast) => {
    // Erros sempre aparecem
    return sonnerToast.error(message, data);
  },
  
  info: (message: string | React.ReactNode, data?: ExternalToast) => {
    if (shouldShowToast(false)) {
      return sonnerToast.info(message, data);
    }
  },
  
  warning: (message: string | React.ReactNode, data?: ExternalToast) => {
    if (shouldShowToast(false)) {
      return sonnerToast.warning(message, data);
    }
  },
  
  message: (message: string | React.ReactNode, data?: ExternalToast) => {
    if (shouldShowToast(false)) {
      return sonnerToast.message(message, data);
    }
  },
  
  promise: sonnerToast.promise,
  custom: sonnerToast.custom,
  dismiss: sonnerToast.dismiss,
  loading: sonnerToast.loading,
};

// Export default para compatibilidade
export default toast;
