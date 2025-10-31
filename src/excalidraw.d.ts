declare module '@excalidraw/excalidraw' {
  import { ReactNode } from 'react';
  
  export interface ExcalidrawProps {
    excalidrawAPI?: (api: any) => void;
    initialData?: any;
    onChange?: (elements: any[], appState: any, files: any) => void;
    onPointerUpdate?: (payload: any) => void;
    onCollabButtonClick?: () => void;
    onPaste?: (data: any) => boolean;
    isCollaborating?: boolean;
    UIOptions?: any;
    renderTopRightUI?: () => ReactNode;
    renderCustomStats?: () => ReactNode;
    children?: ReactNode;
    [key: string]: any;
  }
  
  export const Excalidraw: React.FC<ExcalidrawProps>;
  
  export function exportToBlob(opts: any): Promise<Blob>;
  export function exportToSvg(opts: any): SVGSVGElement;
  export function exportToCanvas(opts: any): HTMLCanvasElement;
  export function restoreElements(elements: any[], localElements: any[]): any[];
  export function convertToExcalidrawElements(elements: any[]): any[];
}
