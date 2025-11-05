// Stimulsoft BI Cloud REST API Integration
// Documentação: https://www.stimulsoft.com/en/documentation/online/bi-cloud/

const CLOUD_BASE_URL = import.meta.env.VITE_STIMULSOFT_CLOUD_URL || 'https://cloud.stimulsoft.com/api';

interface CloudCredentials {
  email?: string;
  password?: string;
  apiKey?: string;
  token?: string;
}

interface CloudFile {
  id: string;
  name: string;
  type: string;
  size: number;
  modified: string;
  content?: string;
}

class StimulsoftCloudAPI {
  private token: string | null = null;

  constructor() {
    // Tentar recuperar token do localStorage
    this.token = localStorage.getItem('stimulsoft_cloud_token');
  }

  /**
   * Login no Stimulsoft BI Cloud
   */
  async login(credentials: CloudCredentials): Promise<boolean> {
    try {
      const response = await fetch(`${CLOUD_BASE_URL}/1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          apiKey: credentials.apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha no login');
      }

      const data = await response.json();
      this.token = data.token || credentials.token || null;
      
      if (this.token) {
        localStorage.setItem('stimulsoft_cloud_token', this.token);
      }

      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    }
  }

  /**
   * Logout e limpar token
   */
  logout(): void {
    this.token = null;
    localStorage.removeItem('stimulsoft_cloud_token');
  }

  /**
   * Verificar se está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.token;
  }

  /**
   * Listar arquivos de relatórios (.mrt)
   */
  async listReports(): Promise<CloudFile[]> {
    if (!this.token) {
      throw new Error('Não autenticado');
    }

    try {
      const response = await fetch(`${CLOUD_BASE_URL}/1/reports`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao listar relatórios');
      }

      const data = await response.json();
      return data.reports || [];
    } catch (error) {
      console.error('Erro ao listar relatórios:', error);
      return [];
    }
  }

  /**
   * Abrir relatório do Cloud
   */
  async openReport(fileId: string): Promise<string | null> {
    if (!this.token) {
      throw new Error('Não autenticado');
    }

    try {
      const response = await fetch(`${CLOUD_BASE_URL}/1/reports/${fileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao abrir relatório');
      }

      const data = await response.json();
      return data.content || data.report || null;
    } catch (error) {
      console.error('Erro ao abrir relatório:', error);
      return null;
    }
  }

  /**
   * Salvar relatório no Cloud
   */
  async saveReport(name: string, content: string, fileId?: string): Promise<boolean> {
    if (!this.token) {
      throw new Error('Não autenticado');
    }

    try {
      const url = fileId 
        ? `${CLOUD_BASE_URL}/1/reports/${fileId}`
        : `${CLOUD_BASE_URL}/1/reports`;
      
      const method = fileId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          content,
          type: 'report',
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar relatório');
      }

      return true;
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
      return false;
    }
  }

  /**
   * Deletar relatório do Cloud
   */
  async deleteReport(fileId: string): Promise<boolean> {
    if (!this.token) {
      throw new Error('Não autenticado');
    }

    try {
      const response = await fetch(`${CLOUD_BASE_URL}/1/reports/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao deletar relatório');
      }

      return true;
    } catch (error) {
      console.error('Erro ao deletar relatório:', error);
      return false;
    }
  }

  /**
   * Carregar dados JSON externos
   */
  async loadExternalJSON(url: string): Promise<any> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Falha ao carregar dados externos');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar JSON externo:', error);
      return null;
    }
  }
}

export const cloudAPI = new StimulsoftCloudAPI();
export type { CloudCredentials, CloudFile };
