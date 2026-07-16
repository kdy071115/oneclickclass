import { ArrowLeft, Check, Mail, Phone } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { applicantService } from '../api/services';
import { AsyncState } from '../components/common/AsyncState';
import { PageHeader } from '../components/common/PageHeader';
import { Avatar, Badge, Button, Textarea } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { won } from '../utils/format';
import { getStatusTone } from '../utils/status';

export function ApplicantDetailPage() {
  const { id = '' } = useParams();
  const load = useCallback(() => applicantService.get(id), [id]);
  const { data, loading, error, retry } = useAsync(load);
  const [payment, setPayment] = useState<'결제대기' | '결제완료' | '환불'>();
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');

  if (loading || error || !data) {
    return <><div className="oc-web-page"><AsyncState loading={loading} error={error} onRetry={retry} /></div><div className="page subpage"><AsyncState loading={loading} error={error} onRetry={retry} /></div></>;
  }

  const currentPayment = payment ?? data.payment;
  const confirmPayment = async () => {
    const updated = await applicantService.updatePayment(data.id, { payment: '결제완료' });
    setPayment(updated.payment);
    setNotice('결제 상태를 확인했어요.');
  };
  const sendMessage = async () => {
    if (!message.trim()) return;
    await applicantService.sendMessage(data.id, message.trim());
    setMessage('');
    setNotice('메시지를 발송했어요.');
  };

  return (
    <>
      <div className="oc-web-page applicant-detail-web">
        <Link className="oc-back-link" to="/applicants"><ArrowLeft size={16} /> 신청자 목록</Link>
        <header className="applicant-detail-head">
          <Avatar name={data.name} size={58} />
          <div><h1>{data.name}</h1><p>{data.classTitle} · {data.appliedAt} 신청</p></div>
          <Badge tone={getStatusTone(currentPayment)}>{currentPayment}</Badge>
        </header>
        <div className="applicant-detail-grid">
          <main>
            <section className="oc-panel applicant-info-panel">
              <h2>신청 정보</h2>
              <dl><div><dt><Phone size={17} /> 전화번호</dt><dd>{data.phone}</dd></div><div><dt><Mail size={17} /> 이메일</dt><dd>{data.email}</dd></div><div><dt>신청 금액</dt><dd>{won(data.amount)}</dd></div></dl>
            </section>
            <section className="oc-panel applicant-answer-panel">
              <h2>신청서 답변</h2>
              {data.answers.map((answer) => <div key={answer.label}><b>{answer.label}</b><p>{answer.value}</p></div>)}
            </section>
          </main>
          <aside>
            <section className="oc-panel applicant-payment-panel">
              <div><span>결제 상태</span><Badge tone={getStatusTone(currentPayment)}>{currentPayment}</Badge></div>
              <strong>{won(data.amount)}</strong>
              <Button onClick={() => void confirmPayment()} disabled={currentPayment === '결제완료'}>{currentPayment === '결제완료' ? <><Check size={17} /> 확인 완료</> : '결제 확인'}</Button>
            </section>
            <section className="oc-panel applicant-message-panel">
              <h2>메시지 보내기</h2>
              <Textarea label="내용" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="신청자에게 전달할 내용을 입력하세요" />
              <Button onClick={() => void sendMessage()} disabled={!message.trim()}>발송</Button>
            </section>
          </aside>
        </div>
        {notice && <div className="done-toast" aria-live="polite">{notice}</div>}
      </div>

      <div className="page subpage">
        <PageHeader title="" backTo="/applicants" />
        <div className="applicant-profile"><Avatar name={data.name} size={50} /><div><h2>{data.name}</h2><small>{data.classTitle}</small></div></div>
        <section className="info-card"><h4>신청 정보</h4><p><span>전화번호</span><b>{data.phone}</b></p><p><span>이메일</span><b>{data.email}</b></p>{data.answers.map((answer) => <p key={answer.label}><span>{answer.label}</span><b>{answer.value}</b></p>)}</section>
        <section className={`payment-detail ${currentPayment === '결제완료' ? 'paid' : ''}`}><div><small>결제</small><b>{won(data.amount)} · {currentPayment}</b></div><button onClick={() => void confirmPayment()} disabled={currentPayment === '결제완료'}>{currentPayment === '결제완료' ? '확인 완료' : '결제 확인'}</button></section>
        <div className="mini-stats"><div>출석<b>3/4</b></div><div>설문<b>완료</b></div><div>시험<b className="gray">미응시</b></div></div>
      </div>
    </>
  );
}
