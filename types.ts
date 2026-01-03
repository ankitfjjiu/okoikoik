export interface UploadedImage {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  timestamp: number;
  caption?: string;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
}

[span_0](start_span)// Naya type compression options ke liye[span_0](end_span)
export type CompressionMode = 'real' | 'high' | 'low';

export interface SupabaseConfig {
  url: string;
  key: string;
}

