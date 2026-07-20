import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { StatusBar } from '../components/common/StatusBar';
export function MobileLayout() {
  const { pathname, search } = useLocation();
  const nav = useNavigate();
  const preview = /^\/classes\/[^/]+\/preview$/.test(pathname);
  const publishPreview = preview && new URLSearchParams(search).has('draft');

  return (
    <main className="stage">
      <section className="phone">
        <StatusBar />
        <div className="scroll">
          <Outlet />
        </div>
        {publishPreview && (
          <div className="layout-fixed-action">
            <button className="primary" onClick={() => nav('/classes/published')}>
              공개하기
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
