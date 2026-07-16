const key = (classId: string) => `oneclick.class-thumbnail.${classId}`;

export const getClassThumbnail = (classId: string) => sessionStorage.getItem(key(classId)) ?? '';

export const saveClassThumbnail = (classId: string, thumbnail: string) => {
  sessionStorage.setItem(key(classId), thumbnail);
};

export const readImageFile = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});
