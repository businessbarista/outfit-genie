import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES, SUBTYPES, COLORS, SEASONS, PATTERNS, DRESS_LEVELS, LAYER_ROLES } from '@/lib/constants';
import { Upload, Camera, Loader2, ArrowLeft, Check, Scan } from 'lucide-react';
import CameraScanner from '@/components/CameraScanner';


type Step = 'upload' | 'scanning' | 'processing' | 'review';

interface TagData {
  category: string;
  subtype: string;
  primary_color: string;
  season: string;
  pattern: string;
  dress_level: string;
  layer_role: string;
  notes: string;
  favorite: boolean;
}

export default function AddItem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>('');
  const [cutoutPreview, setCutoutPreview] = useState<string>('');
  const [cutoutBlob, setCutoutBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<TagData>({
    category: 'tops',
    subtype: '',
    primary_color: '',
    season: 'unknown',
    pattern: 'unknown',
    dress_level: 'unknown',
    layer_role: 'unknown',
    notes: '',
    favorite: false,
  });

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }

    setOriginalFile(file);
    const preview = URL.createObjectURL(file);
    setOriginalPreview(preview);
    setStep('processing');
    setProcessing(true);

    try {
      // Convert file to base64 for AI processing
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        // Start both AI tagging and background removal in parallel
        setProcessingStatus('Analyzing clothing...');
        
        const tagPromise = supabase.functions.invoke('analyze-clothing', {
          body: { imageBase64: base64 },
        });

        // AI-powered background removal for precise clothing extraction
        setProcessingStatus('Extracting clothing item...');
        let cutoutBlobResult: Blob | null = null;
        let cutoutPreviewUrl = preview;
        
        try {
          const { data: bgData, error: bgError } = await supabase.functions.invoke('remove-background', {
            body: { imageBase64: base64 },
          });
          
          if (bgError) throw bgError;
          
          if (bgData?.image) {
            // Convert base64 to blob
            const response = await fetch(bgData.image);
            cutoutBlobResult = await response.blob();
            cutoutPreviewUrl = bgData.image;
            console.log('Background removed successfully with AI');
          } else {
            throw new Error('No image returned');
          }
        } catch (bgError) {
          console.error('Background removal failed:', bgError);
          toast({ 
            title: 'Background removal failed', 
            description: 'Using original image instead.', 
            variant: 'default' 
          });
          cutoutBlobResult = file;
        }

        // Wait for AI tagging to complete
        setProcessingStatus('Finishing up...');
        const { data: tagData, error: tagError } = await tagPromise;

        if (!tagError && tagData) {
          setTags((prev) => ({
            ...prev,
            category: tagData.category || prev.category,
            subtype: tagData.subtype || prev.subtype,
            primary_color: tagData.primary_color || prev.primary_color,
            season: tagData.season || prev.season,
            pattern: tagData.pattern || prev.pattern,
            dress_level: tagData.dress_level || prev.dress_level,
            layer_role: tagData.layer_role || prev.layer_role,
          }));
        }

        setCutoutPreview(cutoutPreviewUrl);
        setCutoutBlob(cutoutBlobResult);
        setProcessing(false);
        setStep('review');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Processing error:', error);
      toast({ title: 'Processing failed', description: 'Using original image. You can still save.', variant: 'default' });
      setCutoutPreview(preview);
      setCutoutBlob(file);
      setProcessing(false);
      setStep('review');
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleSave = async () => {
    if (!user || !originalFile) return;
    
    setSaving(true);
    try {
      const itemId = crypto.randomUUID();
      const basePath = `${user.id}/${itemId}`;

      // Upload original
      const originalExt = originalFile.name.split('.').pop() || 'jpg';
      const { error: originalError } = await supabase.storage
        .from('closet-originals')
        .upload(`${basePath}/original.${originalExt}`, originalFile);

      if (originalError) throw originalError;

      const { data: originalUrl } = supabase.storage
        .from('closet-originals')
        .getPublicUrl(`${basePath}/original.${originalExt}`);

      // Upload cutout (or original if no cutout)
      let cutoutUrl = null;
      if (cutoutBlob) {
        const { error: cutoutError } = await supabase.storage
          .from('closet-cutouts')
          .upload(`${basePath}/cutout.png`, cutoutBlob);

        if (!cutoutError) {
          const { data: cutoutData } = supabase.storage
            .from('closet-cutouts')
            .getPublicUrl(`${basePath}/cutout.png`);
          cutoutUrl = cutoutData.publicUrl;
        }
      }

      // Create database entry
      const { error: dbError } = await supabase.from('closet_items').insert({
        id: itemId,
        user_id: user.id,
        original_image_url: originalUrl.publicUrl,
        cutout_image_url: cutoutUrl,
        category: tags.category,
        subtype: tags.subtype || null,
        primary_color: tags.primary_color || null,
        season: tags.season,
        pattern: tags.pattern,
        dress_level: tags.dress_level,
        layer_role: tags.layer_role,
        favorite: tags.favorite,
        notes: tags.notes || null,
      });

      if (dbError) throw dbError;

      toast({ title: 'Item added!', description: 'Your clothing item has been saved.' });
      navigate('/app/closet');
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Failed to save', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const subtypeOptions = SUBTYPES[tags.category] || [];

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/closet')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Add Item</h1>
      </div>

      {step === 'upload' && (
        <Card>
          <CardContent className="p-6">
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/50 p-12 transition-colors hover:bg-secondary cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-center font-medium">Drop your photo here</p>
              <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>
            <div className="mt-4 flex justify-center gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setStep('scanning')}
              >
                <Scan className="h-4 w-4" />
                Scan Item
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }
                }}
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'scanning' && (
        <CameraScanner
          onCapture={(file) => {
            handleFileSelect(file);
          }}
          onClose={() => setStep('upload')}
        />
      )}

      {step === 'processing' && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="font-medium">Processing your image...</p>
            <p className="mt-1 text-sm text-muted-foreground">{processingStatus || 'Analyzing and tagging your clothing item'}</p>
          </CardContent>
        </Card>
      )}

      {step === 'review' && (
        <div className="space-y-6">
          {/* Preview */}
          <Card>
            <CardContent className="p-4">
              <div className="aspect-square overflow-hidden rounded-lg bg-secondary">
                <img
                  src={cutoutPreview || originalPreview}
                  alt="Preview"
                  className="h-full w-full object-contain"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tag Editor */}
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={tags.category} onValueChange={(v) => setTags({ ...tags, category: v, subtype: '' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subtype</Label>
                  <Select value={tags.subtype} onValueChange={(v) => setTags({ ...tags, subtype: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subtype" />
                    </SelectTrigger>
                    <SelectContent>
                      {subtypeOptions.map((sub) => (
                        <SelectItem key={sub} value={sub} className="capitalize">
                          {sub.replace('-', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select value={tags.primary_color} onValueChange={(v) => setTags({ ...tags, primary_color: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLORS.map((color) => (
                        <SelectItem key={color} value={color} className="capitalize">
                          {color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Season</Label>
                  <Select value={tags.season} onValueChange={(v) => setTags({ ...tags, season: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEASONS.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s.replace('-', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Pattern</Label>
                  <Select value={tags.pattern} onValueChange={(v) => setTags({ ...tags, pattern: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PATTERNS.map((p) => (
                        <SelectItem key={p} value={p} className="capitalize">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select value={tags.dress_level} onValueChange={(v) => setTags({ ...tags, dress_level: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DRESS_LEVELS.map((d) => (
                        <SelectItem key={d} value={d} className="capitalize">
                          {d.replace('-', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Layer Role</Label>
                  <Select value={tags.layer_role} onValueChange={(v) => setTags({ ...tags, layer_role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LAYER_ROLES.map((l) => (
                        <SelectItem key={l} value={l} className="capitalize">
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between space-x-2 sm:col-span-2">
                  <Label htmlFor="favorite">Mark as favorite</Label>
                  <Switch
                    id="favorite"
                    checked={tags.favorite}
                    onCheckedChange={(checked) => setTags({ ...tags, favorite: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add any notes about this item..."
                  value={tags.notes}
                  onChange={(e) => setTags({ ...tags, notes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep('upload')}>
              Upload Different Photo
            </Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Item
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
