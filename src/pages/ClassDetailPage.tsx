import { Award, BarChart3, CheckSquare, ClipboardList, Eye, Settings, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';

const menus = [
  ['applicants', Users, '신청자', '24명 관리'],
  ['attendance', CheckSquare, '출석', '3회차 · 평균 92%'],
  ['survey', BarChart3, '설문', '응답 18 · 만족 4.8'],
  ['exams', ClipboardList, '시험', '응시 15 · 합격 12'],
] as const;

export function ClassDetailPage() {
  const { id = 'notion' } = useParams();
  return <div className="page subpage class-dashboard original-detail">
    <PageHeader title="" backTo="/classes" />
    <div className="class-cover" />
    <h1>노션으로 시작하는<br />업무 자동화</h1>
    <p className="muted">신청 24 / 30명 · 모집 마감 D-7</p>
    <div className="dashboard-grid">{menus.map(([path, Icon, title, desc]) => <Link to={`/classes/${id}/${path}`} key={path}><Icon /><b>{title}</b><small>{desc}</small></Link>)}</div>
    <Link className="wide-menu certificate-menu" to={`/classes/${id}/certificates`}><i><Award /></i><span><b>수료증</b><small>발급 대기 12명 · 발급 완료 0명</small></span></Link>
    <Link className="wide-menu manage-menu" to={`/classes/${id}/manage`}><i><Settings /></i><span><b>강의 관리</b><small>정보 수정 · 공개 상태 · 모집 마감</small></span></Link>
    <Link className="preview-link" to={`/classes/${id}/preview`}><Eye />수강생 화면 미리보기</Link>
  </div>;
}
