import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const reportClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Report {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'date';
  label: string;
  required?: boolean;
}

// GET /api/reports - Lista todos os relatórios
export const getReports = async (): Promise<Report[]> => {
  const response = await reportClient.get('/api/reports');
  return response.data;
};

// GET /api/reports/:id - Busca um relatório específico
export const getReport = async (id: string): Promise<Report> => {
  const response = await reportClient.get(`/api/reports/${id}`);
  return response.data;
};

// PUT /api/reports/:id - Atualiza um relatório (.frx)
export const updateReport = async (id: string, frxContent: string): Promise<void> => {
  await reportClient.put(`/api/reports/${id}`, { frxContent });
};

// POST /api/reports/:id/render - Gera PDF
export const renderReport = async (
  id: string,
  format: 'pdf' | 'html' = 'pdf',
  parameters?: Record<string, any>
): Promise<Blob> => {
  const response = await reportClient.post(
    `/api/reports/${id}/render`,
    parameters,
    {
      params: { format },
      responseType: 'blob',
    }
  );
  return response.data;
};

export { API_BASE_URL };
