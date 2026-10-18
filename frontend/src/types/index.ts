export interface DetectionItem {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  relative_area: number;
  severity_score: number;
  severity_level: 'Low' | 'Medium' | 'High';
  frame_number?: number;
}

export interface RiskAssessment {
  score: number;
  level: string;
  risk_band: 'Low' | 'Medium' | 'High';
  advisory: string;
  factors: string[];
}

export interface Inspection {
  id: string;
  created_at: string;
  filename: string;
  original_filename: string;
  media_type: 'image' | 'video';
  original_url: string;
  annotated_url: string;
  telemetry_csv_url?: string;
  report_pdf_url: string;
  width: number;
  height: number;
  duration_sec?: number;
  fps?: number;
  frames_processed?: number;
  total_detections: number;
  avg_confidence: number;
  highest_severity: 'Low' | 'Medium' | 'High' | 'None';
  risk: RiskAssessment;
  risk_score?: number;
  risk_level?: string;
  class_counts: Record<string, number>;
  severity_counts: {
    Low: number;
    Medium: number;
    High: number;
  };
  detections: DetectionItem[];
  frame_timeline?: Array<{
    frame: number;
    time_sec: number;
    risk_score: number;
    defect_count: number;
    high_count: number;
  }>;
  inference_time_ms: number;
}

export interface InspectionListItem {
  id: string;
  created_at: string;
  filename: string;
  original_filename: string;
  media_type: 'image' | 'video';
  original_url?: string;
  annotated_url: string;
  total_detections: number;
  highest_severity: 'Low' | 'Medium' | 'High' | 'None';
  risk_score: number;
  risk_level: string;
  risk_band: 'Low' | 'Medium' | 'High';
  avg_confidence: number;
}

export interface ModelInfo {
  model_name: string;
  model_path: string;
  device: string;
  classes: Record<string | number, string>;
  num_classes: number;
  weights_loaded: boolean;
  architecture: string;
  benchmark_metrics: {
    dataset: string;
    test_images: number;
    precision: number;
    recall: number;
    map50: number;
    map50_95: number;
    classes: Array<{
      name: string;
      precision: number;
      recall: number;
      map50: number;
      map50_95: number;
    }>;
  };
}

export interface DashboardSummary {
  total_inspections: number;
  total_detections: number;
  high_severity_detections: number;
  medium_severity_detections: number;
  low_severity_detections: number;
  avg_confidence: number;
  image_inspections: number;
  video_inspections: number;
  avg_risk_score: number;
  class_distribution: Record<string, number>;
  severity_distribution: Record<string, number>;
  risk_distribution: Record<string, number>;
}

export interface JobStatus {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_frame: number;
  total_frames: number;
  error_message?: string;
  inspection_id?: string;
}
