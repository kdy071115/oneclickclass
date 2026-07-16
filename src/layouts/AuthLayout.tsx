import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <main className="oc-auth-layout">
      <aside>
        <div className="oc-auth-brand"><span>✓</span> 원클릭 클래스</div>
        <div>
          <h1>클래스 운영의 모든 순간을<br />한 곳에서 관리하세요</h1>
          <p>신청부터 출석, 정산, 수료증까지 자연스럽게 이어집니다.</p>
        </div>
        <small>OneClick Class</small>
      </aside>
      <div className="oc-auth-content"><Outlet /></div>
    </main>
  );
}
