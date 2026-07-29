import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="standalone">
      <div className="state">
        <h1>404</h1>
        <p>페이지를 찾을 수 없어요.</p>
        <Link className="primary" to="/">홈으로</Link>
      </div>
    </main>
  );
}

export function RouteErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="standalone">
      <div className="state" role="alert">
        <h1>{notFound ? '404' : '잠시 문제가 생겼어요.'}</h1>
        <p>{notFound ? '페이지를 찾을 수 없어요.' : '화면을 불러오지 못했어요. 다시 시도해 주세요.'}</p>
        <button className="primary" type="button" onClick={() => window.location.reload()}>
          다시 시도
        </button>
        <Link className="text-btn" to="/">홈으로</Link>
      </div>
    </main>
  );
}
