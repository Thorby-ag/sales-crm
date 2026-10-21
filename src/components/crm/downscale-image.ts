function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unreadable image"));
    image.src = src;
  });
}

/**
 * Turns an uploaded logo into a small square PNG (the image is fitted, not cropped),
 * so saved demo data stays far below the localStorage quota.
 */
export async function downscaleImage(file: File, size: number): Promise<string> {
  const image = await loadImage(await readAsDataUrl(file));
  // SVGs without intrinsic dimensions report 0; treat them as square.
  const width = image.naturalWidth || size;
  const height = image.naturalHeight || size;
  const scale = Math.min(size / width, size / height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  const w = width * scale;
  const h = height * scale;
  context.drawImage(image, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/png");
}
