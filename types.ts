
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

export interface SupabaseConfig {
  url: string;
  key: string;
}
