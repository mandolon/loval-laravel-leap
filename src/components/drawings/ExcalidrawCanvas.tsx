import React, { useCallback, useEffect, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { useDrawingPage, useUpdateDrawingPage, uploadDrawingImage } from '@/lib/api/hooks/useDrawings';
import { handleArrowCounter, resetArrowCounterState, type ArrowCounterStats } from '@/utils/excalidraw-measurement-tools';
import { toast } from 'sonner';

interface Props {
  pageId: string;
  projectId: string;
  onApiReady: (api: any) => void;
  arrowCounterEnabled: boolean;
  inchesPerSceneUnit: number | null;
  onArrowStatsChange: (stats: ArrowCounterStats) => void;
}

export default function ExcalidrawCanvas({
  pageId,
  projectId,
  onApiReady,
  arrowCounterEnabled,
  inchesPerSceneUnit,
  onArrowStatsChange
}: Props) {
  const excaliRef = useRef<any>(null);
  const persistRef = useRef<any>(null);
  const uploadingRef = useRef<Set<string>>(new Set());
  
  const { data: pageData, isLoading } = useDrawingPage(pageId);
  const updatePage = useUpdateDrawingPage();
  
  // Reset arrow counter state when switching pages
  useEffect(() => {
    resetArrowCounterState();
  }, [pageId]);

  // Handle image paste/drop - intercept before Excalidraw compresses
  const handleImageUpload = useCallback(async (file: File): Promise<string | null> => {
    if (!pageData?.drawings?.id) return null;
    
    const uploadId = `${file.name}-${Date.now()}`;
    
    if (uploadingRef.current.has(uploadId)) {
      return null; // Prevent duplicate uploads
    }
    
    uploadingRef.current.add(uploadId);
    
    try {
      toast.info('Uploading image at full quality...');
      const imageUrl = await uploadDrawingImage(file, projectId, pageData.drawings.id);
      toast.success('Image uploaded successfully');
      uploadingRef.current.delete(uploadId);
      return imageUrl;
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Failed to upload image. Using embedded version instead.');
      uploadingRef.current.delete(uploadId);
      return null; // Let Excalidraw handle it with compression
    }
  }, [projectId, pageData]);
  
  // Custom defaults (thin lines, sharp arrows, small text, high-quality images)
  const defaultAppState = {
    currentItemStrokeWidth: 0.5,
    currentItemArrowType: 'sharp',
    currentItemEndArrowhead: 'triangle',
    currentItemRoughness: 0,
    currentItemFontSize: 8,
    collaborators: new Map(),
    // High-quality image rendering settings
    exportWithDarkMode: false,
    exportBackground: true,
  };
  
  const handleChange = useCallback((elements: any, appState: any, files: any) => {
    // Ensure collaborators is always a Map
    const sanitizedAppState = {
      ...appState,
      collaborators: new Map(),
    };
    
    // Apply arrow counter if enabled
    if (arrowCounterEnabled && excaliRef.current && inchesPerSceneUnit) {
      handleArrowCounter(
        elements, 
        excaliRef.current, 
        inchesPerSceneUnit,
        onArrowStatsChange
      );
    } else if (!arrowCounterEnabled) {
      // Clear stats when disabled
      onArrowStatsChange({ count: 0, values: [] });
    }
    
    // Auto-save after 3 seconds (without collaborators field)
    if (persistRef.current) clearTimeout(persistRef.current);
    persistRef.current = setTimeout(() => {
      const { collaborators, ...appStateToSave } = sanitizedAppState;
      updatePage.mutate({
        pageId,
        excalidrawData: { elements, appState: appStateToSave, files }
      });
    }, 3000);
  }, [pageId, arrowCounterEnabled, inchesPerSceneUnit, onArrowStatsChange, updatePage]);
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        Loading drawing...
      </div>
    );
  }
  
  // Safely parse excalidraw data
  const excalidrawData = pageData?.excalidraw_data as any;
  
  // Ensure collaborators is always a Map
  const savedAppState = excalidrawData?.appState || {};
  const mergedAppState = {
    ...defaultAppState,
    ...savedAppState,
    collaborators: new Map(), // Always use a fresh Map
  };
  
  return (
    <div 
      className="h-full" 
      style={{ imageRendering: 'crisp-edges' }}
      onPaste={async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            e.preventDefault();
            const file = items[i].getAsFile();
            if (file) {
              const imageUrl = await handleImageUpload(file);
              if (imageUrl && excaliRef.current) {
                // Insert image as URL reference
                const img = new Image();
                img.src = imageUrl;
                img.onload = () => {
                  excaliRef.current?.addFiles([{
                    id: `image-${Date.now()}`,
                    dataURL: imageUrl,
                    mimeType: file.type,
                    created: Date.now(),
                  }]);
                };
              }
            }
            break;
          }
        }
      }}
    >
      <Excalidraw
        excalidrawAPI={(api) => {
          excaliRef.current = api;
          onApiReady(api);
        }}
        initialData={{
          elements: excalidrawData?.elements || [],
          appState: mergedAppState,
          files: excalidrawData?.files || {},
        }}
        onChange={handleChange}
        renderTopRightUI={() => null}
      />
    </div>
  );
}
