import {
  ArrowLeft,
  Camera,
  CreditCard,
  Download,
  Megaphone,
  MessageCircle,
  Star,
  Trash2,
  UserPlus,
  Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { settlementService, userService } from '../api/services';
import { clearSession } from '../auth/session';
import { AsyncState } from '../components/common/AsyncState';
import { Button, Input, Modal } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { won } from '../utils/format';
import { readImageFile } from '../utils/classThumbnail';
import { saveProfileImage, useProfileImage } from '../hooks/useProfileImage';

function Top({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="account-top">
      <button onClick={() => nav(-1)} aria-label="뒤로">
        <ArrowLeft />
      </button>
      {right}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}

function useToast() {
  const [toast, setToast] = useState('');
  return [
    toast,
    (message: string) => {
      setToast(message);
      window.setTimeout(() => setToast(''), 2000);
    },
  ] as const;
}

function WebHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="oc-web-head inline">
      <h1>{title}</h1>
      <p>{sub}</p>
    </div>
  );
}

const iconMap = { apply: UserPlus, pay: CreditCard, review: Star, settle: Wallet, notice: Megaphone };

export function NotificationsPage() {
  const [read, setRead] = useState(false);
  const load = useCallback(() => userService.notifications(), []);
  const { data, loading, error, retry } = useAsync(load);
  if (loading || error || !data) return <AsyncBoth loading={loading} error={error} retry={retry} />;
  const groups = [...new Set(data.map((n) => n.group))];

  return (
    <>
      <div className="oc-web-page">
        <WebHead title="알림" sub="중요한 신청·결제·정산 소식을 확인하세요" />
        <div className="oc-panel">
          <div className="oc-panel-title">
            <h2>최근 알림</h2>
            <button onClick={() => setRead(true)}>모두 읽음</button>
          </div>
          {groups.map((group) => <section className="oc-notification-group" key={group}>
            <h3>{group}</h3>
            {data.filter((n) => n.group === group).map((n) => {
              const Icon = iconMap[n.type];
              return (
              <Link className="oc-attend-row" to={n.target} key={n.id}>
                <span className="oc-avatar" style={{ background: '#eff6ff', color: '#3182f6' }}>
                  <Icon size={18} />
                </span>
                <b>
                  {n.title}
                  <small>{n.message}</small>
                </b>
                <small>{n.time}</small>
                {n.unread && !read && <em>새 알림</em>}
              </Link>
            );
            })}
          </section>)}
        </div>
      </div>
      <div className="page account-page no-bottom">
        <Top title="알림" right={<button className="read-all" onClick={() => { setRead(true); void userService.markNotificationsRead(); }}>모두 읽음</button>} />
        {groups.map((group) => (
          <section className="notice-group" key={group}>
            <h3>{group}</h3>
            {data.filter((n) => n.group === group).map((n) => {
              const Icon = iconMap[n.type];
              const unread = n.unread && !read;
              return (
                <Link className={`notice-row ${unread ? 'unread' : ''}`} to={n.target} key={n.id}>
                  <i className={`notification-type-${n.type}`}><Icon /></i>
                  <span><b>{n.title}{unread && <em />}</b><small>{n.message}</small></span>
                  <time>{n.time}</time>
                </Link>
              );
            })}
          </section>
        ))}
      </div>
    </>
  );
}

