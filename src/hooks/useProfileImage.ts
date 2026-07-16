import { useEffect, useState } from 'react';

const storageKey = 'oneclick.profile-image';
const changeEvent = 'oneclick:profile-image-change';

export const getProfileImage = () => sessionStorage.getItem(storageKey) ?? '';

export const saveProfileImage = (image: string) => {
  if (image) sessionStorage.setItem(storageKey, image);
  else sessionStorage.removeItem(storageKey);
  window.dispatchEvent(new CustomEvent(changeEvent, { detail: image }));
};

export function useProfileImage() {
  const [image, setImage] = useState(getProfileImage);
  useEffect(() => {
    const update = (event: Event) => setImage((event as CustomEvent<string>).detail);
    window.addEventListener(changeEvent, update);
    return () => window.removeEventListener(changeEvent, update);
  }, []);
  return image;
}
