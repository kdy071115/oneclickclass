import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <main className="oc-auth-layout">
      <aside>
        <div className="oc-auth-brand"><span>✓</span> 원클릭 클래스</div>
        <div>
          <h2>가지고 있는 콘텐츠를<br />공개할 강의로 바꾸세요</h2>
          <p>영상·문서 등 다양한 자료로 강의 초안을 만들고, 필요한 부분만 확인해 바로 공유할 수 있어요.</p>
        </div>
        <small>OneClick Class</small>
      </aside>
      <div className="oc-auth-content"><Outlet /></div>
    </main>
  );
}
