
import React, { useState, useCallback, useRef } from 'react';
import { supabase, STORAGE_BUCKET } from './lib/supabase';
import { UploadedImage } from './types';

// Premium SVG Icons
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

const ZapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [shouldCompress, setShouldCompress] = useState(true);
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * High performance compression targeting ~200KB.
   * Scaled for web performance.
   */
  const compressImage = async (file: File): Promise<Blob> => {
    // If compression is off or file is already small, return original blob
    if (!shouldCompress || file.size <= 200 * 1024) return file;

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

          // Limit dimensions to significantly reduce file size while keeping clarity
          const MAX_SIDE = 2000;
          if (width > MAX_SIDE || height > MAX_SIDE) {
            if (width > height) {
              height = (height / width) * MAX_SIDE;
              width = MAX_SIDE;
            } else {
              width = (width / height) * MAX_SIDE;
              height = MAX_SIDE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
          }

          // Target 0.75-0.85 quality range
          let quality = 0.8;
          if (file.size > 3000 * 1024) quality = 0.7; // Extra compression for very large files

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        };
      };
    });
  };

  const processSingleFile = async (file: File, tempId: string) => {
    const fileExt = file.name.split('.').pop();
    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/\s/g, '_');
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${cleanName}.${shouldCompress ? 'jpg' : fileExt}`;
    
    try {
      // 1. COMPRESS LOCALLY
      const processedBlob = await compressImage(file);
      
      // 2. PREPARE FILE FOR SUPABASE (Using the compressed blob)
      const uploadFile = new File([processedBlob], fileName, { 
        type: shouldCompress ? 'image/jpeg' : file.type 
      });

      // 3. UPLOAD TO STORAGE
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      // 4. GET PUBLIC URL
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);

      // 5. SAVE RECORD TO DB
      const { error: dbError } = await supabase
        .from('uploads')
        .insert([{ 
          file_name: file.name, 
          url: publicUrl, 
          size: uploadFile.size, 
          mime_type: uploadFile.type 
        }]);

      if (dbError) throw dbError;

      // UPDATE UI
      setImages(prev => prev.map(img => 
        img.id === tempId ? { 
          ...img, 
          url: publicUrl, 
          status: 'completed', 
          size: uploadFile.size 
        } : img
      ));
    } catch (err) {
      console.error(`Upload Error:`, err);
      setImages(prev => prev.map(img => 
        img.id === tempId ? { ...img, status: 'error' } : img
      ));
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

    // Add to the list in the order received
    setImages(prev => [...newUploads, ...prev]);

    // Process one by one for maximum speed and memory safety
    for (let i = 0; i < fileArray.length; i++) {
      await processSingleFile(fileArray[i], newUploads[i].id);
    }
    
    setIsUploading(false);
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopyStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopyStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-200">
             <span className="text-white text-3xl font-black italic">S</span>
          </div>
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tighter mb-4">
            Snap<span className="text-indigo-600">URL</span> Ultra
          </h1>
          <p className="text-slate-400 font-semibold text-lg">Instant image hosting with smart compression.</p>
        </div>

        {/* Compression Switch */}
        <div className="flex justify-center mb-10">
          <button 
            onClick={() => setShouldCompress(!shouldCompress)}
            className={`group relative flex items-center gap-4 px-10 py-5 rounded-full transition-all border-4 ${
              shouldCompress 
                ? 'bg-indigo-600 border-indigo-500 shadow-2xl shadow-indigo-200' 
                : 'bg-white border-slate-100 shadow-sm hover:border-slate-200'
            }`}
          >
            <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${shouldCompress ? 'bg-white/30' : 'bg-slate-200'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${shouldCompress ? 'left-7 bg-white' : 'left-1 bg-slate-500'}`}></div>
            </div>
            <div className="text-left">
              <span className={`block text-xs font-black uppercase tracking-widest leading-none mb-1 ${shouldCompress ? 'text-white' : 'text-slate-600'}`}>
                Smart Compression
              </span>
              <span className={`block text-[10px] font-bold ${shouldCompress ? 'text-white/60' : 'text-slate-400'}`}>
                Keep files under 200KB for Supabase
              </span>
            </div>
          </button>
        </div>

        {/* Upload Zone */}
        <div 
          className={`relative group p-1 w-full rounded-[3rem] transition-all duration-500 mb-16 cursor-pointer ${
            dragActive ? 'bg-indigo-500 shadow-3xl' : 'bg-slate-100 hover:bg-indigo-400'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleUpload(e.dataTransfer.files); }}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <div className={`bg-white rounded-[2.8rem] p-20 flex flex-col items-center text-center transition-all duration-500 ${dragActive ? 'scale-[0.96]' : 'scale-100'}`}>
            <CloudIcon />
            <h2 className="text-3xl font-black text-slate-900 mb-2">Drop images here</h2>
            <p className="text-slate-400 font-medium">Multiple files supported • Fast processing</p>
            
            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
            
            <div className="mt-12 flex items-center gap-4 py-2 px-6 bg-slate-50 rounded-full border border-slate-100">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                 <ZapIcon /> Turbo Mode
               </span>
               <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-Cloud</span>
            </div>
          </div>
        </div>

        {/* Results */}
        {images.length > 0 && (
          <div className="flex justify-between items-center mb-8 px-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Processed Assets</h3>
            <button onClick={() => setImages([])} className="text-[11px] font-black text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-full uppercase tracking-widest transition-colors">
              Clear All
            </button>
          </div>
        )}

        <div className="space-y-6">
          {images.map((image, index) => (
            <div 
              key={image.id} 
              className="glass p-6 rounded-[2.5rem] custom-shadow flex items-center gap-6 group/item animate-in slide-in-from-bottom-6 duration-500 ease-out relative"
            >
              {/* Rank Counter */}
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-lg font-black shadow-2xl z-20 border-4 border-white">
                {index + 1}
              </div>

              {/* Thumb */}
              <div className="relative w-28 h-28 rounded-3xl bg-slate-100 overflow-hidden flex-shrink-0 border border-white shadow-inner ml-4">
                {image.status === 'completed' ? (
                  <img src={image.url} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-1000" />
                ) : image.status === 'uploading' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-indigo-50">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Optimizing</span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-500 font-black">ERROR</div>
                )}
              </div>
              
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-black text-slate-800 truncate" title={image.name}>{image.name}</span>
                  <div className="flex items-center gap-2">
                    {image.status === 'completed' && (
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                        Saved to Cloud
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-300">
                      {Math.round(image.size / 1024)} KB
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input 
                      readOnly 
                      value={image.url || 'Uploading to Supabase...'} 
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-100 text-sm font-bold py-4 px-6 rounded-2xl transition-all outline-none text-slate-500"
                      onClick={(e) => image.url && (e.target as HTMLInputElement).select()}
                    />
                    {!image.url && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_2s_infinite] pointer-events-none"></div>
                    )}
                  </div>
                  
                  <button 
                    disabled={!image.url}
                    onClick={() => copyToClipboard(image.url, image.id)}
                    className={`h-[56px] px-8 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-xl ${
                      copyStates[image.id] 
                        ? 'bg-emerald-500 text-white shadow-emerald-100 scale-105' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-100 disabled:opacity-20'
                    }`}
                  >
                    {copyStates[image.id] ? <><CheckIcon /> COPIED</> : <><CopyIcon /> COPY URL</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {images.length === 0 && (
          <div className="text-center py-40 border-8 border-dotted border-slate-50 rounded-[5rem]">
            <p className="text-slate-200 font-black italic uppercase tracking-[0.5em] text-xl">
              Cloud Dashboard Empty
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes slide-in-from-bottom {
          0% { transform: translateY(40px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-in {
          animation: slide-in-from-bottom 0.7s cubic-bezier(0.2, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
