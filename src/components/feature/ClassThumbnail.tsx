import type { ClassThumbnailPosition } from '../../types/class';

type ClassThumbnailProps = {
  src?: string;
  position?: ClassThumbnailPosition;
  title: string;
  alt: string;
};

export function ClassThumbnail({ src, position = 'center', title, alt }: ClassThumbnailProps) {
  if (src) {
    return (
      <img
        className="class-thumbnail-image"
        src={src}
        alt={alt}
        style={{ objectPosition: position }}
      />
    );
  }

  return (
    <span className="class-thumbnail-placeholder" role="img" aria-label={alt}>
      <small>ONECLICK CLASS</small>
      <b>{title}</b>
    </span>
  );
}
