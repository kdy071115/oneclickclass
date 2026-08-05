import { ChevronRight, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ClassItem } from '../../types/class';
import { StatusBadge } from '../common/StatusBadge';
import { getClassThumbnail } from '../../utils/classThumbnail';

export function ClassCard({
  item,
  to,
  variant = 'list',
  favorite = false,
  onFavorite,
}: {
  item: ClassItem;
  to?: string;
  variant?: 'list' | 'grid';
  favorite?: boolean;
  onFavorite?: () => void;
}) {
  const thumbnail = item.thumbnail || getClassThumbnail(item.id);
  const remainingSeats = Math.max(0, item.capacity - item.enrolled);
  const isRecruiting = item.status === '모집중' || item.status === '모집 마감';
  return (
    <article className={`class-card-wrap ${variant}`}>
      <Link className="class-card" to={to ?? `/classes/${item.id}`}>
        <span
          className={`class-thumb${thumbnail ? '' : ' is-placeholder'}`}
          style={
            thumbnail
              ? { backgroundImage: `url(${thumbnail})` }
              : {
                  background: `linear-gradient(135deg,${item.color},color-mix(in srgb, ${item.color}, white 35%))`,
                }
          }
        >
          {!thumbnail && variant === 'grid' && (
            <span className="class-thumb-copy" aria-hidden="true">
              <small>ONECLICK CLASS</small>
              <b>{item.title}</b>
            </span>
          )}
        </span>
        <span className="class-info">
          <StatusBadge>{item.status}</StatusBadge>
          <strong>{item.title}</strong>
          <small>
            {item.type} · {item.date}
          </small>
          {isRecruiting && (
            <>
              <span className="progress">
                <i
                  style={{
                    width: `${Math.min(100, (item.enrolled / item.capacity) * 100)}%`,
                    background: item.color,
                  }}
                />
              </span>
              <small className="class-card-capacity">
                신청 {item.enrolled} / {item.capacity}명 ·{' '}
                {remainingSeats ? `잔여 ${remainingSeats}자리` : '정원 마감'}
              </small>
            </>
          )}
          {!isRecruiting && (
            <small className="class-card-capacity">
              {item.status === '진행중' || item.status === '종료' ? '수강' : '신청'}{' '}
              {item.enrolled} / {item.capacity}명
            </small>
          )}
        </span>
        {variant === 'list' && <ChevronRight size={18} color="#c4cbd3" />}
      </Link>
      {favorite && (
        <button className="class-favorite" aria-label="관심 클래스 해제" onClick={onFavorite}>
          <Heart fill="currentColor" />
        </button>
      )}
    </article>
  );
}
