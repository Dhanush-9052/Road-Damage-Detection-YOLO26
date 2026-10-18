import type {
  ModelInfo,
  Inspection,
  InspectionListItem,
  DashboardSummary,
  JobStatus
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth(): Promise<{
    status: string;
    service: string;
    device: string;
    model_loaded: boolean;
    model_path: string;
    classes_count: number;
  }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  },

  async getModelInfo(): Promise<ModelInfo> {
    const res = await fetch(`${API_BASE}/model-info`);
    if (!res.ok) throw new Error('Failed to fetch model info');
    return res.json();
  },

  async predictImage(
    file: File,
    confThreshold: number = 0.20,
    iouThreshold: number = 0.45,
    imgsz: number = 640
  ): Promise<Inspection> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conf_threshold', confThreshold.toString());
    formData.append('iou_threshold', iouThreshold.toString());
    formData.append('imgsz', imgsz.toString());

    const res = await fetch(`${API_BASE}/predict/image`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Image analysis failed' }));
      throw new Error(err.detail || 'Image analysis failed');
    }
    return res.json();
  },

  async predictVideo(
    file: File,
    confThreshold: number = 0.20,
    iouThreshold: number = 0.45,
    samplingStep: number = 1,
    emaAlpha: number = 0.20
  ): Promise<{ job_id: string; inspection_id: string; status: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conf_threshold', confThreshold.toString());
    formData.append('iou_threshold', iouThreshold.toString());
    formData.append('sampling_step', samplingStep.toString());
    formData.append('ema_alpha', emaAlpha.toString());

    const res = await fetch(`${API_BASE}/predict/video`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Video upload failed' }));
      throw new Error(err.detail || 'Video upload failed');
    }
    return res.json();
  },

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`);
    if (!res.ok) throw new Error('Failed to fetch job status');
    return res.json();
  },

  async getInspections(params: {
    limit?: number;
    offset?: number;
    media_type?: string;
    severity?: string;
    search?: string;
  } = {}): Promise<{ total: number; limit: number; offset: number; items: InspectionListItem[] }> {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset !== undefined) searchParams.append('offset', params.offset.toString());
    if (params.media_type) searchParams.append('media_type', params.media_type);
    if (params.severity) searchParams.append('severity', params.severity);
    if (params.search) searchParams.append('search', params.search);

    const res = await fetch(`${API_BASE}/inspections?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch inspections');
    return res.json();
  },

  async getInspection(id: string): Promise<Inspection> {
    const res = await fetch(`${API_BASE}/inspections/${id}`);
    if (!res.ok) throw new Error(`Inspection ${id} not found`);
    return res.json();
  },

  async deleteInspection(id: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/inspections/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete inspection ${id}`);
    return res.json();
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/analytics/summary`);
    if (!res.ok) throw new Error('Failed to fetch dashboard summary');
    return res.json();
  },

  async getRecentActivity(): Promise<InspectionListItem[]> {
    const res = await fetch(`${API_BASE}/analytics/recent-activity`);
    if (!res.ok) throw new Error('Failed to fetch recent activity');
    return res.json();
  },

  getReportPdfUrl(id: string): string {
    return `${API_BASE}/inspections/${id}/report`;
  },

  getExportDataUrl(id: string, format: 'json' | 'csv' = 'json'): string {
    return `${API_BASE}/inspections/${id}/export?format=${format}`;
  }
};
