/**
 * Excalidraw Image Size Override
 * 
 * This module patches Excalidraw's image resizing to allow full-resolution images.
 * 
 * Original Excalidraw behavior: Resizes images to max 1440px on the largest axis
 * Our override: Increases limit to 10000px to support high-res images
 * 
 * License: MIT (Excalidraw is MIT licensed)
 * Source: https://github.com/excalidraw/excalidraw
 */

import pica from "pica";
import imageBlobReduce from "image-blob-reduce";

export const MAX_IMAGE_SIZE = 10000; // Increased from 1440px

/**
 * Custom resizeImageFile with increased size limit
 * Based on Excalidraw's resizeImageFile but with configurable max size
 */
export const resizeImageFile = async (
  file: File,
  opts: {
    outputType?: "image/jpeg";
    maxWidthOrHeight?: number;
  } = {},
): Promise<File> => {
  const maxSize = opts.maxWidthOrHeight || MAX_IMAGE_SIZE;

  // SVG files can't be resized
  if (file.type === "image/svg+xml") {
    return file;
  }

  // CRA's minification settings break pica in WebWorkers
  const reduce = imageBlobReduce({
    pica: pica({ features: ["js", "wasm"] }),
  });

  if (opts.outputType) {
    const { outputType } = opts;
    reduce._create_blob = function (env: any) {
      return this.pica.toBlob(env.out_canvas, outputType, 0.8).then((blob: Blob) => {
        env.out_blob = blob;
        return env;
      });
    };
  }

  const supportedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!supportedTypes.includes(file.type)) {
    throw new Error("Unsupported image type");
  }

  return new File(
    [await reduce.toBlob(file, { max: maxSize, alpha: true })],
    file.name,
    {
      type: opts.outputType || file.type,
    },
  );
};

/**
 * Install the override by monkey-patching the Excalidraw module
 * Call this before using the Excalidraw component
 */
export const installImageSizeOverride = () => {
  console.log("🔧 Installing Excalidraw image size override...");
  console.log(`📏 New max image size: ${MAX_IMAGE_SIZE}px (was 1440px)`);
  
  // Note: This is a build-time patch approach
  // The actual patching happens in the npm package via patch-package
  
  return {
    maxImageSize: MAX_IMAGE_SIZE,
    resizeImageFile,
  };
};
