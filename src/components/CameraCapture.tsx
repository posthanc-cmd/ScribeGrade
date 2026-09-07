import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Camera } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
  scanCount: number;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose, scanCount }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        activeStream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError('Camera access denied or not available on this device.');
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(dataUrl);
        
        // Trigger flash effect
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col font-sans">
      {/* Top Navigation */}
      <div className="flex justify-between items-center p-6 text-white z-10 bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={onClose} 
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-stone-300 mb-1">Scanner</span>
          <div className="font-bold bg-indigo-600/80 backdrop-blur-md px-3 py-1 rounded-full text-sm">
            {scanCount} {scanCount === 1 ? 'Page' : 'Pages'}
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="p-3 bg-white hover:bg-stone-200 text-stone-900 rounded-full flex items-center gap-2 font-bold shadow-lg transition-colors"
        >
          <Check className="w-5 h-5" />
          <span className="hidden sm:inline">Done</span>
        </button>
      </div>
      
      {/* Camera Viewfinder */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-stone-900">
        {error ? (
          <div className="text-white p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Camera Unavailable</h3>
            <p className="text-stone-400">{error}</p>
            <p className="text-stone-500 text-sm mt-4">Make sure you have granted camera permissions in your browser.</p>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className="absolute min-w-full min-h-full object-cover" 
          />
        )}
        
        {/* Flash Effect */}
        <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 ${flash ? 'opacity-100' : 'opacity-0'}`} />

        {/* Framing Guide */}
        {!error && (
          <div className="absolute inset-8 md:inset-16 border-2 border-white/30 rounded-2xl pointer-events-none flex items-center justify-center">
            <div className="w-12 h-12 border-t-4 border-l-4 border-white absolute top-0 left-0 rounded-tl-xl" />
            <div className="w-12 h-12 border-t-4 border-r-4 border-white absolute top-0 right-0 rounded-tr-xl" />
            <div className="w-12 h-12 border-b-4 border-l-4 border-white absolute bottom-0 left-0 rounded-bl-xl" />
            <div className="w-12 h-12 border-b-4 border-r-4 border-white absolute bottom-0 right-0 rounded-br-xl" />
          </div>
        )}
      </div>

      {/* Capture Controls */}
      <div className="p-8 pb-12 flex justify-center items-center bg-black/80 backdrop-blur-md">
        <button 
          onClick={takePhoto}
          disabled={!!error}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:bg-white/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group relative"
        >
          <div className="w-16 h-16 bg-white rounded-full group-active:scale-90 transition-transform"></div>
        </button>
      </div>
    </div>
  );
};
