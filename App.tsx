
import React, { useState, useCallback, useRef } from 'react';
import { supabase, STORAGE_BUCKET } from './lib/supabase';
import { UploadedImage } from './types';

// Refined Icons for Mobile
const CloudIcon = () => (
  <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 mb-2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <polyline points="23 7 20 10 17 7"></polyline>
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const ZapIcon = (props: any) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

type CompressionMode = 'default' | 'under200' | 'original';

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [mode, setMode] = useState<CompressionMode>('default');
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Advanced Sharpness-Preserving Compression
   */
  const processImageBuffer = async (file: File, targetMode: CompressionMode): Promise<{ blob: Blob }> => {
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

          let maxDimension = 4000;
          let quality = 0.95;

          if (targetMode === 'default') {
            maxDimension = 1280; 
            quality = 0.55; 
          } else if (targetMode === 'under200') {
            maxDimension = 2048;
            quality = 0.82;
          }

          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            // Use off-screen rendering if possible or clear
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'white'; // Prevent black artifacts on transparency
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
          }

          canvas.toBlob((blob) => {
            if (blob) resolve({ blob });
          }, 'image/webp', quality);
        };
      };
    });
  };

  const processSingleFile = async (file: File, tempId: string, currentMode: CompressionMode) => {
    const uniqueId = Math.random().toString(36).substring(2, 8);
    const storageName = `smartsaathi-${Date.now()}-${uniqueId}.webp`;
    
    try {
      const { blob } = await processImageBuffer(file, currentMode);
      const uploadFile = new File([blob], storageName, { type: 'image/webp' });

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storageName, uploadFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storageName);

      // Save to database
      await supabase.from('uploads').insert([{ 
        file_name: storageName, 
        url: publicUrl, 
        size: uploadFile.size, 
        mime_type: 'image/webp' 
      }]);

      setImages(prev => prev.map(img => 
        img.id === tempId ? { 
          ...img, 
          url: publicUrl, 
          status: 'completed', 
          size: uploadFile.size,
          name: storageName 
        } : img
      ));
    } catch (err) {
      console.error(`Error:`, err);
      setImages(prev => prev.map(img => 
        img.id === tempId ? { ...img, status: 'error' } : img
      ));
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || isUploading) return;
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
    const currentMode = mode;

    // Sequential processing with a small tick for PWA UI stability
    for (let i = 0; i < fileArray.length; i++) {
      await processSingleFile(fileArray[i], newUploads[i].id, currentMode);
      await new Promise(r => setTimeout(r, 50)); 
    }
    
    setIsUploading(false);
  };

  const copyToClipboard = (url: string, id: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopyStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setCopyStates(prev => ({ ...prev, [id]: false })), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-jakarta antialiased pb-20">
      {/* Mobile-Friendly Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <span className="text-white font-black text-lg">SS</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 leading-none">SmartSaathi</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Image to WebP</p>
          </div>
        </div>
        {images.length > 0 && (
          <button 
            onClick={() => setImages([])}
            className="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-full uppercase tracking-widest active:scale-95 transition-transform"
          >
            Reset
          </button>
        )}
      </header>

      <main className="max-w-xl mx-auto px-4 mt-8">
        {/* Mode Selector - Horizontal Scroll on Mobile */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Mode</span>
            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">Current: {mode.toUpperCase()}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {[
              { id: 'default', label: 'Default', desc: '40-50KB' },
              { id: 'under200', label: 'Lite', desc: '< 200KB' },
              { id: 'original', label: 'Pro', desc: 'HQ' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id as CompressionMode)}
                className={`flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all min-w-[100px] ${
                  mode === m.id 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' 
                    : 'bg-white border-white text-slate-500 hover:border-slate-200 shadow-sm'
                }`}
              >
                <span className="text-xs font-black uppercase tracking-tight">{m.label}</span>
                <span className={`text-[9px] font-bold opacity-70`}>{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Button - Large for Mobile */}
        <div 
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`w-full p-1 rounded-3xl transition-all active:scale-[0.98] mb-10 ${
            isUploading ? 'bg-slate-200 cursor-not-allowed' : 'bg-indigo-600 shadow-2xl shadow-indigo-200 cursor-pointer'
          }`}
        >
          <div className="bg-white/10 rounded-[1.4rem] p-10 flex flex-col items-center justify-center text-center">
            <CloudIcon />
            <h2 className="text-xl font-black text-white mb-1">
              {isUploading ? "Processing..." : "Select Photos"}
            </h2>
            <p className="text-indigo-100 text-[11px] font-medium opacity-80 uppercase tracking-widest">
              Multiple selection enabled
            </p>
            <input 
              ref={fileInputRef} 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => handleUpload(e.target.files)} 
            />
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {images.map((image) => (
            <div 
              key={image.id} 
              className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in zoom-in duration-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 overflow-hidden flex-shrink-0 border border-slate-50">
                  {image.status === 'completed' ? (
                    <img src={image.url} className="w-full h-full object-cover" loading="lazy" />
                  ) : image.status === 'uploading' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-red-500 text-xs font-bold">!</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate pr-4">
                    {image.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-slate-400">
                      {image.status === 'completed' ? `${Math.round(image.size / 1024)} KB` : 'Optimizing...'}
                    </span>
                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">WebP</span>
                  </div>
                </div>
              </div>

              {image.status === 'completed' && (
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100 overflow-hidden">
                    <p className="text-[11px] font-bold text-slate-400 truncate select-all">{image.url}</p>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(image.url, image.id)}
                    className={`px-6 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
                      copyStates[image.id] 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-50' 
                        : 'bg-slate-900 text-white shadow-lg shadow-slate-100'
                    }`}
                  >
                    {copyStates[image.id] ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
              )}
            </div>
          ))}

          {images.length === 0 && (
            <div className="text-center py-20 px-10">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl mx-auto flex items-center justify-center mb-4">
                <ZapIcon className="text-slate-300 w-8 h-8" />
              </div>
              <p className="text-slate-300 font-black text-[10px] uppercase tracking-[0.4em]">Empty Dashboard</p>
            </div>
          )}
        </div>
      </main>

      {/* Persistent Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 pointer-events-none">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] text-center">
          SmartSaathi • Sequential Core
        </p>
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.95); } to { transform: scale(1); } }
        .animate-in { animation: fade-in 0.4s ease-out forwards, zoom-in 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
