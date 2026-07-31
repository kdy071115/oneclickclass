import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PageHeader({
  title,
  subtitle,
  backTo,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
}) {
  const nav = useNavigate();

  return (
    <>
      <button
        className="back-btn"
        type="button"
        onClick={() => (backTo ? nav(backTo) : nav(-1))}
        aria-label="뒤로"
      >
        <ArrowLeft />
      </button>
      {title && <h1>{title}</h1>}
      {subtitle && <p className="muted page-subtitle">{subtitle}</p>}
    </>
  );
}
