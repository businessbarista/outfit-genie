import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Camera, Loader2, Check, Focus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraScannerProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraScanner({ onCapture, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [feedback, setFeedback] = useState('Starting camera...');
  const [confidence, setConfidence] = useState(0);
  const [clothingType, setClothingType] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setFeedback('Point camera at clothing item');
        }
      } catch (error) {
        console.error('Camera error:', error);
        setCameraError('Could not access camera. Please ensure camera permissions are granted.');
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  // Capture frame and analyze
  const captureFrame = useCallback(async (): Promise<string | null> => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  // Scan loop
  useEffect(() => {
    if (cameraError || isCapturing) return;

    const scanFrame = async () => {
      const frameBase64 = await captureFrame();
      if (!frameBase64) return;

      try {
        const { data, error } = await supabase.functions.invoke('detect-clothing', {
          body: { imageBase64: frameBase64 }
        });

        if (error) {
          console.error('Detection error:', error);
          return;
        }

        setFeedback(data.feedback || 'Scanning...');
        setConfidence(data.confidence || 0);
        setClothingType(data.clothing_type || null);

        // Auto-capture when ready and confident
        if (data.ready && data.confidence >= 80 && !isCapturing) {
          setIsCapturing(true);
          setFeedback('Item captured!');
          
          // Capture high-quality image
          const highQualityFrame = await captureFrame();
          if (highQualityFrame) {
            // Convert base64 to file
            const response = await fetch(highQualityFrame);
            const blob = await response.blob();
            const file = new File([blob], 'captured-clothing.jpg', { type: 'image/jpeg' });
            
            // Small delay for visual feedback
            setTimeout(() => {
              onCapture(file);
            }, 500);
          }
        }
      } catch (err) {
        console.error('Scan error:', err);
      }
    };

    // Start scanning every 1.5 seconds
    scanIntervalRef.current = setInterval(scanFrame, 1500);
    
    // Initial scan
    setTimeout(scanFrame, 500);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [captureFrame, isCapturing, onCapture, cameraError]);

  const getConfidenceColor = () => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 50) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  if (cameraError) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Camera className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="font-medium text-destructive">{cameraError}</p>
          <Button onClick={onClose} className="mt-4">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-background/90 to-transparent p-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
        <span className="text-sm font-medium">Scan Clothing</span>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Camera View */}
      <div className="relative h-full w-full">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "relative h-72 w-72 rounded-3xl border-4 transition-all duration-300",
            isCapturing ? "border-green-500 bg-green-500/10" : 
            confidence >= 80 ? "border-green-500" :
            confidence >= 50 ? "border-yellow-500" : "border-white/50"
          )}>
            {/* Corner Markers */}
            <div className="absolute -left-1 -top-1 h-8 w-8 border-l-4 border-t-4 border-primary rounded-tl-lg" />
            <div className="absolute -right-1 -top-1 h-8 w-8 border-r-4 border-t-4 border-primary rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-primary rounded-br-lg" />

            {/* Center Focus Icon */}
            {!isCapturing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Focus className="h-12 w-12 text-white/30" />
              </div>
            )}

            {/* Capture Success Icon */}
            {isCapturing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-green-500 p-4">
                  <Check className="h-12 w-12 text-white" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Feedback */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent p-6">
          <div className="mx-auto max-w-sm text-center">
            {/* Feedback Text */}
            <p className={cn(
              "text-lg font-medium transition-colors",
              isCapturing ? "text-green-500" : getConfidenceColor()
            )}>
              {feedback}
            </p>

            {/* Clothing Type */}
            {clothingType && !isCapturing && (
              <p className="mt-1 text-sm text-muted-foreground capitalize">
                Detected: {clothingType}
              </p>
            )}

            {/* Confidence Bar */}
            {!isCapturing && (
              <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300",
                      confidence >= 80 ? "bg-green-500" :
                      confidence >= 50 ? "bg-yellow-500" : "bg-muted-foreground"
                    )}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {!isCapturing && confidence < 30 && (
              <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Scanning...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
