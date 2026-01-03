import React, { useState, useCallback, useRef } from 'react';
import { supabase, STORAGE_BUCKET } from './lib/supabase';
import { UploadedImage, CompressionMode } from './types';

[span_4](start_span)// Icons Section[span_4](end_span)
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
  [span_5](start_span)[span_6](start_span)// Default mode humne 'low' rakha hai 40-50kb ke liye[span_5](end_span)[span_6](end_span)
  const [compressionMode, setCompressionMode] = useState<CompressionMode>('low');
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Smart Compression Logic (WebP Based)
   * [span_7](start_span)Ratio maintain karta hai aur size kam karta hai[span_7](end_span)
   */
  const compressImage = async (file: File, mode: CompressionMode): Promise<Blob> => {
    [span_8](start_span)if (mode === 'real') return file;[span_8](end_span)

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

          [span_9](start_span)// Aspect Ratio Maintain logic[span_9](end_span)
          let targetWidth = width;
          let targetHeight = height;

          if (mode === 'low') {
            const MAX_SIDE = 1200; [span_10](start_span)// Optimal for 50KB[span_10](end_span)
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
            [span_11](start_span)ctx.imageSmoothingQuality = 'high';[span_11](end_span)
            [span_12](start_span)ctx.drawImage(img, 0, 0, targetWidth, targetHeight);[span_12](end_span)
          }

          [span_13](start_span)// Quality adjustment: WebP format size ke liye best hai[span_13](end_span)
          const quality = mode === 'low' ? 0.55 : 0.85;

          canvas.toBlob(
            (blob) => resolve(blob || file),
            'image/webp', 
            quality
          );
        };
      };
    });
  };

  const processSingleFile = async (file: File, tempId: string) => {
    [span_14](start_span)// Branding Name: SmartSaathi-Timestamp-RandomID[span_14](end_span)
    const fileExt = compressionMode === 'real' ? file.name.split('.').pop() : 'webp';
    const smartName = `SmartSaathi-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    try {
      [span_15](start_span)const processedBlob = await compressImage(file, compressionMode);[span_15](end_span)
      const uploadFile = new File([processedBlob], smartName, { 
        type: compressionMode === 'real' ? file.type : 'image/webp' 
      [span_16](start_span)});[span_16](end_span)

      [span_17](start_span)// Upload to Storage[span_17](end_span)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(smartName, uploadFile);

      [span_18](start_span)if (uploadError) throw uploadError;[span_18](end_span)

      [span_19](start_span)// Get Public URL[span_19](end_span)
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(smartName);

      [span_20](start_span)// Save to Database[span_20](end_span)
      await supabase.from('uploads').insert([{ 
        file_name: smartName, 
        url: publicUrl, 
        size: uploadFile.size, 
        mime_type: uploadFile.type 
      }]);

      setImages(prev => prev.map(img => 
        img.id === tempId ? { 
          ...img, 
          url: publicUrl, 
          status: 'completed', 
          size: uploadFile.size,
          name: smartName 
        } : img
      [span_21](start_span)));[span_21](end_span)
    } catch (err) {
      [span_22](start_span)console.error(`Upload Error:`, err);[span_22](end_span)
      [span_23](start_span)setImages(prev => prev.map(img => img.id === tempId ? { ...img, status: 'error' } : img));[span_23](end_span)
    }
  };

  const handleUpload = async (files: FileList | null) => {
    [span_24](start_span)if (!files || files.length === 0) return;[span_24](end_span)
    [span_25](start_span)setIsUploading(true);[span_25](end_span)

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
    
    [span_26](start_span)setImages(prev => [...newUploads, ...prev]);[span_26](end_span)
    for (let i = 0; i < fileArray.length; i++) {
      [span_27](start_span)await processSingleFile(fileArray[i], newUploads[i].id);[span_27](end_span)
    }
    [span_28](start_span)setIsUploading(false);[span_28](end_span)
  };

  const copyToClipboard = (url: string, id: string) => {
    [span_29](start_span)navigator.clipboard.writeText(url);[span_29](end_span)
    setCopyStates(prev => ({ ...prev, [id]: true }));
    [span_30](start_span)setTimeout(() => setCopyStates(prev => ({ ...prev, [id]: false })), 2000);[span_30](end_span)
  };

  return (
    <div className="min-h-screen py-12 px-6 bg-[#f8fafc]">
      <div className="max-w-4xl mx-auto">
        [span_31](start_span){/* Header[span_31](end_span) */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-indigo-600 rounded-2xl shadow-xl">
             <span className="text-white text-3xl font-black italic">S</span>
          </div>
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tighter mb-4">
            SmartSaathi <span className="text-indigo-600">Drive</span>
          </h1>
          <p className="text-slate-400 font-semibold text-lg">Fast, Optimized & Branded Image Hosting.</p>
        </div>

        [span_32](start_span){/* Compression Selection UI[span_32](end_span) */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {(['real', 'high', 'low'] as CompressionMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setCompressionMode(mode)}
              className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-4 
                ${compressionMode === mode 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg scale-105' 
                  : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
            >
              {mode === 'real' ? 'Real Name/Size' : mode === 'high' ? 'HD (200KB)' : 'SmartSaathi (40-50KB)'}
            </button>
          ))}
        </div>

        [span_33](start_span){/* Upload Dropzone[span_33](end_span) */}
        <div 
          className={`relative p-1 rounded-[3rem] transition-all duration-500 mb-16 cursor-pointer ${
            dragActive ? 'bg-indigo-500 shadow-2xl' : 'bg-slate-100 hover:bg-indigo-400'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleUpload(e.dataTransfer.files); }}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <div className="bg-white rounded-[2.8rem] p-16 flex flex-col items-center text-center">
            <CloudIcon />
            <h2 className="text-2xl font-black text-slate-900 mb-2">Drop images here</h2>
            <p className="text-slate-400 font-medium italic">Format: {compressionMode === 'real' ? 'Original' : 'Auto-WebP'}</p>
            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          </div>
        </div>

        [span_34](start_span){/* Results List[span_34](end_span) */}
        <div className="space-y-6">
          {images.map((image) => (
            <div key={image.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm flex items-center gap-6 border border-slate-50 relative group">
              <div className="w-24 h-24 rounded-3xl bg-slate-50 overflow-hidden flex-shrink-0 border border-slate-100">
                {image.status === 'completed' ? (
                  <img src={image.url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-black text-slate-800 truncate">{image.name}</span>
                  <span className="text-xs font-bold text-slate-300">{Math.round(image.size / 1024)} KB</span>
                </div>
                <div className="flex items-center gap-3">
                  <input readOnly value={image.url || 'Uploading...'} className="w-full bg-slate-50 border-none text-xs font-bold py-3 px-4 rounded-xl text-slate-500" />
                  <button disabled={!image.url} onClick={() => copyToClipboard(image.url, image.id)} className={`h-[44px] px-6 rounded-xl transition-all ${copyStates[image.id] ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                    {copyStates[image.id] ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {images.length === 0 && (
          <div className="text-center py-20 border-4 border-dashed border-slate-100 rounded-[3rem]">
            <p className="text-slate-300 font-black uppercase tracking-widest">No Uploads Yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
