import React, { useState, useRef } from 'react';
import { supabase, STORAGE_BUCKET } from './lib/supabase';
import { UploadedImage, CompressionMode } from './types';

// Icons ko yahan define kiya hai taaki crash na ho
const CloudIcon = () => (
  <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 mb-4 transition-transform group-hover:scale-110 duration-300">
    <path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.1-1.4-3.9-3.4-4.4C18.1 6.5 15.3 4 12 4c-2.7 0-5 1.7-6 4.1-2.4.3-4 2.3-4 4.7C2 15.4 4.2 17.5 7 17.5h1"></path>
    <polyline points="9 13 12 10 15 13"></polyline>
    <line x1="12" y1="10" x2="12" y2="19"></line>
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
          [span_2](start_span)// Maintain Aspect Ratio[span_2](end_span)
          const MAX_SIDE = mode === 'low' ? 1200 : 2000;
          if (width > MAX_SIDE || height > MAX_SIDE) {
            const ratio = Math.min(MAX_SIDE / width, MAX_SIDE / height);
            width *= ratio;
            height *= ratio;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            [span_3](start_span)ctx.drawImage(img, 0, 0, width, height);[span_3](end_span)
          }
          const quality = mode === 'low' ? 0.5 : 0.8;
          canvas.toBlob((blob) => resolve(blob || file), 'image/webp', quality);
        };
      };
    });
  };

  const processSingleFile = async (file: File, tempId: string) => {
    try {
      const fileExt = compressionMode === 'real' ? (file.name.split('.').pop() || 'jpg') : 'webp';
      [span_4](start_span)// SmartSaathi Branding Naming[span_4](end_span)
      const smartName = `SmartSaathi-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      [span_5](start_span)const processedBlob = await compressImage(file, compressionMode);[span_5](end_span)
      const uploadFile = new File([processedBlob], smartName, { 
        type: compressionMode === 'real' ? file.type : 'image/webp' 
      [span_6](start_span)});[span_6](end_span)

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        [span_7](start_span).upload(smartName, uploadFile);[span_7](end_span)

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        [span_8](start_span).getPublicUrl(smartName);[span_8](end_span)

      await supabase.from('uploads').insert([{ 
        file_name: smartName, 
        url: publicUrl, 
        size: uploadFile.size, 
        mime_type: uploadFile.type 
      [span_9](start_span)}]);[span_9](end_span)

      setImages(prev => prev.map(img => 
        img.id === tempId ? { ...img, url: publicUrl, status: 'completed', size: uploadFile.size, name: smartName } : img
      [span_10](start_span)));[span_10](end_span)
    } catch (err) {
      [span_11](start_span)setImages(prev => prev.map(img => img.id === tempId ? { ...img, status: 'error' } : img));[span_11](end_span)
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || isUploading) return;
    [span_12](start_span)setIsUploading(true);[span_12](end_span)
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
    [span_13](start_span)}));[span_13](end_span)
    [span_14](start_span)setImages(prev => [...newUploads, ...prev]);[span_14](end_span)
    
    for (let i = 0; i < fileArray.length; i++) {
      [span_15](start_span)await processSingleFile(fileArray[i], newUploads[i].id);[span_15](end_span)
    }
    [span_16](start_span)setIsUploading(false);[span_16](end_span)
  };

  const copyToClipboard = (url: string, id: string) => {
    [span_17](start_span)navigator.clipboard.writeText(url);[span_17](end_span)
    setCopyStates(prev => ({ ...prev, [id]: true }));
    [span_18](start_span)setTimeout(() => setCopyStates(prev => ({ ...prev, [id]: false })), 2000);[span_18](end_span)
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <div className="max-w-3xl mx-auto">
        {/* Branding Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-900 mb-2">SmartSaathi <span className="text-indigo-600">URL</span></h1>
          <p className="text-slate-500 font-medium">Fast Image Hosting • Auto-Optimization</p>
        </div>

        {/* Mode Selection */}
        <div className="flex justify-center gap-3 mb-10">
          {(['real', 'high', 'low'] as CompressionMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setCompressionMode(mode)}
              className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase transition-all border-2 
                ${compressionMode === mode 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                  : 'bg-white border-slate-200 text-slate-400'}`}
            >
              {mode === 'real' ? 'Real Name' : mode === 'high' ? 'HD (200KB)' : 'SmartSaathi (50KB)'}
            </button>
          ))}
        </div>

        [span_19](start_span){/* Upload Box[span_19](end_span) */}
        <div 
          className={`bg-white border-4 border-dashed rounded-[2.5rem] p-16 text-center cursor-pointer transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50 scale-[0.98]' : 'border-slate-200 hover:border-indigo-300'}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleUpload(e.dataTransfer.files); }}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <CloudIcon />
          <h3 className="text-xl font-bold text-slate-800">Click or Drag Image</h3>
          <p className="text-slate-400 text-sm mt-2">Maximum clarity at minimum size</p>
          [span_20](start_span)<input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files)} />[span_20](end_span)
        </div>

        [span_21](start_span){/* Result List[span_21](end_span) */}
        <div className="mt-12 space-y-4">
          {images.map((image) => (
            <div key={image.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-50">
                {image.status === 'completed' ? (
                  [span_22](start_span)<img src={image.url} className="w-full h-full object-cover" />[span_22](end_span)
                ) : (
                  <div className="w-full h-full flex items-center justify-center animate-pulse bg-indigo-50 text-indigo-400 font-bold text-[10px]">WAIT...</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-bold text-slate-800 truncate pr-4">{image.name}</p>
                  [span_23](start_span)<p className="text-[10px] font-black text-slate-300">{Math.round(image.size / 1024)} KB</p>[span_23](end_span)
                </div>
                <div className="flex gap-2">
                  <input readOnly value={image.url || [span_24](start_span)'Processing Image...'} className="flex-1 bg-slate-50 border-none text-[11px] p-2.5 rounded-xl text-slate-500 outline-none" />[span_24](end_span)
                  <button 
                    disabled={!image.url} 
                    onClick={() => copyToClipboard(image.url, image.id)} 
                    className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${copyStates[image.id] ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                  >
                    {copyStates[image.id] ? [span_25](start_span)'COPIED' : 'COPY URL'}[span_25](end_span)
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

