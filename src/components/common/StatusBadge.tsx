import { getStatusTone } from '../../utils/status';

export function StatusBadge({ children }: { children: string }) {
  return <span className={`badge status-${getStatusTone(children)}`}>{children}</span>;
}
