import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import './hero-product-mockup.css';

type HeroProductMockupProps = {
  ariaLabel: string;
  brandLabel: string;
  caption: string;
  desktopImage: string;
  desktopImageAlt: string;
  desktopTitle: string;
  mobileContent: ReactNode;
};

export function HeroProductMockup({
  ariaLabel,
  brandLabel,
  caption,
  desktopImage,
  desktopImageAlt,
  desktopTitle,
  mobileContent,
}: HeroProductMockupProps) {
  return (
    <figure className="hero-product-mockup" aria-label={ariaLabel}>
      <div className="hero-product-mockup__desktop">
        <header>
          <strong>
            <Check size={13} strokeWidth={3} /> {brandLabel}
          </strong>
          <span>{desktopTitle}</span>
        </header>
        <div className="hero-product-mockup__desktop-crop">
          <img src={desktopImage} alt={desktopImageAlt} fetchPriority="high" decoding="async" />
        </div>
      </div>

      <div className="hero-product-mockup__mobile" aria-hidden="true">
        {mobileContent}
      </div>

      <figcaption>{caption}</figcaption>
    </figure>
  );
}
