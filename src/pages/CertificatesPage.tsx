import { ArrowLeft, Award, Download, Eye, Share2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
const certs = [
  ['데이터 시각화 마스터', '2026.06 수료 · 출석 100% · 시험 94점', '#4c82f7'],
  ['UX 리서치 실무 4주', '2026.05 수료 · 출석 92% · 시험 88점', '#7048e8'],
  ['사진 보정 클래스', '2026.03 수료 · 출석 96% · 수료증 발급', '#0ca678'],
];

export function CertificatesPage() {
  return (
    <>
      <div className="oc-web-page">
        <div className="oc-web-head inline">
          <h1>수료한 강의</h1>
          <p>지금까지 완주한 클래스와 수료증을 확인하세요</p>
        </div>
        <div className="oc-insights">
          <div className="oc-card"><h3>수료증</h3><p>발급 완료</p><b>3개</b></div>
          <div className="oc-card"><h3>수강 완료</h3><p>전체 학습 이력</p><b>5개</b></div>
          <div className="oc-card"><h3>평균 출석</h3><p>최근 6개월 기준</p><b>96%</b></div>
        </div>
        <div className="oc-card-grid">
          {certs.map((c, i) => (
            <article className="oc-card oc-certificate-card" key={c[0]}>
              <div className="oc-cert-ribbon" style={{ background: c[2] }}>
                <Award />
              </div>
              <h3>{c[0]}</h3>
              <p>{c[1]}</p>
              <div>
                <Link to={`/my/certificates/${i}`}><Eye size={17} /> 수료증 보기</Link>
                <button onClick={() => window.print()}><Download size={17} /> PDF 저장</button>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="page subpage">
        <PageHeader title="수료한 강의" subtitle="지금까지 완주한 클래스예요" />
        <div className="stats cert-stats"><div><b>3</b><small>수료증</small></div><div><b>5</b><small>수강 완료</small></div><div><b>96%</b><small>평균 출석</small></div></div>
        {certs.map((c, i) => <article className="cert-card" key={c[0]}><div className="cert-title"><i style={{ background: c[2] }}><Award /></i><span><b>{c[0]}</b><small>{c[1]}</small></span><em>수료증</em></div><div><Link to={`/my/certificates/${i}`}><Eye />수료증 보기</Link><button onClick={() => window.print()}><Download />PDF 저장</button></div></article>)}
      </div>
    </>
  );
}

export function CertificateViewPage() {
  const nav = useNavigate();
  return (
    <>
      <div className="oc-web-page">
        <button className="oc-back-link" onClick={() => nav(-1)}><ArrowLeft size={16} /> 목록으로</button>
        <div className="oc-panel oc-cert-page">
          <div className="certificate">
            <small>CERTIFICATE</small><h2>수료증</h2><i>지</i><h3>이지훈</h3><p>위 사람은 아래 과정을 성실히 이수하였기에<br />이 수료증을 수여합니다.</p><h4>데이터 시각화 마스터</h4><div><span><b>42</b>수강 일수</span><span><b>100%</b>출석률</span><span><b>94</b>시험 점수</span></div><footer><span><small>발급일</small>2026.06.14<em>인증번호 OCC-260614-001</em></span><strong>이지훈 강사<small>원클릭 클래스</small><i>직인</i></strong></footer>
          </div>
          <div className="oc-create-actions"><button><Share2 size={17} /> 공유</button><button className="oc-create-submit" onClick={() => window.print()}><Download size={17} /> PDF 저장</button></div>
        </div>
      </div>
      <div className="certificate-view"><header><button onClick={() => nav(-1)} aria-label="뒤로"><ArrowLeft /></button><b>수료증</b><i /></header><div className="certificate-scroll"><div className="certificate"><small>CERTIFICATE</small><h2>수료증</h2><i>지</i><h3>이지훈</h3><p>위 사람은 아래 과정을 성실히 이수하였기에<br />이 수료증을 수여합니다.</p><h4>데이터 시각화 마스터</h4><div><span><b>42</b>수강 일수</span><span><b>100%</b>출석률</span><span><b>94</b>시험 점수</span></div><footer><span><small>발급일</small>2026.06.14<em>인증번호 OCC-260614-001</em></span><strong>이지훈 강사<small>원클릭 클래스</small><i>직인</i></strong></footer></div></div><div className="certificate-actions"><button aria-label="공유"><Share2 /></button><button className="primary" onClick={() => window.print()}><Download />PDF 저장</button></div></div>
    </>
  );
}
