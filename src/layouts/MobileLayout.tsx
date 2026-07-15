import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { StatusBar } from '../components/common/StatusBar';
export function MobileLayout() {
  const { pathname, search } = useLocation();
  const nav = useNavigate();
  const preview = /^\/classes\/[^/]+\/preview$/.test(pathname);
  const publishPreview = preview && new URLSearchParams(search).has('draft');
  const enroll = /^\/classes\/[^/]+\/enroll$/.test(pathname);
  const [toast, setToast] = useState('');
  const apply = () => {
    setToast('신청이 접수됐어요');
    window.setTimeout(() => setToast(''), 2000);
  };

  return (
    <main className="stage">
      <section className="phone">
        <StatusBar />
        <div className="scroll">
          <Outlet />
        </div>
        {(publishPreview || enroll) && (
          <div className="layout-fixed-action">
            <button className="primary" onClick={publishPreview ? () => nav('/classes/published') : apply}>
              {publishPreview ? '공개하기' : '신청하기'}
            </button>
          </div>
        )}
        {toast && (
          <div className="done-toast" aria-live="polite">
            {toast}
          </div>
        )}
      </section>
    </main>
  );
}
