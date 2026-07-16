import { CreditCard, Megaphone, Star, UserPlus, Wallet, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../../api/services';
import { AsyncState } from '../common/AsyncState';
import { useAsync } from '../../hooks/useAsync';
import type { NotificationItem } from '../../types/class';

const icons = { apply: UserPlus, pay: CreditCard, review: Star, settle: Wallet, notice: Megaphone };

export function NotificationPopover({ onClose }: { onClose: () => void }) {
  const load = useCallback(() => userService.notifications(), []);
  const { data, loading, error, retry } = useAsync(load);
  const [readIds, setReadIds] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const closeOutside = (event: MouseEvent) => { if (!panelRef.current?.contains(event.target as Node)) onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('mousedown', closeOutside);
    return () => { document.removeEventListener('keydown', closeOnEscape); document.removeEventListener('mousedown', closeOutside); };
  }, [onClose]);

  const markAllRead = () => {
    setReadIds(data?.map((item) => item.id) ?? []);
    void userService.markNotificationsRead();
  };
  const groups = data ? [...new Set(data.map((item) => item.group))] : [];

  return (
    <div className="notification-popover" ref={panelRef} role="dialog" aria-label="알림">
      <header><div><h2>알림</h2><p>새로운 소식을 확인하세요</p></div><button onClick={onClose} aria-label="알림 닫기"><X size={18} /></button></header>
      {loading || error || !data ? <AsyncState loading={loading} error={error} onRetry={retry} /> : (
        <div className="notification-popover-body">
          {groups.map((group) => (
            <section key={group}>
              <h3>{group}</h3>
              {data.filter((item) => item.group === group).map((item) => <NotificationLink item={item} read={readIds.includes(item.id)} onOpen={() => { setReadIds((ids) => [...ids, item.id]); onClose(); }} key={item.id} />)}
            </section>
          ))}
        </div>
      )}
      <footer><button onClick={markAllRead}>모두 읽음</button><Link to="/notifications" onClick={onClose}>알림 모두 보기</Link></footer>
    </div>
  );
}

function NotificationLink({ item, read, onOpen }: { item: NotificationItem; read: boolean; onOpen: () => void }) {
  const Icon = icons[item.type];
  const unread = item.unread && !read;
  return <Link className={`notification-popover-row ${unread ? 'unread' : ''}`} to={item.target} onClick={onOpen}><i className={item.type}><Icon size={17} /></i><span><b>{item.title}{unread && <em />}</b><small>{item.message}</small></span><time>{item.time}</time></Link>;
}
