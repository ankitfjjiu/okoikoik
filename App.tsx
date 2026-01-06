import React, { useState, useCallback, useRef } from 'react';
import { supabase, STORAGE_BUCKET } from './lib/supabase';
import { UploadedImage } from './types';

// Icons
const LinkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);
const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

// ✅ New Compression Modes
type CompressionMode = 'super_lite' | 'default' | 'under200' | 'original';

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<CompressionMode>('super_lite'); // ✅ Default: 10-30KB
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  const [remoteUrl, setRemoteUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageBuffer = async (imgSource: HTMLImageElement | string, targetMode: CompressionMode): Promise<{ blob: Blob }> => {
    return new Promise((resolve) => {
      const img = typeof imgSource === 'string' ? new Image() : imgSource;
      if (typeof imgSource === 'string') {
        img.crossOrigin = "anonymous";
        img.src = imgSource;
      }

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // ✅ Setting logic based on your requirements
        let maxDimension = 1200;
        let quality = 0.55;

        if (targetMode === 'super_lite') {
          [cite_start]maxDimension = 720; // Best for 10-30KB target[span_1](end_span)
          quality = 0.38;     
        } else if (targetMode === 'default') {
          maxDimension = 1080; [span_2](start_span)// 40-50KB range[span_2](end_span)
          quality = 0.52;
        } else if (targetMode === 'under200') {
          maxDimension = 1920; [span_3](start_span)// Under 200KB[span_3](end_span)
          quality = 0.78;
        } else {
          maxDimension = 3000; [span_4](start_span)// Original HQ[span_4](end_span)
          quality = 0.92;
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
          ctx.drawImage(img, 0, 0, width, height);
        }

        canvas.toBlob((blob) => { if (blob) resolve({ blob }); }, 'image/webp', quality);
      };
    });
  };

  [span_5](start_span)[span_6](start_span)// ✅ New Feature: URL to Compressed URL [cite: 28, 38-42]
  const handleUrlUpload = async () => {
    if (!remoteUrl || isUploading) return;
    setIsUploading(true);
    const tempId = Math.random().toString(36).substr(2, 9);
    
    setImages(prev => [{
      id: tempId, name: 'Remote Image', url: '', size: 0, type: 'image/webp', timestamp: Date.now(), status: 'uploading', progress: 0
    }, ...prev]);

    try {
      const { blob } = await processImageBuffer(remoteUrl, mode);
      const storageName = `smartsaathi-${Date.now()}.webp`;
      const uploadFile = new File([blob], storageName, { type: 'image/webp' });

      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storageName, uploadFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storageName);
      setImages(prev => prev.map(img => img.id === tempId ? { ...img, url: publicUrl, status: 'completed', size: uploadFile.size, name: storageName } : img));
      setRemoteUrl('');
    } catch (err) {
      console.error(err);
      setImages(prev => prev.map(img => img.id === tempId ? { ...img, status: 'error' } : img));
    }
    setIsUploading(false);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || isUploading) return;
    setIsUploading(true);
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const tempId = Math.random().toString(36).substr(2, 9);
      setImages(prev => [{ id: tempId, name: file.name, url: '', size: file.size, type: file.type, timestamp: Date.now(), status: 'uploading', progress: 0 }, ...prev]);
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        const { blob } = await processImageBuffer(img, mode);
        const storageName = `smartsaathi-${Date.now()}.webp`;
        const uploadFile = new File([blob], storageName, { type: 'image/webp' });
        await supabase.storage.from(STORAGE_BUCKET).upload(storageName, uploadFile);
        const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storageName);
        setImages(prev => prev.map(item => item.id === tempId ? { ...item, url: publicUrl, status: 'completed', size: uploadFile.size } : item));
      };
    }
    setIsUploading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-jakarta">
      <header className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg text-white font-black">SS</div>
          <h1 className="font-extrabold text-slate-800">SmartSaathi Compressor</h1>
        </div>
        {images.length > 0 && <button onClick={() => setImages([])} className="text-xs font-bold text-red-500">Clear</button>}
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        [cite_start]{/* Mode Selector [cite: 55-58] */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {[
            { id: 'super_lite', label: '10-30KB', sub: 'Default' },
            { id: 'default', label: '40-50KB', sub: 'Lite' },
            { id: 'under200', label: '200KB', sub: 'Pro' },
            { id: 'original', label: 'Original', sub: 'HQ' }
          ].map((m) => (
            <button key={m.id} onClick={() => setMode(m.id as CompressionMode)} className={`flex-shrink-0 p-3 rounded-2xl border-2 transition-all min-w-[100px] ${mode === m.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-white text-slate-500 shadow-sm'}`}>
              <div className="text-xs font-black">{m.label}</div>
              <div className="text-[9px] opacity-70">{m.sub}</div>
            </button>
          ))}
        </div>

        [cite_start]{/* URL to URL Feature [cite: 61-63] */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Paste High Quality Image URL</p>
          <div className="flex gap-2">
            <input type="text" value={remoteUrl} onChange={(e) => setRemoteUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="flex-1 bg-slate-50 border-none rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500" />
            <button onClick={handleUrlUpload} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-md active:scale-95 transition-transform"><LinkIcon /></button>
          </div>
        </div>

        [cite_start]{/* File Upload [cite: 60-63] */}
        <div onClick={() => !isUploading && fileInputRef.current?.click()} className="bg-indigo-600 p-8 rounded-[2.5rem] text-center text-white shadow-2xl shadow-indigo-200 cursor-pointer active:scale-[0.98] transition-transform">
          <h2 className="text-xl font-black mb-1">{isUploading ? "Compressing..." : "Upload Posters"}</h2>
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Select Screenshots/Posters</p>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        </div>

        [cite_start]{/* Results List [cite: 64-70] */}
        <div className="space-y-4">
          {images.map((image) => (
            <div key={image.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl overflow-hidden border">
                  {image.status === 'completed' ? <img src={image.url} className="w-full h-full object-cover" /> : <div className="w-full h-full animate-pulse bg-slate-100" />}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-800 truncate uppercase">{image.name}</p>
                  <p className="text-[10px] font-bold text-indigo-500 bg-indigo-50 w-fit px-1.5 py-0.5 rounded mt-1">{image.status === 'completed' ? `${Math.round(image.size / 1024)} KB` : 'Processing...'}</p>
                </div>
              </div>
              {image.status === 'completed' && (
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2 border text-[10px] font-bold text-slate-400 truncate">{image.url}</div>
                  <button onClick={() => { navigator.clipboard.writeText(image.url); setCopyStates(p => ({...p, [image.id]: true})); setTimeout(() => setCopyStates(p => ({...p, [image.id]: false})), 2000); }} className={`px-4 rounded-xl transition-all ${copyStates[image.id] ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
                    {copyStates[image.id] ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default App;
