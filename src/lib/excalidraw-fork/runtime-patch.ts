/**
 * Runtime Monkey-Patch for Excalidraw Image Size Limit
 * 
 * This patches Excalidraw's image resizing at runtime by intercepting
 * the module's internal functions before they're used.
 */

import { logger } from '@/utils/logger';

export const MAX_IMAGE_SIZE = 10000;

/**
 * Monkey-patch Excalidraw's internal resizeImageFile function
 * This must be called BEFORE the Excalidraw component is rendered
 */
export const patchExcalidrawImageResize = () => {
  logger.log('🔧 Attempting runtime patch of Excalidraw...');
  
  try {
    // Hook into module loading system
    const originalDefine = (window as any).define;
    const originalRequire = (window as any).require;
    
    // Intercept AMD/RequireJS module definitions
    if (originalDefine) {
      (window as any).define = function(...args: any[]) {
        // Check if this is the Excalidraw module
        const moduleFactory = args[args.length - 1];
        if (typeof moduleFactory === 'function') {
          const wrappedFactory = function(...factoryArgs: any[]) {
            const module = moduleFactory.apply(this, factoryArgs);
            
            // Patch resizeImageFile if found
            if (module && typeof module.resizeImageFile === 'function') {
              logger.log('✅ Found resizeImageFile - patching!');
              const originalResize = module.resizeImageFile;
              
              module.resizeImageFile = async function(file: File, opts: any) {
                const patchedOpts = {
                  ...opts,
                  maxWidthOrHeight: MAX_IMAGE_SIZE
                };
                logger.log('🖼️ Patched resizeImageFile called', {
                  original: opts?.maxWidthOrHeight,
                  patched: MAX_IMAGE_SIZE
                });
                return originalResize.call(this, file, patchedOpts);
              };
            }
            
            return module;
          };
          
          args[args.length - 1] = wrappedFactory;
        }
        
        return originalDefine.apply(this, args);
      };
    }
    
    // Intercept dynamic imports (ES modules)
    const originalImport = (window as any).__webpack_require__?.bind?.(window);
    if (originalImport) {
      (window as any).__webpack_require__ = function(moduleId: any) {
        const module = originalImport(moduleId);
        
        if (module && module.resizeImageFile) {
          logger.log('✅ Found resizeImageFile in webpack module - patching!');
          const originalResize = module.resizeImageFile;
          
          module.resizeImageFile = async function(file: File, opts: any) {
            const patchedOpts = {
              ...opts,
              maxWidthOrHeight: MAX_IMAGE_SIZE
            };
            logger.log('🖼️ Patched resizeImageFile (webpack) called', {
              original: opts?.maxWidthOrHeight,
              patched: MAX_IMAGE_SIZE
            });
            return originalResize.call(this, file, patchedOpts);
          };
        }
        
        return module;
      };
    }
    
    logger.log('✅ Runtime patch installed');
    return true;
  } catch (error) {
    logger.error('❌ Runtime patch failed', error);
    return false;
  }
};

/**
 * Alternative: Intercept File objects before they reach Excalidraw
 */
export const createImageInterceptor = () => {
  const originalFileConstructor = window.File;
  
  (window as any).File = function(bits: BlobPart[], name: string, options?: FilePropertyBag) {
    const file = new originalFileConstructor(bits, name, options);
    
    // Tag images so we can identify them later
    if (options?.type?.startsWith('image/') && bits[0] instanceof Blob) {
      logger.log('🖼️ File constructor intercepted', {
        name,
        type: options.type,
        size: (bits[0] as Blob).size
      });
      
      // Add custom metadata
      (file as any)._intercepted = true;
      (file as any)._maxSize = MAX_IMAGE_SIZE;
    }
    
    return file;
  };
  
  // Preserve prototype
  (window as any).File.prototype = originalFileConstructor.prototype;
  
  logger.log('✅ File constructor interceptor installed');
};

/**
 * Intercept image loading via fetch/xhr
 */
export const interceptImageLoading = () => {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args: any[]) {
    const response = await originalFetch.apply(this, args);
    
    // Check if this is an image
    const contentType = response.headers.get('content-type');
    if (contentType?.startsWith('image/')) {
      logger.log('🖼️ Image fetch intercepted', {
        url: args[0],
        contentType
      });
    }
    
    return response;
  };
  
  logger.log('✅ Fetch interceptor installed');
};
