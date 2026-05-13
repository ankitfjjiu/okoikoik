import React, { useState, useRef, useEffect } from 'react';
import { getSupabaseClient, rotateProject, STORAGE_BUCKET } from './lib/supabase';

const LinkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

type CompressionMode = 'super_lite' | 'default' | 'under200' | 'original';

const App: React.FC = () => {
  const [images, setImages] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<CompressionMode>('default');
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
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

  const cleanFileName = (name: string): string => {
    let clean = name.replace(/\.[^/.]+$/, ""); 
    clean = clean.replace(/(Filmyfly|Filmy|Filmyzilla|Filmywap)/gi, "");
    clean = clean.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");
    return clean.toLowerCase().replace(/^-|-$/g, "");
  };

  const processImageBuffer = async (imgSource: HTMLImageElement | string, targetMode: CompressionMode): Promise<{ blob: Blob }> => {
    return new Promise((resolve, reject) => {
      const img = typeof imgSource === 'string' ? new Image() : imgSource;
      if (typeof imgSource === 'string') {
        img.crossOrigin = "anonymous";
        img.src = imgSource;
      }
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        let maxDimension = 1200;
        let quality = 0.55;

        if (targetMode === 'super_lite') { maxDimension = 720; quality = 0.38; }
        else if (targetMode === 'default') { maxDimension = 1080; quality = 0.52; }
        else if (targetMode === 'under200') { maxDimension = 1920; quality = 0.78; }
        else { maxDimension = 3000; quality = 0.92; }

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width *= ratio; height *= ratio;
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, width, height);
        }
        canvas.toBlob((blob) => { if (blob) resolve({ blob }); else reject(); }, 'image/webp', quality);
      };
      img.onerror = () => reject();
    });
  };

  const handleUrlUpload = async () => {
    if (!remoteUrl || isUploading) return;
    setIsUploading(true);
    const { client } = getSupabaseClient();
    const tempId = Math.random().toString(36).substr(2, 9);
    
    const urlName = remoteUrl.split('/').pop() || 'image';
    const cleanedBase = cleanFileName(urlName);
    const storageName = `SmartSaathi-${cleanedBase}-${Date.now()}.webp`;

    setImages(prev => [{ id: tempId, name: storageName, url: '', status: 'uploading' }, ...prev]);
    try {
      const { blob } = await processImageBuffer(remoteUrl, mode);
      const uploadFile = new File([blob], storageName, { type: 'image/webp' });
      const { error } = await client.storage.from(STORAGE_BUCKET).upload(storageName, uploadFile);
      if (error) throw error;
      const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(storageName);
      setImages(prev => prev.map(img => img.id === tempId ? { ...img, url: data.publicUrl, status: 'completed', size: uploadFile.size } : img));
      setActiveProject(rotateProject());
      setRemoteUrl('');
    } catch (err) {
      setImages(prev => prev.map(img => img.id === tempId ? { ...img, status: 'error' } : img));
    }
    setIsUploading(false);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || isUploading) return;
    setIsUploading(true);
    const { client } = getSupabaseClient();

    await Promise.all(Array.from(files).map(async (file) => {
      const tempId = Math.random().toString(36).substr(2, 9);
      const cleanedBase = cleanFileName(file.name);
      const storageName = `SmartSaathi-${cleanedBase}-${Date.now()}.webp`;

      setImages(prev => [{ id: tempId, name: storageName, url: '', status: 'uploading' }, ...prev]);
      
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async (e) => {
          try {
            const img = new Image();
            img.src = e.target?.result as string;
            const { blob } = await processImageBuffer(img, mode);
            const uploadFile = new File([blob], storageName, { type: 'image/webp' });
            await client.storage.from(STORAGE_BUCKET).upload(storageName, uploadFile);
            const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(storageName);
            setImages(prev => prev.map(item => item.id === tempId ? { ...item, url: data.publicUrl, status: 'completed', size: uploadFile.size } : item));
            setActiveProject(rotateProject());
          } catch (error) {
            setImages(prev => prev.map(item => item.id === tempId ? { ...item, status: 'error' } : item));
          }
          resolve();
        };
      });
    }));
    setIsUploading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-jakarta antialiased">
      <header className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg text-white font-black text-xs">SS</div>
          <div>
            <h1 className="font-extrabold text-slate-800 text-sm">SmartSaathi</h1>
            <button onClick={handleManualSwitch} className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Project: #{activeProject + 1}</button>
          </div>
        </div>
        {images.length > 0 && <button onClick={() => setImages([])} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">Clear</button>}
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {[{id:'super_lite',l:'10-30KB'},{id:'default',l:'40-50KB'},{id:'under200',l:'200KB'},{id:'original',l:'Original'}].map((m)=>(
            <button key={m.id} onClick={()=>setMode(m.id as CompressionMode)} className={`flex-shrink-0 p-3 rounded-2xl border-2 transition-all min-w-[100px] ${mode===m.id?'bg-indigo-600 text-white':'bg-white text-slate-500'}`}>
              <div className="text-xs font-black">{m.l}</div>
            </button>
          ))}
        </div>

        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex gap-2">
          <input type="text" value={remoteUrl} onChange={(e)=>setRemoteUrl(e.target.value)} placeholder="Paste Link..." className="flex-1 bg-slate-50 border-none rounded-2xl px-4 py-3 text-xs" />
          <button onClick={handleUrlUpload} className="bg-indigo-600 text-white p-3 rounded-2xl"><LinkIcon /></button>
        </div>

        <div onDragOver={(e)=>{e.preventDefault();setIsDragging(true);}} onDragLeave={()=>setIsDragging(false)} onDrop={(e)=>{e.preventDefault();setIsDragging(false);if(e.dataTransfer.files)handleUpload(e.dataTransfer.files);}} onClick={()=>!isUploading && fileInputRef.current?.click()} className={`h-80 flex flex-col justify-center items-center bg-indigo-600 rounded-[2.5rem] text-white shadow-2xl cursor-pointer transition-all border-4 border-dashed border-indigo-400/30 ${isDragging?'scale-105':''}`}>
          <h2 className="text-2xl font-black">{isUploading?"Wait...":"Upload"}</h2>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e)=>handleUpload(e.target.files)} />
        </div>

        <div className="space-y-4">
          {images.map((img)=>(
            <div key={img.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl overflow-hidden">
                  {img.status==='completed'?<img src={img.url} className="w-full h-full object-cover" alt="img" />:<div className="w-full h-full animate-pulse bg-slate-200" />}
                </div>
                <div className="flex-1">
                  <h4 className="text-[10px] font-black truncate">{img.name}</h4>
                  <span className="text-[10px] font-bold text-slate-400">{img.status==='completed'?`${Math.round(img.size/1024)}KB`:'Wait...'}</span>
                </div>
              </div>
              {img.status==='completed' && (
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2 text-[10px] truncate border">{img.url}</div>
                  <button onClick={()=>{navigator.clipboard.writeText(img.url);setCopyStates(p=>({...p,[img.id]:true}));setTimeout(()=>setCopyStates(p=>({...p,[img.id]:false})),2000);}} className={`px-4 rounded-xl ${copyStates[img.id]?'bg-emerald-500':'bg-slate-900'} text-white`}>
                    {copyStates[img.id]?<CheckIcon />:<CopyIcon />}
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
