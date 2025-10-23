import { useState, useEffect, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import { PDFAnnotationLayer } from './PDFAnnotationLayer';
import { AnnotationToolbar } from './AnnotationToolbar';
import { useAnnotationTools } from '@/hooks/useAnnotationTools';
import { useGridSnapping } from '@/hooks/useGridSnapping';
import type { GridSizeKey } from '@/types/annotations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import '@/lib/pdf-config'; // Ensure PDF worker is configured
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface AnnotationEditorModalProps {
  file: any;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (annotations: any) => void;
}

export const AnnotationEditorModal = ({
  file,
  isOpen,
  onClose,
  onSave,
}: AnnotationEditorModalProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale] = useState(1.5); // Fixed scale for annotation editor
  const [rotation] = useState(0); // Fixed rotation for annotation editor
  const [pdfPageRef, setPdfPageRef] = useState<any>(null);
  const [currentViewport, setCurrentViewport] = useState<any>(null);
  const [gridSize, setGridSize] = useState<GridSizeKey>('12"');
  const [gridVisible, setGridVisible] = useState(true);

  const annotationTools = useAnnotationTools();
  const { snapToPdfGrid } = useGridSnapping(gridSize, gridVisible);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPageNumber(1);
      setNumPages(null);
      setPdfPageRef(null);
      setCurrentViewport(null);
      annotationTools.clearAll();
    }
  }, [isOpen]);

  // Create viewport when page loads
  useEffect(() => {
    if (pdfPageRef) {
      const viewport = pdfPageRef.getViewport({
        scale: scale,
        rotation: rotation,
      });
      setCurrentViewport(viewport);
    }
  }, [pdfPageRef, scale, rotation]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('[AnnotationEditorModal] PDF loaded successfully, pages:', numPages);
    setNumPages(numPages);
  };

  const onPageLoadSuccess = useCallback((page: any) => {
    setPdfPageRef(page);
  }, []);

  const handlePrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPageNumber((prev) => Math.min(numPages || 1, prev + 1));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(annotationTools.annotations);
    }
    toast.success('Annotations saved');
    onClose();
  };

  const handleCancel = () => {
    annotationTools.clearAll();
    onClose();
  };

  const documentFileSource = file?.url || file?.name;
  
  console.log('[AnnotationEditorModal] Rendering modal, isOpen:', isOpen, 'file:', file, 'documentFileSource:', documentFileSource);

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Edit Annotations - {file?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Toolbar */}
          <div className="px-6 py-3 border-b bg-muted/30">
            <AnnotationToolbar
              currentTool={annotationTools.activeTool}
              onToolChange={annotationTools.setActiveTool}
              currentColor={annotationTools.activeColor}
              onColorChange={annotationTools.setActiveColor}
              currentStrokeWidth={annotationTools.strokeWidth}
              onStrokeWidthChange={annotationTools.setStrokeWidth}
              currentGridSize={gridSize}
              onGridSizeChange={setGridSize}
              gridVisible={gridVisible}
              onGridToggle={setGridVisible}
              onUndo={() => annotationTools.undo(null, currentViewport)}
              onRedo={() => annotationTools.redo(null, currentViewport)}
              onSave={handleSave}
            />
          </div>

          {/* PDF Viewer with Annotation Layer */}
          <div className="flex-1 relative min-h-0 bg-muted/10">
            <div className="absolute inset-0 overflow-auto">
              <div className="flex items-center justify-center min-h-full p-6">
                <div className="relative">
                  <Document
                    file={documentFileSource}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(error) => {
                      console.error('PDF load error:', error);
                      toast.error('Failed to load PDF');
                    }}
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      onLoadSuccess={onPageLoadSuccess}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>

                  {/* Annotation Layer */}
                  {currentViewport && pdfPageRef && (
                    <PDFAnnotationLayer
                      pageNumber={pageNumber}
                      pdfPage={pdfPageRef}
                      scale={scale}
                      rotation={rotation}
                      visible={true}
                      viewport={currentViewport}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Page Navigation */}
          {numPages && numPages > 1 && (
            <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm font-medium">
                Page {pageNumber} of {numPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={pageNumber >= numPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Annotations</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
