/// <reference types="vite/client" />

// Google Maps API type declarations
declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          AutocompleteService: new () => any;
          PlacesService: new (element: HTMLElement) => any;
        };
      };
    };
  }
}

export {};
