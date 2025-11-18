// Polyfill for Promise.withResolvers (ES2024)
// Required for older Safari/Chrome browsers with PDF.js v5.x
// Supports: Safari < 17.4, Chrome < 119, Firefox < 121

// Type declaration for Promise.withResolvers
declare global {
  interface PromiseConstructor {
    withResolvers<T>(): {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: any) => void;
    };
  }
}

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

export {};
