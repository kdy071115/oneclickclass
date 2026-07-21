import { Outlet } from 'react-router-dom';
import { StatusBar } from '../components/common/StatusBar';
export function MobileLayout() {
  return (
    <main className="stage">
      <section className="phone">
        <StatusBar />
        <div className="scroll">
          <Outlet />
        </div>
      </section>
    </main>
  );
}
