import React, { useRef, useState } from 'react';
import { Camera, Upload, X, FileImage, Loader2 } from 'lucide-react';
import { CameraCapture } from './CameraCapture';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker from a CDN to avoid bundler issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

interface ScannerProps {
  onImagesReady: (base64Images: string[], language: string) => void;
  isLoading: boolean;
}

export const Scanner: React.FC<ScannerProps> = ({ onImagesReady, isLoading }) => {
  const [images, setImages] = useState<string[]>([]);
  const [language, setLanguage] = useState<string>('en');
  const [showCamera, setShowCamera] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.4)); // Drastically reduced quality for faster processing
      };
    });
  };

  const handlePdfUpload = async (file: File) => {
    try {
      setIsPdfLoading(true);
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const pageImages: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          canvas: canvas,
          viewport: viewport,
        } as any;

        await page.render(renderContext).promise;
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        const compressed = await compressImage(base64);
        pageImages.push(compressed);
      }
      
      setImages(prev => [...prev, ...pageImages]);
    } catch (error) {
      console.error("Error parsing PDF", error);
      alert("Could not process PDF file. Please ensure it is a valid document.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          if (event.target?.result) {
            const compressed = await compressImage(event.target.result as string);
            setImages(prev => [...prev, compressed]);
          }
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        await handlePdfUpload(file);
      }
    }
    
    // Clear input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCameraCapture = async (base64: string) => {
    const compressed = await compressImage(base64);
    setImages(prev => [...prev, compressed]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (images.length > 0) {
      onImagesReady(images, language);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm p-10 border border-stone-200">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Upload Student Workbook</h2>
        <p className="text-stone-500 mt-2 text-sm max-w-lg mx-auto">Scan or upload photos of the student's handwritten answers to be graded automatically against standard keys.</p>
      </div>

      {/* Language Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-stone-700 mb-3">Workbook Language</label>
        <div className="flex gap-4">
          <label className={"flex-1 cursor-pointer flex items-center justify-center py-3 px-4 rounded-xl border transition-all " + (language === 'en' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-sm' : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50')}>
            <input type="radio" className="sr-only" name="language" value="en" checked={language === 'en'} onChange={() => setLanguage('en')} />
            English
          </label>
          <label className={"flex-1 cursor-pointer flex items-center justify-center py-3 px-4 rounded-xl border transition-all " + (language === 'es' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-sm' : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50')}>
            <input type="radio" className="sr-only" name="language" value="es" checked={language === 'es'} onChange={() => setLanguage('es')} />
            Spanish (Español)
          </label>
        </div>
      </div>

      {/* Upload Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <button
          onClick={() => setShowCamera(true)}
          className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-stone-300 rounded-2xl bg-stone-50 hover:bg-stone-100 hover:border-stone-400 transition-colors group"
        >
          <div className="bg-white p-3 rounded-xl shadow-sm group-hover:shadow transition-shadow mb-4 border border-stone-100">
            <Camera className="w-6 h-6 text-indigo-600" />
          </div>
          <span className="font-semibold text-stone-800">Scan via Camera</span>
          <span className="text-sm text-stone-500 mt-1">Take pictures of pages</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isPdfLoading}
          className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-stone-300 rounded-2xl bg-stone-50 hover:bg-stone-100 hover:border-stone-400 transition-colors group disabled:opacity-70 disabled:cursor-wait"
        >
          <div className="bg-white p-3 rounded-xl shadow-sm group-hover:shadow transition-shadow mb-4 border border-stone-100">
            {isPdfLoading ? <Loader2 className="w-6 h-6 text-stone-600 animate-spin" /> : <Upload className="w-6 h-6 text-stone-600" />}
          </div>
          <span className="font-semibold text-stone-800">{isPdfLoading ? 'Processing PDF...' : 'Upload Document'}</span>
          <span className="text-sm text-stone-500 mt-1">PDF or image gallery</span>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          className="hidden"
        />
      </div>

      {showCamera && (
        <CameraCapture 
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          scanCount={images.length}
        />
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-stone-100">
            <FileImage className="w-5 h-5 text-stone-400" />
            <h3 className="font-semibold text-stone-800 tracking-tight">Documents to Grade ({images.length})</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {images.map((img, idx) => {
              const isPdf = img.startsWith('data:application/pdf');
              return (
              <div key={idx} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-stone-200 shadow-sm group bg-stone-50 flex items-center justify-center">
                {isPdf ? (
                  <div className="flex flex-col items-center justify-center text-stone-400">
                    <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    <span className="text-xs font-medium">PDF Doc</span>
                  </div>
                ) : (
                  <img src={img} alt={"Page " + (idx + 1)} className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-stone-900/70 text-white text-[10px] text-center py-1.5 font-medium backdrop-blur-sm">
                  {isPdf ? 'Document' : 'Page ' + (idx + 1)}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={images.length === 0 || isLoading}
        className="w-full py-4 rounded-xl font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 disabled:bg-stone-300 disabled:text-stone-500"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Grading in progress...
          </>
        ) : (
          "Grade Workbook"
        )}
      </button>
    </div>
  );
};
