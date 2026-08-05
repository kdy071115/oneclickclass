import type { ReactNode } from 'react';

type HeroWithProductMockupProps = {
  actions: ReactNode;
  assurances: readonly string[];
  assurancesLabel: string;
  description: ReactNode;
  productMockup: ReactNode;
  title: ReactNode;
  titleId: string;
};

export function HeroWithProductMockup({
  actions,
  assurances,
  assurancesLabel,
  description,
  productMockup,
  title,
  titleId,
}: HeroWithProductMockupProps) {
  return (
    <section className="landing-hero" aria-labelledby={titleId}>
      <div className="landing-container">
        <div className="landing-hero-copy">
          <h1 id={titleId}>{title}</h1>
          <p className="landing-hero-description">{description}</p>
          <div className="landing-hero-actions">{actions}</div>
          <ul className="landing-hero-assurances" aria-label={assurancesLabel}>
            {assurances.map((assurance) => (
              <li key={assurance}>{assurance}</li>
            ))}
          </ul>
        </div>

        {productMockup}
      </div>
    </section>
  );
}
