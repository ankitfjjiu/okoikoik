import React, { useState, useRef } from 'react';
import { supabase, STORAGE_BUCKET } from './lib/supabase';
import { UploadedImage, CompressionMode } from './types';

// Icons
const CloudIcon = () => (
  <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 mb-4 transition-transform group-hover:scale-110 duration-300">
    <path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.1-1.4-3.9-3.4-4.4C18.1 6.5 15.3 4 12 4c-2.7 0-5 1.7-6 4.1-2.4.3-4 2.3-4 4.7C2 15.4 4.2 17.5 7 17.5h1"></path>
    <polyline points="9 13 12 10 15 13"></polyline>
    <line x1="12" y1="10" x2="12" y2="19"></line>
  </svg>
);
const CopyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [compressionMode, setCompressionMode] = useState<CompressionMode>('low');
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  [span_0](start_span)[span_1](start_span)// Compression Logic[span_0](end_span)[span_1](end_span)
  const compressImage = async (file: File, mode: CompressionMode): Promise<Blob> => {
    if (mode === 'real') return file;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          let targetWidth = width;
          let targetHeight = height;

          if (mode === 'low') {
            const MAX_SIDE = 1200;
            if (width > MAX_SIDE || height > MAX_SIDE) {
              const ratio = Math.min(MAX_SIDE / width, MAX_SIDE / height);
              targetWidth = width * ratio;
              targetHeight = height * ratio;
            }
          }

          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          }

          const quality = mode === 'low' ? 0.55 : 0.85;
          canvas.toBlob((blob) => resolve(blob || file), 'image/webp', quality);
        };
      };
    });
  };

  const processSingleFile = async (file: File, tempId: string) => {
    const fileExt = compressionMode === 'real' ? (file.name.split('.').pop() || 'jpg') : 'webp';
    const smartName = `SmartSaathi-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    try {
      const processedBlob = await compressImage(file, compressionMode);
      const uploadFile = new File([processedBlob], smartName, { 
        type: compressionMode === 'real' ? file.type : 'image/webp' 
      });

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(smartName, uploadFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(smartName);

      await supabase.from('uploads').insert([{ 
        file_name: smartName, 
        url: publicUrl, 
        size: uploadFile.size, 
        mime_type: uploadFile.type 
      }]);

      setImages(prev => prev.map(img => 
        img.id === tempId ? { ...img, url: publicUrl, status: 'completed', size: uploadFile.size, name: smartName } : img
      ));
    } catch (err) {
      setImages(prev => prev.map(img => img.id === tempId ? { ...img, status: 'error' } : img));
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const fileArray = Array.from(files);
    const newUploads: UploadedImage[] = fileArray.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      url: '',
      size: file.size,
      type: file.type,
      timestamp: Date.now(),
      status: 'uploading',
      progress: 0,
    }));
    setImages(prev => [...newUploads, ...prev]);
    for (const [index, file] of fileArray.entries()) {
      await processSingleFile(file, newUploads[index].id);
    }
    setIsUploading(false);
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopyStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setCopyStates(prev => ({ ...prev, [id]: false })), 2000);
  };

  return (
    <div className="min-h-screen py-12 px-6 bg-slate-50 text-slate-900">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-black mb-6">SmartSaathi <span className="text-indigo-600">Drive</span></h1>
        
        {/* Mode Selector */}
        <div className="flex justify-center gap-3 mb-8">
          {(['real', 'high', 'low'] as CompressionMode[]).map((mode) => (
            <button key={mode} onClick={() => setCompressionMode(mode)} className={`px-5 py-2 rounded-xl font-bold text-xs uppercase border-2 transition-all ${compressionMode === mode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
              {mode === 'real' ? 'Real' : mode === 'high' ? 'HD' : 'SmartSaathi (50KB)'}
            </button>
          ))}
        </div>

        {/* Dropzone */}
        <div 
          className={`p-12 border-4 border-dashed rounded-[2.5rem] bg-white transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleUpload(e.dataTransfer.files); }}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <CloudIcon />
          <p className="font-bold text-slate-500">Click or Drag to Upload</p>
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        </div>

        {/* Progress List */}
        <div className="mt-10 space-y-4 text-left">
          {images.map((image) => (
            <div key={image.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden">
                {image.status === 'completed' && <img src={image.url} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="truncate max-w-[200px]">{image.name}</span>
                  <span>{Math.round(image.size / 1024)} KB</span>
                </div>
                <div className="flex gap-2">
                  <input readOnly value={image.url || 'Uploading...'} className="flex-1 bg-slate-50 p-2 rounded text-[10px] outline-none" />
                  <button onClick={() => copyToClipboard(image.url, image.id)} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs">
                    {copyStates[image.id] ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;

