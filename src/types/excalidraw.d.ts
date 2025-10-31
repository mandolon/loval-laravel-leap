declare module '@excalidraw/excalidraw' {
  import { ComponentType } from 'react';
  
  export interface ExcalidrawProps {
    initialData?: {
      elements?: any[];
      appState?: any;
      files?: Record<string, any>;
    };
    onChange?: (elements: any[], appState: any, files: any) => void;
    ref?: any;
    [key: string]: any;
  }
  
  export const Excalidraw: ComponentType<ExcalidrawProps>;
  export default Excalidraw;
}
