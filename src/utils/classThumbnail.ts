const key = (classId: string) => `oneclick.class-thumbnail.${classId}`;

export const getClassThumbnail = (classId: string) => {
  const storageKey = key(classId);
  const persistent = localStorage.getItem(storageKey);
  if (persistent) return persistent;

  const legacy = sessionStorage.getItem(storageKey) ?? '';
  if (legacy) {
    try {
      localStorage.setItem(storageKey, legacy);
      sessionStorage.removeItem(storageKey);
    } catch {
      // Keep the legacy value available in the current tab when storage is full.
    }
  }
  return legacy;
};

export const saveClassThumbnail = (classId: string, thumbnail: string) => {
  const storageKey = key(classId);
  localStorage.setItem(storageKey, thumbnail);
  sessionStorage.removeItem(storageKey);
};

export const readImageFile = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const THUMBNAIL_MAX_EDGE = 1600;
const THUMBNAIL_QUALITY = 0.86;

export async function optimizeClassThumbnail(file: File) {
  if (typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, THUMBNAIL_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', THUMBNAIL_QUALITY),
    );
    if (!blob) return file;
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'class-thumbnail';
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  }
}
