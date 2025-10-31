import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';

export default function ExcalidrawTestPage() {
  const [initialData, setInitialData] = useState<any>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const changeCountRef = useRef(0);
  
  // 1. Log initial environment metrics on mount
  useEffect(() => {
    console.group('🔍 Excalidraw Test Page - Initial Environment');
    console.log('window.devicePixelRatio:', window.devicePixelRatio);
    console.log('window.innerWidth:', window.innerWidth);
    console.log('window.innerHeight:', window.innerHeight);
    console.log('screen.width:', window.screen.width);
    console.log('screen.height:', window.screen.height);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }, []);
  
  // 2. Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('excalidraw-test-data');
    if (saved) {
      try {
        setInitialData(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved data:', e);
      }
    }
  }, []);
  
  // 3. Capture Excalidraw API and log initial state
  const handleExcalidrawAPI = useCallback((api: any) => {
    setExcalidrawAPI(api);
    
    console.group('🎨 Excalidraw API Ready');
    console.log('API instance:', api);
    console.log('Initial appState:', api.getAppState());
    console.log('Initial zoom:', api.getAppState()?.zoom);
    console.log('Initial viewBackgroundColor:', api.getAppState()?.viewBackgroundColor);
    console.groupEnd();
    
    // Log canvas element metrics after API is ready
    setTimeout(() => {
      const canvas = document.querySelector('.excalidraw canvas');
      if (canvas) {
        console.group('📐 Canvas Element Metrics (100ms after API ready)');
        console.log('canvas.width:', (canvas as HTMLCanvasElement).width);
        console.log('canvas.height:', (canvas as HTMLCanvasElement).height);
        console.log('canvas.style.width:', (canvas as HTMLElement).style.width);
        console.log('canvas.style.height:', (canvas as HTMLElement).style.height);
        console.log('canvas computed width:', canvas.getBoundingClientRect().width);
        console.log('canvas computed height:', canvas.getBoundingClientRect().height);
        console.groupEnd();
      }
    }, 100);
  }, []);
  
  // 4. Enhanced onChange handler with logging
  const handleChange = useCallback((elements: any, appState: any, files: any) => {
    changeCountRef.current++;
    
    // Log first 3 changes to see zoom evolution
    if (changeCountRef.current <= 3) {
      console.group(`🔄 Change #${changeCountRef.current}`);
      console.log('Zoom value:', appState?.zoom);
      console.log('Scroll X/Y:', appState?.scrollX, appState?.scrollY);
      console.log('Elements count:', elements?.length);
      console.log('Files count:', Object.keys(files || {}).length);
      console.groupEnd();
    }
    
    // Save to localStorage
    const data = { elements, appState, files };
    localStorage.setItem('excalidraw-test-data', JSON.stringify(data));
  }, []);
  
  // 5. Add forced resize trigger after API is ready
  useEffect(() => {
    if (excalidrawAPI) {
      const timer = setTimeout(() => {
        console.log('⚡ Triggering forced resize...');
        window.dispatchEvent(new Event('resize'));
        
        // Log canvas state after forced resize
        setTimeout(() => {
          const canvas = document.querySelector('.excalidraw canvas');
          if (canvas) {
            console.group('📐 Canvas Metrics After Forced Resize');
            console.log('canvas.width:', (canvas as HTMLCanvasElement).width);
            console.log('canvas.height:', (canvas as HTMLCanvasElement).height);
            console.log('Current zoom:', excalidrawAPI.getAppState()?.zoom);
            console.groupEnd();
          }
        }, 100);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [excalidrawAPI]);
  
  // 6. Monitor window resize events
  useEffect(() => {
    const handleResize = () => {
      console.log('📏 Window resized:', {
        devicePixelRatio: window.devicePixelRatio,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        zoom: excalidrawAPI?.getAppState()?.zoom
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [excalidrawAPI]);
  
  return (
    <div className="h-screen w-screen bg-white">
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        initialData={initialData || { elements: [], appState: {}, files: {} }}
        onChange={handleChange}
      />
    </div>
  );
}