export function SettlementPage() {
  const load = useCallback(() => userService.settlement(), []);
  const { data, loading, error, retry } = useAsync(load);
  const [toast, notify] = useToast();
  const [accountOpen, setAccountOpen] = useState(false);
  const [account, setAccount] = useState('');
  const [savedAccount, setSavedAccount] = useState('');
  if (loading || error || !data) return <AsyncBoth loading={loading} error={error} retry={retry} />;

  const exportCsv = async () => {
    const blob = await settlementService.exportCsv();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `oneclick-settlements-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify('정산 내역을 CSV로 저장했어요');
  };
  const saveAccount = async () => {
    if (!account.trim()) return;
    const result = await settlementService.updateAccount(account.trim());
    setSavedAccount(result.account);
    setAccountOpen(false);
    notify('정산 계좌를 변경했어요');
  };

  return (
    <>
      <div className="oc-web-page">
        <WebHead title="정산 관리" sub="매출과 정산 예정 금액을 확인하세요" />
        <div className="oc-page-actions"><Button variant="secondary" onClick={() => void exportCsv()}><Download size={17} /> CSV 내보내기</Button><Button onClick={() => setAccountOpen(true)}>계좌 설정</Button></div>
        <div className="oc-insights">
          <SummaryCard label="정산 예정" value={won(data.expectedAmount)} sub="7월 15일 지급 예정" />
          <SummaryCard label="이번 달 정산 완료" value="1,842,000원" sub="3건 지급 완료" />
          <SummaryCard label="누적 정산액" value="11,480,000원" sub="2024년부터" />
        </div>
        <div className="oc-table">
          <div className="oc-table-head">
            <span>클래스</span><span>정산일</span><span>매출</span><span>수수료</span><span>정산액</span>
          </div>
          {data.rows.map((r, i) => (
            <div className="oc-table-row" key={r.id}>
              <strong>{r.title}</strong>
              <span>{r.date}</span>
              <span>{i ? '480,000원' : '1,080,000원'}</span>
              <span style={{ color: '#e8590c' }}>{i ? '-48,000원' : '-108,000원'}</span>
              <strong>{r.amount}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="page account-page no-bottom">
        <Top title="정산 관리" subtitle="클래스 수익을 확인하고 출금하세요" />
        <section className="settle-hero">
          <small>출금 가능 금액</small><b>{won(data.availableAmount)}</b><p>이번 달 정산 예정 {won(data.expectedAmount)}</p>
          <button onClick={() => notify('출금 신청이 접수됐어요')}>출금하기</button><i />
        </section>
        <div className="stats settle-stats">{data.stats.map((s) => <div key={s.label}><b style={{ color: s.color }}>{s.value}</b><small>{s.label}</small></div>)}</div>
        <button className="account-card account-bank" onClick={() => setAccountOpen(true)}><i><CreditCard /></i><span><small>정산 계좌</small><b>{savedAccount || data.account}</b></span><em>변경</em></button>
        <h3>정산 내역</h3>
        <div className="menu-box">{data.rows.map((r) => <div className="settle-row" key={r.id}><span><b>{r.title}</b><small>{r.date}</small></span><em className={r.status}>{r.amount}<small>{r.status === 'wait' ? '정산 예정' : '정산 완료'}</small></em></div>)}</div>
        {toast && <div className="done-toast">{toast}</div>}
      </div>
      <Modal open={accountOpen} title="정산 계좌 설정" onClose={() => setAccountOpen(false)} footer={<><Button variant="secondary" onClick={() => setAccountOpen(false)}>취소</Button><Button onClick={() => void saveAccount()} disabled={!account.trim()}>저장</Button></>}><Input label="은행·계좌번호" value={account} onChange={(event) => setAccount(event.target.value)} placeholder={savedAccount || data.account} /></Modal>
    </>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="oc-card">
      <h3>{label}</h3>
      <p>{sub}</p>
      <b style={{ display: 'block', marginTop: 14, fontSize: 24 }}>{value}</b>
    </div>
  );
}

export function NotificationSettingsPage() {
  const load = useCallback(() => userService.notificationSettings(), []);
  const { data, loading, error, retry } = useAsync(load);
  const [local, setLocal] = useState<Record<string, boolean>>({});
  if (loading || error || !data) return <AsyncBoth loading={loading} error={error} retry={retry} />;
  const enabled = (key: string, base: boolean) => local[key] ?? base;
  const toggle = (key: string, base: boolean) => {
    const next = !enabled(key, base);
    setLocal({ ...local, [key]: next });
    void userService.updateNotificationSetting(key, next);
  };
  const rows = data.map((s) => ({
    key: s.key,
    label: s.label,
    sub: s.description,
    on: enabled(s.key, s.enabled),
    toggle: () => toggle(s.key, s.enabled),
  }));
  return (
    <>
      <SettingsLike title="알림 설정" sub="받고 싶은 알림을 선택하세요" rows={rows} />
      <div className="page account-page no-bottom">
        <Top title="알림 설정" />
        <section className="setting-section">
          <h3>알림</h3>
          <div className="menu-box">
            {rows.map((r) => (
              <div className="toggle-row" key={r.key}>
                <span><b>{r.label}</b><small>{r.sub}</small></span>
                <button className={r.on ? 'on' : ''} onClick={r.toggle}><i /></button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

export function SupportPage() {
  const load = useCallback(() => userService.faqs(), []);
  const { data, loading, error, retry } = useAsync(load);
  const [open, setOpen] = useState(0);
  const [toast, notify] = useToast();
  if (loading || error || !data) return <AsyncBoth loading={loading} error={error} retry={retry} />;
  return (
    <>
      <div className="oc-web-page">
        <WebHead title="고객센터" sub="궁금한 점을 빠르게 해결해드려요" />
        <div className="oc-insights">
          <button className="oc-card" onClick={() => notify('1:1 문의가 접수됐어요')}><MessageCircle /><h3>1:1 문의</h3><p>보통 1시간 내 답변</p></button>
          <button className="oc-card" onClick={() => notify('카카오톡 상담으로 연결할게요')}><h3>카카오톡 문의</h3><p>평일 10:00~18:00</p></button>
        </div>
        <div className="oc-panel">
          <div className="oc-panel-title"><h2>자주 묻는 질문</h2></div>
          {data.map((f, i) => <button className="oc-faq-row" onClick={() => setOpen(open === i ? -1 : i)} key={f.id}><b>Q. {f.question}</b>{open === i && <p>{f.answer}</p>}</button>)}
        </div>
        {toast && <div className="done-toast">{toast}</div>}
      </div>
      <div className="page account-page no-bottom">
        <Top title="고객센터" subtitle="궁금한 점을 빠르게 해결해드려요" />
        <div className="support-actions"><button onClick={() => notify('1:1 문의가 접수됐어요')}><MessageCircle /><b>1:1 문의</b><small>보통 1시간 내 답변</small></button><button onClick={() => notify('카카오톡 상담으로 연결할게요')}><i>k</i><b>카카오톡 문의</b><small>평일 10:00~18:00</small></button></div>
        <h3>자주 묻는 질문</h3>
        <div className="menu-box faq-box">{data.map((f, i) => <div key={f.id}><button onClick={() => setOpen(open === i ? -1 : i)}><b>Q</b><span>{f.question}</span></button>{open === i && <p>{f.answer}</p>}</div>)}</div>
        {toast && <div className="done-toast">{toast}</div>}
      </div>
    </>
  );
}

export function SettingsPage() {
  const [dark, setDark] = useState(false);
  const [toast, notify] = useToast();
  const rows = [
    { label: '신청 알림', sub: '새 신청이 들어오면 알려드려요', on: true, toggle: () => notify('신청 알림을 변경했어요') },
    { label: '결제 알림', sub: '결제·환불 발생 시 알려드려요', on: true, toggle: () => notify('결제 알림을 변경했어요') },
    { label: '정산 알림', sub: '정산 예정·완료를 알려드려요', on: true, toggle: () => notify('정산 알림을 변경했어요') },
    { label: '다크 모드', sub: '어두운 화면으로 보기', on: dark, toggle: () => setDark(!dark) },
  ];
  return (
    <>
      <SettingsLike title="설정" sub="계정과 알림을 관리하세요" rows={rows} />
      <div className="page account-page no-bottom">
        <Top title="설정" />
        <MenuSection title="계정" notify={notify} rows={[['프로필 수정', ''], ['비밀번호 변경', ''], ['결제 관리', '/payment']]} />
        <section className="setting-section"><h3>화면</h3><div className="menu-box"><div className="toggle-row"><span><b>다크 모드</b><small>어두운 화면으로 보기</small></span><button className={dark ? 'on' : ''} onClick={() => setDark(!dark)}><i /></button></div></div></section>
        <Link className="logout" to="/login" onClick={clearSession}>로그아웃</Link>
        {toast && <div className="done-toast">{toast}</div>}
      </div>
    </>
  );
}

function SettingsLike({ title, sub, rows }: { title: string; sub: string; rows: { label: string; sub: string; on: boolean; toggle: () => void }[] }) {
  const profileImage = useProfileImage();
  const [profileError, setProfileError] = useState('');
  const changeProfile = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setProfileError('프로필 이미지는 JPG, PNG, WEBP 형식의 5MB 이하 파일만 가능해요.');
      return;
    }
    setProfileError('');
    saveProfileImage(await readImageFile(file));
  };
  return (
    <div className="oc-web-page" style={{ maxWidth: 760 }}>
      <WebHead title={title} sub={sub} />
      <div className="oc-panel">
        <div className="oc-attend-row profile-setting-row">
          <span className="oc-avatar profile-setting-avatar" style={{ width: 72, height: 72 }}>{profileImage ? <img src={profileImage} alt="현재 프로필" /> : '지'}</span>
          <b>김지훈<small>jihoon@example.com · 스탠다드 플랜</small></b>
          <div className="profile-setting-actions"><label className="oc-soft-button"><Camera size={16}/>{profileImage ? '사진 변경' : '사진 추가'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void changeProfile(event.target.files?.[0])}/></label>{profileImage&&<button aria-label="프로필 사진 삭제" onClick={()=>saveProfileImage('')}><Trash2 size={17}/></button>}</div>
        </div>
        {profileError&&<p className="profile-setting-error" role="alert">{profileError}</p>}
      </div>
      <div className="oc-panel" style={{ marginTop: 20 }}>
        <div className="oc-panel-title"><h2>알림 설정</h2></div>
        {rows.map((r) => <div className="oc-attend-row" key={r.label}><b>{r.label}<small>{r.sub}</small></b><button className={`switch ${r.on ? 'on' : ''}`} onClick={r.toggle}><i /></button></div>)}
      </div>
      <div className="oc-panel" style={{ marginTop: 20 }}>
        <div className="oc-menu-list"><Link to="/payment">결제 관리 <span>›</span></Link><Link to="/support">고객센터 <span>›</span></Link><Link to="/login" className="danger" onClick={clearSession}>로그아웃</Link></div>
      </div>
    </div>
  );
}

function MenuSection({ title, rows, notify }: { title: string; rows: [string, string][]; notify?: (message: string) => void }) {
  return <section className="setting-section"><h3>{title}</h3><div className="menu-box">{rows.map(([label, to]) => to ? <Link className="menu-row" to={to} key={label}><span>{label}</span></Link> : <button className="menu-row" key={label} onClick={() => notify?.(`${label} 화면을 준비했어요`)}><span>{label}</span></button>)}</div></section>;
}

export function PaymentPage() {
  const load = useCallback(() => userService.payment(), []);
  const { data, loading, error, retry } = useAsync(load);
  const [defaultId, setDefaultId] = useState('');
  const [toast, notify] = useToast();
  if (loading || error || !data) return <AsyncBoth loading={loading} error={error} retry={retry} />;
  const selected = defaultId || data.methods.find((m) => m.isDefault)?.id;
  return (
    <>
      <div className="oc-web-page" style={{ maxWidth: 860 }}>
        <WebHead title="결제 관리" sub="요금제와 결제 수단을 관리하세요" />
        <div className="oc-panel"><div className="oc-panel-title"><h2>{data.plan}</h2><button onClick={() => notify('플랜 변경 화면을 준비했어요')}>플랜 변경</button></div><p className="oc-copy">{data.price} · 다음 결제일 {data.nextBillingDate}</p></div>
        <div className="oc-panel" style={{ marginTop: 20 }}><div className="oc-panel-title"><h2>결제 수단</h2></div>{data.methods.map((m) => <button className="oc-attend-row" style={{ width: '100%' }} onClick={() => { setDefaultId(m.id); notify('기본 결제 수단을 변경했어요'); }} key={m.id}><span className="oc-avatar" style={{ background: m.brandBg, color: m.brandColor }}>{m.brandInitial}</span><b>{m.brand}<small>{m.last4}</small></b>{selected === m.id && <em>기본</em>}</button>)}</div>
        <div className="oc-table" style={{ marginTop: 20 }}><div className="oc-table-head"><span>내용</span><span>일자</span><span>수단</span><span>금액</span><span /></div>{data.history.map((h) => <div className="oc-table-row" key={h.id}><strong>{h.description}</strong><span>{h.date}</span><span>{h.method}</span><span>{h.amount}</span><span /></div>)}</div>
        {toast && <div className="done-toast">{toast}</div>}
      </div>
      <div className="page account-page no-bottom">
        <Top title="결제 관리" subtitle="요금제와 결제 수단을 관리하세요" />
        <section className="plan-card"><span>이용 중인 요금제</span><button onClick={() => notify('플랜 변경 화면을 준비했어요')}>플랜 변경</button><b>{data.plan}</b><p>{data.price} · 다음 결제일 {data.nextBillingDate}</p></section>
        <h3>결제 수단</h3>
        <div className="payment-methods">{data.methods.map((m) => <button className={selected === m.id ? 'active' : ''} onClick={() => setDefaultId(m.id)} key={m.id}><i style={{ background: m.brandBg, color: m.brandColor }}>{m.brandInitial}</i><span><b>{m.brand}</b>{selected === m.id && <em>기본</em>}<small>{m.last4}</small></span><strong /></button>)}</div>
      </div>
    </>
  );
}

function AsyncBoth({ loading, error, retry }: { loading: boolean; error?: string; retry?: () => void }) {
  return (
    <>
      <div className="oc-web-page"><AsyncState loading={loading} error={error} onRetry={retry} /></div>
      <div className="page"><AsyncState loading={loading} error={error} onRetry={retry} /></div>
    </>
  );
}
