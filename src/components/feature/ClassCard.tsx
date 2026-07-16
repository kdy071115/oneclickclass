import { ChevronRight, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ClassItem } from '../../types/class';
import { StatusBadge } from '../common/StatusBadge';
import { getClassThumbnail } from '../../utils/classThumbnail';

export function ClassCard({ item, to, variant = 'list', favorite = false, onFavorite }: { item: ClassItem; to?: string; variant?: 'list' | 'grid'; favorite?: boolean; onFavorite?: () => void }) {
  const thumbnail = item.thumbnail || getClassThumbnail(item.id);
  return (
    <article className={`class-card-wrap ${variant}`}>
      <Link className="class-card" to={to ?? `/classes/${item.id}`}>
        <span className="class-thumb" style={thumbnail ? { backgroundImage: `url(${thumbnail})` } : { background: `linear-gradient(135deg,${item.color},color-mix(in srgb, ${item.color}, white 35%))` }} />
        <span className="class-info">
          <StatusBadge>{item.status}</StatusBadge>
          <strong>{item.title}</strong>
          <small>{item.type} · {item.date}</small>
          {item.status === '모집중' && <><span className="progress"><i style={{ width: `${(item.enrolled / item.capacity) * 100}%`, background: item.color }} /></span><small>신청 {item.enrolled} / {item.capacity}명</small></>}
        </span>
        {variant === 'list' && <ChevronRight size={18} color="#c4cbd3" />}
      </Link>
      {favorite && <button className="class-favorite" aria-label="관심 클래스 해제" onClick={onFavorite}><Heart fill="currentColor" /></button>}
    </article>
  );
}
