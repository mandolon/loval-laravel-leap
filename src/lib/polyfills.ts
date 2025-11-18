// Polyfills for ES2024 features required by PDF.js v5.x
// Supports: Safari < 17.5, Chrome < 126, Firefox < 126

// Type declarations
declare global {
  interface PromiseConstructor {
    withResolvers<T>(): {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: any) => void;
    };
  }
  
  interface URLConstructor {
    parse(url: string | URL, base?: string | URL): URL | null;
  }
}

// Polyfill for Promise.withResolvers (ES2024)
if (!(Promise as any).withResolvers) {
  (Promise as any).withResolvers = function <T>() {
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve: resolve!, reject: reject! };
  };
}

// Polyfill for URL.parse (ES2024)
// Returns null instead of throwing on invalid URLs
if (!(URL as any).parse) {
  (URL as any).parse = function(url: string | URL, base?: string | URL): URL | null {
    try {
      return new URL(url, base);
    } catch {
      return null;
    }
  };
}

export {};
