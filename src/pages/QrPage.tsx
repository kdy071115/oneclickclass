import { ArrowLeft, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { attendanceService } from '../api/services';

export function QrPage() {
  const nav = useNavigate();
  const { id = 'notion' } = useParams();
  const [qrUrl, setQrUrl] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const label = id === 'calligraphy' ? '주말 원데이 캘리그라피 · 1회차' : '노션 업무 자동화 · 2회차';
  const total = id === 'calligraphy' ? 15 : 24;
  const checked = id === 'calligraphy' ? 9 : 18;

  const loadQr = useCallback(async (refresh = false) => {
    setLoading(true);
    setError('');
    try {
      const session = refresh ? await attendanceService.refreshQr(id) : await attendanceService.issueQr(id);
      setQrUrl(await QRCode.toDataURL(session.token, { width: 420, margin: 1, errorCorrectionLevel: 'M' }));
      setSeconds(Math.max(0, Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / 1000)));
    } catch {
      setError('QR 코드를 발급하지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadQr(); }, [loadQr]);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="qr-screen">
      <button className="qr-back" onClick={() => nav(`/classes/${id}/attendance`)} aria-label="뒤로"><ArrowLeft /></button>
      <div className="qr-heading"><h1>출석 QR 코드</h1><p>수강생이 이 QR을 스캔하면<br />자동으로 출석 처리돼요</p></div>
      <div className="qr-timer"><span>{seconds ? '남은 시간' : '상태'}</span><b>{seconds ? time : '만료됨'}</b></div>
      <section className="qr-card">
        <div className="qr-code" aria-label="출석 QR 코드">{qrUrl ? <img src={qrUrl} alt="출석 체크인 QR 코드" /> : <span>{loading ? 'QR 생성 중...' : error}</span>}</div>
        <b>{label}</b>
      </section>
      <div className="qr-live"><span>실시간 출석</span><b>{checked}<small> / {total}명</small></b></div>
      <button className="qr-refresh" disabled={loading} onClick={() => void loadQr(true)}><RefreshCw />{loading ? 'QR 생성 중' : 'QR 새로고침'}</button>
    </div>
  );
}
