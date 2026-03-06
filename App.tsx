import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getSupabaseClient, rotateProject, STORAGE_BUCKET } from './lib/supabase';

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

type CompressionMode = 'super_lite' | 'default' | 'under200' | 'original';

const App: React.FC = () => {
  const [images, setImages] = useState<any[]>([]); // Changed to any[] to avoid type errors
  const [isUploading, setIsUploading] = useState(false);
  [span_0](start_span)const [mode, setMode] = useState<CompressionMode>('default');[span_0](end_span)
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  [span_1](start_span)const [remoteUrl, setRemoteUrl] = useState('');[span_1](end_span)
  [span_2](start_span)const [isDragging, setIsDragging] = useState(false);[span_2](end_span)
  const [activeProject, setActiveProject] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const { index } = getSupabaseClient();
    setActiveProject(index);
  }, []);

  const handleManualSwitch = () => {
    const nextIdx = rotateProject();
    setActiveProject(nextIdx);
  };

  const processImageBuffer = async (imgSource: HTMLImageElement | string, targetMode: CompressionMode): Promise<{ blob: Blob }> => {
    return new Promise((resolve, reject) => {
      const img = typeof imgSource === 'string' ? new Image() : imgSource;
      if (typeof imgSource === 'string') {
        img.crossOrigin = "anonymous";
        img.src = imgSource;
      }
      img.onload = () => {
        [span_3](start_span)const canvas = document.createElement('canvas');[span_3](end_span)
        let width = img.width;
        let height = img.height;
        let maxDimension = 1200;
        let quality = 0.55;

        if (targetMode === 'super_lite') { maxDimension = 720; quality = 0.38; [span_4](start_span)}
        else if (targetMode === 'default') { maxDimension = 1080; quality = 0.52; }[span_4](end_span)
        else if (targetMode === 'under200') { maxDimension = 1920; quality = 0.78; [span_5](start_span)}
        else { maxDimension = 3000; quality = 0.92; }[span_5](end_span)

        if (width > maxDimension || height > maxDimension) {
          [span_6](start_span)const ratio = Math.min(maxDimension / width, maxDimension / height);[span_6](end_span)
          [span_7](start_span)width *= ratio; height *= ratio;[span_7](end_span)
        }
        [span_8](start_span)canvas.width = width; canvas.height = height;[span_8](end_span)
        [span_9](start_span)const ctx = canvas.getContext('2d');[span_9](end_span)
        if (ctx) {
          [span_10](start_span)ctx.imageSmoothingEnabled = true;[span_10](end_span)
          [span_11](start_span)ctx.imageSmoothingQuality = 'medium';[span_11](end_span)
          [span_12](start_span)ctx.drawImage(img, 0, 0, width, height);[span_12](end_span)
        }
        canvas.toBlob((blob) => { 
          if (blob) resolve({ blob }); 
          else reject(new Error("Canvas to Blob failed"));
        [span_13](start_span)}, 'image/webp', quality);[span_13](end_span)
      };
      img.onerror = () => reject(new Error("Image Load Failed"));
    });
  };

  const handleUrlUpload = async () => {
    [span_14](start_span)if (!remoteUrl || isUploading) return;[span_14](end_span)
    [span_15](start_span)setIsUploading(true);[span_15](end_span)
    const { client } = getSupabaseClient();
    [span_16](start_span)const tempId = Math.random().toString(36).substr(2, 9);[span_16](end_span)
    [span_17](start_span)const storageName = `smartsaathi-${Date.now()}.webp`;[span_17](end_span)
    
    [span_18](start_span)setImages(prev => [{ id: tempId, name: storageName, url: '', status: 'uploading' }, ...prev]);[span_18](end_span)

    try {
      [span_19](start_span)const { blob } = await processImageBuffer(remoteUrl, mode);[span_19](end_span)
      [span_20](start_span)const uploadFile = new File([blob], storageName, { type: 'image/webp' });[span_20](end_span)
      [span_21](start_span)const { error } = await client.storage.from(STORAGE_BUCKET).upload(storageName, uploadFile);[span_21](end_span)
      [span_22](start_span)if (error) throw error;[span_22](end_span)

      [span_23](start_span)const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(storageName);[span_23](end_span)
      [span_24](start_span)setImages(prev => prev.map(img => img.id === tempId ? { ...img, url: data.publicUrl, status: 'completed', size: uploadFile.size } : img));[span_24](end_span)
      setActiveProject(rotateProject());
      [span_25](start_span)setRemoteUrl('');[span_25](end_span)
    } catch (err) {
      [span_26](start_span)setImages(prev => prev.map(img => img.id === tempId ? { ...img, status: 'error' } : img));[span_26](end_span)
    }
    [span_27](start_span)setIsUploading(false);[span_27](end_span)
  };

  const handleUpload = async (files: FileList | null) => {
    [span_28](start_span)if (!files || files.length === 0 || isUploading) return;[span_28](end_span)
    [span_29](start_span)setIsUploading(true);[span_29](end_span)
    
    await Promise.all(Array.from(files).map(async (file) => {
      const { client } = getSupabaseClient();
      [span_30](start_span)const tempId = Math.random().toString(36).substr(2, 9);[span_30](end_span)
      [span_31](start_span)const storageName = `smartsaathi-${Date.now()}-${tempId}.webp`;[span_31](end_span)

      [span_32](start_span)setImages(prev => [{ id: tempId, name: storageName, url: '', status: 'uploading' }, ...prev]);[span_32](end_span)

      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        [span_33](start_span)reader.readAsDataURL(file);[span_33](end_span)
        reader.onload = async (e) => {
          try {
            const img = new Image();
            [span_34](start_span)img.src = e.target?.result as string;[span_34](end_span)
            [span_35](start_span)const { blob } = await processImageBuffer(img, mode);[span_35](end_span)
            [span_36](start_span)const uploadFile = new File([blob], storageName, { type: 'image/webp' });[span_36](end_span)
            [span_37](start_span)await client.storage.from(STORAGE_BUCKET).upload(storageName, uploadFile);[span_37](end_span)
            [span_38](start_span)const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(storageName);[span_38](end_span)
            [span_39](start_span)setImages(prev => prev.map(item => item.id === tempId ? { ...item, url: data.publicUrl, status: 'completed', size: uploadFile.size } : item));[span_39](end_span)
            setActiveProject(rotateProject());
          } catch (error) {
            [span_40](start_span)setImages(prev => prev.map(item => item.id === tempId ? { ...item, status: 'error' } : item));[span_40](end_span)
          }
          resolve();
        };
      });
    }));
    [span_41](start_span)setIsUploading(false);[span_41](end_span)
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-jakarta antialiased">
      <header className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          [span_42](start_span)<div className="bg-indigo-600 p-2 rounded-lg text-white font-black">SS</div>[span_42](end_span)
          <div>
            [span_43](start_span)<h1 className="font-extrabold text-slate-800 tracking-tight text-sm">SmartSaathi</h1>[span_43](end_span)
            <button onClick={handleManualSwitch} className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold border border-emerald-100 mt-0.5">
              Project: #{activeProject + 1}
            </button>
          </div>
        </div>
        [span_44](start_span){images.length > 0 && <button onClick={() => setImages([])} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full text-center">Clear All</button>}[span_44](end_span)
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {[{ id: 'super_lite', label: '10-30KB' }, { id: 'default', label: '40-50KB' }, { id: 'under200', label: '200KB' }, { id: 'original', label: 'Original' }].map((m) => (
            <button key={m.id} onClick={() => setMode(m.id as CompressionMode)} className={`flex-shrink-0 p-3 rounded-2xl border-2 transition-all min-w-[100px] ${mode === m.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500'}`}>
              [span_45](start_span)<div className="text-xs font-black">{m.label}</div>[span_45](end_span)
            </button>
          ))}
        </div>

        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-3">
          <div className="flex gap-2">
            [span_46](start_span)<input type="text" value={remoteUrl} onChange={(e) => setRemoteUrl(e.target.value)} placeholder="Paste Image Link..." className="flex-1 bg-slate-50 border-none rounded-2xl px-4 py-3 text-xs" />[span_46](end_span)
            [span_47](start_span)<button onClick={handleUrlUpload} className="bg-indigo-600 text-white p-3 rounded-2xl"><LinkIcon /></button>[span_47](end_span)
          </div>
        </div>

        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); [span_48](start_span)}}[span_48](end_span)
          [span_49](start_span)onDragLeave={() => setIsDragging(false)}[span_49](end_span)
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleUpload(e.dataTransfer.files); [span_50](start_span)}}[span_50](end_span)
          [span_51](start_span)onClick={() => !isUploading && fileInputRef.current?.click()}[span_51](end_span)
          className={`h-80 flex flex-col justify-center items-center bg-indigo-600 rounded-[2.5rem] text-white shadow-2xl cursor-pointer transition-all border-4 border-dashed border-indigo-400/30 ${isDragging ? [span_52](start_span)'scale-105' : ''}`}[span_52](end_span)
        >
          <h2 className="text-2xl font-black">{isUploading ? [span_53](start_span)"Processing..." : "Upload File"}</h2>[span_53](end_span)
          [span_54](start_span)<input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />[span_54](end_span)
        </div>

        <div className="space-y-4">
          {images.map((image) => (
            <div key={image.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl overflow-hidden">
                  [span_55](start_span){image.status === 'completed' ? <img src={image.url} className="w-full h-full object-cover" /> : <div className="w-full h-full animate-pulse bg-slate-200" />}[span_55](end_span)
                </div>
                <div className="flex-1 min-w-0">
                  [span_56](start_span)<h4 className="text-[10px] font-black truncate">{image.name}</h4>[span_56](end_span)
                  <span className="text-[10px] font-bold text-slate-400">
                    {image.status === 'completed' ? [span_57](start_span)`${Math.round(image.size / 1024)} KB` : 'Processing...'}[span_57](end_span)
                  </span>
                </div>
              </div>
              {image.status === 'completed' && (
                <div className="flex gap-2">
                  [span_58](start_span)<div className="flex-1 bg-slate-50 rounded-xl px-3 py-2 text-[10px] truncate select-all">{image.url}</div>[span_58](end_span)
                  <button onClick={() => { navigator.clipboard.writeText(image.url); setCopyStates(p => ({...p, [image.id]: true})); setTimeout(() => setCopyStates(p => ({...p, [image.id]: false})), 2000); }} className={`px-4 rounded-xl ${copyStates[image.id] ? 'bg-emerald-500' : 'bg-slate-900'} text-white`}>
                    {copyStates[image.id] ? [span_59](start_span)<CheckIcon /> : <CopyIcon />}[span_59](end_span)
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
