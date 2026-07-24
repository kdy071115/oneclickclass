import {
  Award,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Edit3,
  Eye,
  Image,
  Link2,
  Minus,
  Plus,
  QrCode,
  Settings,
  Star,
  Users,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApplicantRow } from '../components/feature/ApplicantRow';
import { PageHeader } from '../components/common/PageHeader';
import { applicants, classes } from '../constants/mockData';
import { Button, ConfirmDialog, FileDropzone, Input, Modal, Select, Textarea } from '../components/ui';
import {
  attendanceService,
  applicantService,
  certificateService,
  classService,
  detailService,
  examService,
  surveyService,
} from '../api/services';
import type { AttendanceRow, SurveyOverviewItem } from '../types/api';
import type { ClassDetail } from '../types/class';
import { getClassThumbnail, readImageFile, saveClassThumbnail } from '../utils/classThumbnail';

type Config = {
  title: string;
  subtitle: string;
  kind: 'people' | 'attendance' | 'survey' | 'exams' | 'builder' | 'settings' | 'certificates';
};
type OperationTab = Config['kind'] | 'overview';
const configs: Record<string, Config> = {
  applicants: { title: '신청자 관리', subtitle: '노션으로 시작하는 업무 자동화', kind: 'people' },
  attendance: { title: '출석 관리', subtitle: '노션으로 시작하는 업무 자동화', kind: 'attendance' },
  survey: { title: '설문', subtitle: '노션으로 시작하는 업무 자동화', kind: 'survey' },
  exams: { title: '시험', subtitle: '노션으로 시작하는 업무 자동화', kind: 'exams' },
  'survey-builder': {
    title: '설문 만들기',
    subtitle: '수강생에게 물어볼 질문을 만들어요',
    kind: 'builder',
  },
  'exam-builder': {
    title: '시험 만들기',
    subtitle: '정답을 표시하면 자동 채점돼요',
    kind: 'builder',
  },
  manage: { title: '강의 관리', subtitle: '노션으로 시작하는 업무 자동화', kind: 'settings' },
  certificates: {
    title: '수료증 관리',
    subtitle: '조건과 수료증 내용을 직접 설정할 수 있어요',
    kind: 'certificates',
  },
};

export function ClassOperationsPage() {
  const key = useLocation().pathname.split('/').pop() ?? '';
  const cfg = configs[key] ?? configs.applicants;
  const { id = 'notion' } = useParams();
  const [item, setItem] = useState(
    () => classes.find((current) => current.id === id) ?? classes[0],
  );
  const [detail, setDetail] = useState<ClassDetail>();
  const [toast, setToast] = useState('');
  useEffect(() => {
    let alive = true;
    Promise.all([classService.get(id), detailService.getClass(id)]).then(([value, detailValue]) => {
      if (alive) {
        setItem(value);
        setDetail(detailValue);
      }
    });
    return () => {
      alive = false;
    };
  }, [id]);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2000);
  };
  const certificateManager = useCertificateManager(id, notify);
  const active: OperationTab = cfg.kind === 'builder' || cfg.kind === 'exams' ? 'survey' : cfg.kind;
  return (
    <>
      <div className="oc-web-page">
        <WebClassChrome id={id} active={active} item={item} detail={detail} notify={notify} />
        {cfg.kind === 'people' && <WebPeople id={id} notify={notify} />}{' '}
        {cfg.kind === 'attendance' && (
          <WebAttendance
            id={id}
            enabled={item.type !== '온라인'}
            sessionCount={Math.max(1, detail?.sessions || 1)}
            schedule={item.date}
            notify={notify}
          />
        )}{' '}
        {(cfg.kind === 'survey' || cfg.kind === 'exams') && (
          <WebSurvey id={id} detail={detail} notify={notify} />
        )}{' '}
        {cfg.kind === 'builder' && (
          <WebBuilder classId={id} exam={key.startsWith('exam')} notify={notify} />
        )}{' '}
        {cfg.kind === 'settings' && <WebManage id={id} detail={detail} notify={notify} />}{' '}
        {cfg.kind === 'certificates' && (
          <WebCertificates manager={certificateManager} classTitle={item.title} />
        )}{' '}
      </div>
      <div className="page subpage operations original-operations">
        <PageHeader title={cfg.title} subtitle={item.title} backTo={`/classes/${id}`} />
        {cfg.kind === 'people' && <People id={id} />}
        {cfg.kind === 'attendance' && (
          <Attendance
            id={id}
            enabled={item.type !== '온라인'}
            sessionCount={Math.max(1, detail?.sessions || 1)}
            schedule={item.date}
          />
        )}{' '}
        {cfg.kind === 'survey' && <Survey id={id} detail={detail} />}{' '}
        {cfg.kind === 'exams' && <Exams id={id} />}{' '}
        {cfg.kind === 'builder' && (
          <Builder classId={id} exam={key.startsWith('exam')} notify={notify} />
        )}{' '}
        {cfg.kind === 'settings' && (
          <Manage id={id} detail={detail} notify={notify} />
        )}{' '}
        {cfg.kind === 'certificates' && (
          <Certificates manager={certificateManager} requiresAttendance={item.type !== '온라인'} />
        )}{' '}
      </div>
      {toast && (
        <div className="done-toast" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}

type CertificateManager = {
  recipients: typeof applicants;
  issued: string[];
  selected: string[];
  condition: number;
  message: string;
  editOpen: boolean;
  pending: typeof applicants;
  setEditOpen: (open: boolean) => void;
  setCondition: (value: number) => void;
  setMessage: (value: string) => void;
  toggleSelected: (id: string) => void;
  issue: (ids: string[]) => void;
  saveSettings: () => void;
};
function useCertificateManager(
  classId: string,
  notify: (message: string) => void,
): CertificateManager {
  const storageKey = `oneclick.certificates.${classId}`;
  const saved = () => {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) ?? '{}') as {
        issued?: string[];
        condition?: number;
        message?: string;
      };
    } catch {
      return {};
    }
  };
  const initial = saved();
  const [issued, setIssued] = useState<string[]>(initial.issued ?? []);
  const [selected, setSelected] = useState<string[]>([]);
  const [condition, setCondition] = useState(initial.condition ?? 80);
  const [message, setMessage] = useState(
    initial.message ?? '위 사람은 본 과정을 성실히 이수하였기에 이 수료증을 수여합니다.',
  );
  const [editOpen, setEditOpen] = useState(false);
  const [recipients, setRecipients] = useState<typeof applicants>([]);
  useEffect(() => {
    let alive = true;
    certificateService.recipients(classId).then((items) => {
      if (alive) setRecipients(items);
    });
    return () => {
      alive = false;
    };
  }, [classId]);
  const persist = (nextIssued = issued, nextCondition = condition, nextMessage = message) =>
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ issued: nextIssued, condition: nextCondition, message: nextMessage }),
    );
  const issue = (ids: string[]) => {
    const next = [...new Set([...issued, ...ids])];
    setIssued(next);
    setSelected([]);
    persist(next);
    notify(`${ids.length}명의 수료증을 발급했어요`);
  };
  const toggleSelected = (id: string) =>
    setSelected(
      selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id],
    );
  const saveSettings = () => {
    persist(issued, condition, message);
    setEditOpen(false);
    notify('수료증 설정을 저장했어요');
  };
  return {
    issued,
    selected,
    condition,
    message,
    editOpen,
    recipients,
    pending: recipients.filter((item) => !issued.includes(item.id)),
    setEditOpen,
    setCondition,
    setMessage,
    toggleSelected,
    issue,
    saveSettings,
  };
}

function WebClassChrome({
  id,
  active,
  item,
  detail,
  notify,
}: {
  id: string;
  active: OperationTab;
  item: (typeof classes)[number];
  detail?: ClassDetail;
  notify: (message: string) => void;
}) {
  const thumbnail = getClassThumbnail(id);
  const tabs: [string, string, OperationTab][] = [
    ['개요', `/classes/${id}`, 'overview'],
    ['신청자', `/classes/${id}/applicants`, 'people'],
    ...(item.type === '온라인'
      ? []
      : ([['출석/QR', `/classes/${id}/attendance`, 'attendance']] as [
          string,
          string,
          OperationTab,
        ][])),
    ['설문·시험', `/classes/${id}/survey`, 'survey'],
    ['수료증', `/classes/${id}/certificates`, 'certificates'],
    ['설정', `/classes/${id}/manage`, 'settings'],
  ];
  return (
    <>
      <div className="oc-crumb">
        <Link to="/classes">클래스</Link>
        <span>›</span>
        <b>{item.title}</b>
      </div>
      <section className="oc-detail-hero reference operation-hero">
        <div className="oc-detail-main">
          <div className="oc-detail-copy">
            <div className="oc-status-line">
              <span className="live">{item.status}</span>
              <span>{item.type}</span>
            </div>
            <h1>
              {item.title}
              <Link to={`/classes/new?edit=${id}`} aria-label="강의 수정">
                <Edit3 size={20} />
              </Link>
            </h1>
            <p>{item.title}의 신청·출석·학습 현황을 한곳에서 관리하세요</p>
            <div className="oc-hero-meta">
              <span>
                <Star size={18} fill="currentColor" />
                <b>{detail?.reviewCount ? detail.rating : '-'}</b> ({detail?.reviewCount || 0})
              </span>
              <span>
                <Users size={18} />
                <b>{detail?.enrolled ?? item.enrolled}명</b> 신청
              </span>
              <span>
                <CalendarDays size={18} />
                <b>{detail?.sessions || 0}회차</b> 구성
              </span>
            </div>
          </div>
          {thumbnail ? (
            <img className="oc-detail-thumbnail" src={thumbnail} alt="클래스 썸네일" />
          ) : (
            <div className="oc-operation-thumbnail">
              <Image size={28} />
              <span>대표 썸네일</span>
            </div>
          )}
        </div>
        <div className="oc-detail-actions">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(
                `${location.origin}/s/${detail?.shareToken || id}`,
              );
              notify('신청 링크를 복사했어요');
            }}
          >
            <Link2 size={17} /> 링크 복사
          </button>
          <Link to={`/classes/new?edit=${id}`}>강의 수정</Link>
          <Link className="primary-link" to={`/classes/${id}/applicants`}>
            신청자 관리 <span>→</span>
          </Link>
        </div>
      </section>
      <div className="oc-detail-tabs reference operation-tabs">
        {tabs.map(([label, to, kind]) => (
          <Link className={active === kind ? 'active' : ''} to={to} key={label}>
            {label}
          </Link>
        ))}
      </div>
    </>
  );
}

function WebPeople({ id, notify }: { id: string; notify: (message: string) => void }) {
  const [rows, setRows] = useState<typeof applicants>([]);
  useEffect(() => {
    let alive = true;
    applicantService.listByClass(id).then((items) => {
      if (alive) setRows(items);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  const paid = rows.filter((row) => row.payment === '결제완료').length;
  const waiting = rows.filter((row) => row.payment === '결제대기').length;
  const download = () => {
    const csv = [
      '이름,클래스,신청일,결제상태,금액',
      ...rows.map(
        (item) =>
          `${item.name},${item.classTitle},${item.appliedAt},${item.payment},${item.amount}`,
      ),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'applicants.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    notify('신청자 목록을 저장했어요');
  };
  return (
    <section className="operation-content">
      <OperationHead
        title="신청자 관리"
        description="신청 현황과 결제 상태를 확인하세요"
        action="신청자 내보내기"
        onAction={download}
      />
      <div className="operation-metrics">
        <OperationMetric icon={Users} label="전체 신청" value={`${rows.length}명`} tone="blue" />
        <OperationMetric icon={CheckCircle2} label="결제 완료" value={`${paid}명`} tone="green" />
        <OperationMetric icon={BarChart3} label="결제 대기" value={`${waiting}건`} tone="orange" />
      </div>
      <div className="oc-table operation-table">
        <div className="oc-table-head">
          <span>신청자</span>
          <span>클래스</span>
          <span>신청일</span>
          <span>결제</span>
          <span>금액</span>
        </div>
        {rows.map((a, i) => (
          <Link
            className="oc-table-row"
            to={`/applicants/${a.id}?classId=${encodeURIComponent(id)}`}
            key={a.id}
          >
            <span className="operation-person">
              <span
                className="oc-avatar"
                style={{
                  background: ['#ffe9d9', '#e7f0ff', '#edebff'][i % 3],
                  color: ['#e8590c', '#1b64da', '#6741d9'][i % 3],
                }}
              >
                {a.name[0]}
              </span>
              <strong>{a.name}</strong>
            </span>
            <span>{a.classTitle}</span>
            <span>{a.appliedAt}</span>
            <span className={`operation-status ${a.payment === '결제대기' ? 'wait' : 'done'}`}>
              {a.payment}
            </span>
            <strong>{a.amount.toLocaleString()}원</strong>
          </Link>
        ))}
        {!rows.length && (
          <div className="operation-table-empty">
            <Users size={24} />
            <b>아직 신청자가 없어요</b>
            <p>신청 링크를 공유하면 신청 내역이 여기에 표시됩니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function WebAttendance({
  id,
  enabled,
  sessionCount,
  schedule,
  notify,
}: {
  id: string;
  enabled: boolean;
  sessionCount: number;
  schedule: string;
  notify: (message: string) => void;
}) {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [session, setSession] = useState(1);
  const [qrUrl, setQrUrl] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const loadQr = useCallback(
    async (refresh = false) => {
      setLoading(true);
      try {
        const qr = refresh
          ? await attendanceService.refreshQr(id)
          : await attendanceService.issueQr(id);
        setQrUrl(await QRCode.toDataURL(qr.token, { width: 320, margin: 1 }));
        setSeconds(Math.max(0, Math.ceil((new Date(qr.expiresAt).getTime() - Date.now()) / 1000)));
        if (refresh) notify('QR 코드를 새로 발급했어요');
      } finally {
        setLoading(false);
      }
    },
    [id, notify],
  );
  useEffect(() => {
    if (enabled) void loadQr();
  }, [enabled, loadQr]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    attendanceService.checkins(id).then((items) => {
      if (alive) setRows(items);
    });
    return () => {
      alive = false;
    };
  }, [enabled, id]);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (enabled && qrUrl && seconds === 0 && !loading) void loadQr(true);
  }, [enabled, loadQr, loading, qrUrl, seconds]);
  const present = rows.filter((row) => row.status !== '결석').length;
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const changeStatus = (row: AttendanceRow) =>
    setRows(
      rows.map((item) =>
        item.id === row.id
          ? {
              ...item,
              status: item.status === '출석' ? '지각' : item.status === '지각' ? '결석' : '출석',
              checkedAt: item.status === '지각' ? undefined : (item.checkedAt ?? '10:10'),
            }
          : item,
      ),
    );
  const download = () => {
    const csv = [
      '이름,시간,상태',
      ...rows.map((row) => `${row.name},${row.checkedAt ?? '-'},${row.status}`),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `attendance-session-${session}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify('출석 내역을 저장했어요');
  };
  if (!enabled) {
    return (
      <section className="operation-content">
        <OperationHead
          title="출석·QR"
          description="실시간 출석은 라이브·오프라인 강의에서 사용할 수 있어요"
        />
        <div className="oc-panel operation-empty-state">
          <CalendarDays size={30} />
          <h2>이 강의는 별도 출석 체크가 필요하지 않아요</h2>
          <p>녹화형 온라인 강의는 영상 진도로 수강 상태를 확인합니다.</p>
          <Link className="oc-soft-button" to={`/classes/${id}`}>
            강의 개요로 돌아가기
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section className="operation-content">
      <OperationHead
        title="출석·QR"
        description="실시간 체크인과 회차별 출석을 관리하세요"
        action="출석 내역 다운로드"
        onAction={download}
      />
      <div className="operation-metrics">
        <OperationMetric
          icon={Users}
          label="오늘 출석"
          value={`${present}/${rows.length}명`}
          tone="blue"
        />
        <OperationMetric
          icon={CheckCircle2}
          label="평균 출석률"
          value={`${rows.length ? Math.round((present / rows.length) * 100) : 0}%`}
          tone="green"
        />
        <OperationMetric
          icon={CalendarDays}
          label="현재 회차"
          value={`${session}회차`}
          tone="purple"
        />
      </div>
      <div className="attendance-layout">
        <div className="oc-panel oc-qr-panel refined">
          <div className="oc-panel-title">
            <div>
              <h2>실시간 출석 QR</h2>
              <p>5분마다 자동으로 갱신돼요</p>
            </div>
            <span className="live-dot">{seconds ? '실시간' : '만료'}</span>
          </div>
          <div className="oc-real-qr">
            {qrUrl ? (
              <img src={qrUrl} alt="출석 QR 코드" />
            ) : (
              <span>{loading ? 'QR 생성 중...' : 'QR 발급 필요'}</span>
            )}
          </div>
          <p>
            남은 시간 <b>{time}</b>
          </p>
          <strong>
            {present} <small>/ {rows.length}명 체크인</small>
          </strong>
          <button disabled={loading} onClick={() => void loadQr(true)}>
            {loading ? 'QR 생성 중' : 'QR 새로고침'}
          </button>
        </div>
        <div className="oc-panel attendance-list">
          <div className="oc-panel-title">
            <div>
              <h2>출석 명단</h2>
              <p>
                {session}회차 · {schedule}
              </p>
            </div>
            <Select
              aria-label="회차 선택"
              value={session}
              onChange={(event) => setSession(Number(event.target.value))}
            >
              {Array.from({ length: sessionCount }, (_, index) => index + 1).map((value) => (
                <option value={value} key={value}>
                  {value}회차
                </option>
              ))}
            </Select>
          </div>
          {rows.map((row) => (
            <button
              className="oc-attend-row attendance-edit-row"
              onClick={() => changeStatus(row)}
              key={row.id}
            >
              <span className="oc-avatar">{row.name[0]}</span>
              <b>
                {row.name}
                <small>클릭해 상태 변경</small>
              </b>
              <small>{row.checkedAt ?? '-'}</small>
              <em className={row.status === '결석' ? 'bad' : row.status === '지각' ? 'late' : ''}>
                {row.status}
              </em>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function WebSurvey({
  id = 'notion',
  detail,
  notify,
}: {
  id?: string;
  detail?: ClassDetail;
  notify: (message: string) => void;
}) {
  const [items, setItems] = useState<SurveyOverviewItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<SurveyOverviewItem>();
  const [type, setType] = useState<'설문' | '시험'>('설문');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState(3);
  useEffect(() => {
    let alive = true;
    surveyService.list(id).then((values) => {
      if (alive) setItems(values);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  const create = async () => {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      passScore: type === '시험' ? 70 : undefined,
      questions: Array.from({ length: questions }, (_, index) => ({ id: index + 1 })),
    };
    const item =
      type === '시험'
        ? await examService.create(id, payload)
        : await surveyService.create(id, payload);
    setItems([item, ...items]);
    setCreateOpen(false);
    setTitle('');
    notify(`${type}을 생성했어요`);
  };
  const active = items.filter((item) => item.status === '진행중').length;
  const average = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.response, 0) / items.length)
    : 0;
  return (
    <section className="operation-content">
      <OperationHead
        title="설문·시험"
        description="응답 현황과 학습 성과를 한눈에 확인하세요"
        action="새 항목 만들기"
        onAction={() => setCreateOpen(true)}
      />
      <div className="operation-metrics">
        <OperationMetric icon={ClipboardList} label="진행 중" value={`${active}개`} tone="blue" />
        <OperationMetric icon={BarChart3} label="평균 응답률" value={`${average}%`} tone="green" />
        <OperationMetric
          icon={Star}
          label="평균 만족도"
          value={detail?.reviewCount ? String(detail.rating) : '-'}
          tone="orange"
        />
      </div>
      <div className="survey-grid">
        {items.map((item) => (
          <article className="oc-panel survey-card" key={item.id}>
            <div className="oc-panel-title">
              <span className="survey-icon">
                {item.type === '설문' ? <BarChart3 size={20} /> : <ClipboardList size={20} />}
              </span>
              <span className={`operation-status ${item.status === '마감' ? 'done' : 'wait'}`}>
                {item.status}
              </span>
            </div>
            <small className="survey-type">{item.type}</small>
            <h2>{item.title}</h2>
            <p>{item.meta}</p>
            <div className="survey-response">
              <span>
                응답률 <b>{item.response}%</b>
              </span>
              <div className="oc-progress">
                <i style={{ width: `${item.response}%` }} />
              </div>
            </div>
            <button className="oc-soft-button" onClick={() => setSelected(item)}>
              {item.response ? '결과 보기' : '설정 보기'}
            </button>
          </article>
        ))}
        {!items.length && (
          <div className="oc-panel operation-empty-state survey-empty-state">
            <ClipboardList size={30} />
            <h2>아직 만든 설문이나 시험이 없어요</h2>
            <p>첫 항목을 만들고 수강생의 응답과 학습 결과를 확인해 보세요.</p>
            <button className="oc-soft-button" onClick={() => setCreateOpen(true)}>
              첫 항목 만들기
            </button>
          </div>
        )}
      </div>
      <Modal
        open={createOpen}
        title="새 설문·시험"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              취소
            </Button>
            <Button disabled={!title.trim()} onClick={() => void create()}>
              생성
            </Button>
          </>
        }
      >
        <Select
          label="유형"
          value={type}
          onChange={(event) => setType(event.target.value as '설문' | '시험')}
        >
          <option>설문</option>
          <option>시험</option>
        </Select>
        <Input
          label="제목"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="제목을 입력하세요"
        />
        <label className="operation-stepper">
          <span>문항 수</span>
          <button onClick={() => setQuestions(Math.max(1, questions - 1))} aria-label="문항 줄이기">
            <Minus />
          </button>
          <b>{questions}문항</b>
          <button onClick={() => setQuestions(questions + 1)} aria-label="문항 늘리기">
            <Plus />
          </button>
        </label>
      </Modal>
      <Modal
        open={!!selected}
        title={selected?.title ?? '결과'}
        onClose={() => setSelected(undefined)}
        footer={<Button onClick={() => setSelected(undefined)}>확인</Button>}
      >
        <div className="survey-result-summary">
          <strong>{selected?.response}%</strong>
          <span>응답률</span>
          <div>
            <p>
              <b>매우 만족</b>
              <span>12명 · 67%</span>
            </p>
            <p>
              <b>만족</b>
              <span>4명 · 22%</span>
            </p>
            <p>
              <b>보통</b>
              <span>2명 · 11%</span>
            </p>
          </div>
        </div>
      </Modal>
    </section>
  );
}

type BuilderQuestion = {
  id: string;
  text: string;
  type: 'choice' | 'rating' | 'text';
  options: string[];
  answer: number;
};
const newQuestion = (exam: boolean): BuilderQuestion => ({
  id: crypto.randomUUID(),
  text: '',
  type: exam ? 'choice' : 'choice',
  options: exam ? ['', '', '', ''] : ['', ''],
  answer: 0,
});
function WebBuilder({
  classId,
  exam,
  notify,
}: {
  classId: string;
  exam: boolean;
  notify: (message: string) => void;
}) {
  const nav = useNavigate();
  const [title, setTitle] = useState(exam ? '' : '수강생 만족도 설문');
  const [pass, setPass] = useState(70);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<BuilderQuestion[]>([newQuestion(exam)]);
  const returnTo = `/classes/${classId}/${exam ? 'exam-builder' : 'survey-builder'}`;
  const previewPath = `${exam ? '/learn/exam/take' : '/learn/survey/take'}?returnTo=${encodeURIComponent(returnTo)}`;
  const update = (id: string, patch: Partial<BuilderQuestion>) =>
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const remove = (id: string) =>
    setQuestions(
      questions.length === 1 ? [newQuestion(exam)] : questions.filter((q) => q.id !== id),
    );
  const addOption = (q: BuilderQuestion) => update(q.id, { options: [...q.options, ''] });
  const removeOption = (q: BuilderQuestion, index: number) =>
    update(q.id, {
      options: q.options.filter((_, i) => i !== index),
      answer: q.answer === index ? 0 : q.answer,
    });
  const save = async () => {
    const valid = questions.filter((q) => q.text.trim());
    if (exam && !title.trim()) {
      notify('시험 이름을 입력해주세요');
      return;
    }
    if (!valid.length) {
      notify(`${exam ? '문제' : '질문'}을 1개 이상 입력해주세요`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        passScore: exam ? pass : undefined,
        questions: valid.map((q) => ({
          ...q,
          text: q.text.trim(),
          options: q.options.map((o) => o.trim()).filter(Boolean),
        })),
      };
      if (exam) await examService.create(classId, payload);
      else await surveyService.create(classId, payload);
      notify(`${exam ? '시험' : '설문'}을 저장했어요`);
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="operation-content web-builder">
      <OperationHead
        title={exam ? '시험 만들기' : '설문 만들기'}
        description={
          exam ? '문제와 정답을 구성하고 합격 기준을 설정하세요' : '질문 유형과 선택지를 구성하세요'
        }
        action="학생 화면 미리보기"
        onAction={() => nav(previewPath)}
      />
      <div className={exam ? 'oc-grid-2 builder-meta' : 'builder-meta'}>
        <Input
          label={exam ? '시험 이름' : '설문 이름'}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={exam ? '예) 1주차 · 노션 기본 개념' : '예) 중간 만족도 설문'}
        />
        {exam && (
          <label className="operation-stepper">
            <span>합격 기준 점수</span>
            <button
              type="button"
              onClick={() => setPass(Math.max(0, pass - 5))}
              aria-label="합격 기준 줄이기"
            >
              <Minus />
            </button>
            <b>{pass}점</b>
            <button
              type="button"
              onClick={() => setPass(Math.min(100, pass + 5))}
              aria-label="합격 기준 늘리기"
            >
              <Plus />
            </button>
          </label>
        )}
      </div>
      {questions.map((q, index) => (
        <article className="oc-panel web-builder-card" key={q.id}>
          <header>
            <small>
              {exam ? '문제' : 'Q'} {index + 1}
            </small>
            <button type="button" aria-label="문항 삭제" onClick={() => remove(q.id)}>
              <X size={18} />
            </button>
          </header>
          <Input
            label={exam ? '문제' : '질문'}
            value={q.text}
            onChange={(event) => update(q.id, { text: event.target.value })}
            placeholder={exam ? '문제를 입력하세요' : '질문을 입력하세요'}
          />
          {!exam && (
            <div className="question-types" role="group" aria-label="질문 유형">
              {(
                [
                  ['choice', '객관식'],
                  ['rating', '별점'],
                  ['text', '서술형'],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  className={q.type === value ? 'active' : ''}
                  onClick={() =>
                    update(q.id, { type: value, options: value === 'choice' ? q.options : [''] })
                  }
                  key={value}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {q.type === 'choice' && (
            <>
              <small className="option-label">{exam ? '보기 · 정답을 선택하세요' : '선택지'}</small>
              {q.options.map((option, optionIndex) => (
                <label className="builder-option" key={optionIndex}>
                  <input
                    type="radio"
                    name={`answer-${q.id}`}
                    checked={q.answer === optionIndex}
                    disabled={!exam}
                    onChange={() => update(q.id, { answer: optionIndex })}
                  />
                  <input
                    value={option}
                    onChange={(event) =>
                      update(q.id, {
                        options: q.options.map((value, i) =>
                          i === optionIndex ? event.target.value : value,
                        ),
                      })
                    }
                    placeholder={`보기 ${optionIndex + 1}`}
                  />
                  {!exam && q.options.length > 2 && (
                    <button
                      type="button"
                      aria-label="선택지 삭제"
                      onClick={() => removeOption(q, optionIndex)}
                    >
                      <X />
                    </button>
                  )}
                </label>
              ))}
              {!exam && (
                <button type="button" className="add-option" onClick={() => addOption(q)}>
                  <Plus />
                  선택지 추가
                </button>
              )}
            </>
          )}
          {q.type === 'rating' && (
            <div className="builder-static-preview">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star key={value} fill="currentColor" />
              ))}
            </div>
          )}
          {q.type === 'text' && (
            <Textarea
              label="답변 입력 영역"
              value=""
              readOnly
              placeholder="수강생이 자유롭게 의견을 남겨요"
            />
          )}
        </article>
      ))}
      <button
        type="button"
        className="outline-add"
        onClick={() => setQuestions([...questions, newQuestion(exam)])}
      >
        <Plus />
        {exam ? '문제' : '질문'} 추가
      </button>
      <Button className="web-builder-save" disabled={saving} onClick={() => void save()}>
        {saving ? '저장 중...' : `${exam ? '시험' : '설문'} 저장하기`}
      </Button>
      {exam && (
        <Button
          variant="danger"
          onClick={() => {
            setQuestions([newQuestion(true)]);
            setTitle('');
            notify('시험을 삭제했어요');
          }}
        >
          이 시험 삭제
        </Button>
      )}
    </section>
  );
}

function WebManage({
  id,
  detail,
  notify,
}: {
  id: string;
  detail?: ClassDetail;
  notify: (message: string) => void;
}) {
  const nav = useNavigate();
  const [publicOn, setPublicOn] = useState(true);
  const [closed, setClosed] = useState(false);
  const [capacity, setCapacity] = useState(detail?.capacity || 30);
  const [thumbnail, setThumbnail] = useState(() => getClassThumbnail(id));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    if (detail?.capacity) setCapacity(detail.capacity);
  }, [detail?.capacity]);
  useEffect(() => {
    if (!detail) return;
    setPublicOn(detail.publicOn ?? true);
    setClosed(detail.recruitmentClosed ?? false);
  }, [detail]);
  const changeThumbnail = async (file: File) => {
    const value = await readImageFile(file);
    setThumbnail(value);
    saveClassThumbnail(id, value);
    await classService.update(id, { thumbnail: value });
    notify('클래스 썸네일을 변경했어요');
  };
  const deleteClass = async () => {
    setDeleting(true);
    try {
      await classService.remove(id);
      nav('/classes');
    } finally {
      setDeleting(false);
    }
  };
  return (
    <>
      <section className="oc-panel oc-thumbnail-editor">
        <div>
          <h2>클래스 썸네일</h2>
          <p>목록과 클래스 상세 상단에 표시되는 대표 이미지예요.</p>
        </div>
        {thumbnail && <img src={thumbnail} alt="현재 클래스 썸네일" />}
        <FileDropzone onFile={(file) => void changeThumbnail(file)} />
      </section>
      <div className="oc-grid-2">
        <section className="oc-panel oc-settings-panel">
          <h2>강의 설정</h2>
          <div>
            <span>
              <b>공개 상태</b>
              <small>신청 페이지 노출</small>
            </span>
            <button
              type="button"
              aria-label={publicOn ? '신청 페이지 비공개로 전환' : '신청 페이지 공개로 전환'}
              aria-pressed={publicOn}
              className={`switch ${publicOn ? 'on' : ''}`}
              onClick={() => {
                const next = !publicOn;
                setPublicOn(next);
                void classService.updateSettings(id, { publicOn: next });
                notify(next ? '공개로 전환했어요' : '비공개로 전환했어요');
              }}
            >
              <i />
            </button>
          </div>
          <div>
            <span>
              <b>모집 상태</b>
              <small>{closed ? '신청을 받지 않아요' : '현재 신청을 받고 있어요'}</small>
            </span>
            <button
              className="oc-soft-button"
              onClick={() => {
                const next = !closed;
                setClosed(next);
                void classService.updateSettings(id, { recruitmentClosed: next });
                notify(next ? '모집을 마감했어요' : '모집을 다시 열었어요');
              }}
            >
              {closed ? '모집 재개' : '모집 마감'}
            </button>
          </div>
          <div>
            <span>
              <b>정원</b>
              <small>현재 {detail?.enrolled || 0}명 신청</small>
            </span>
            <em>
              <button
                type="button"
                aria-label="정원 줄이기"
                onClick={() => {
                  const next = Math.max(1, capacity - 5);
                  setCapacity(next);
                  void classService.updateSettings(id, { capacity: next });
                }}
              >
                −
              </button>
              {capacity}명
              <button
                type="button"
                aria-label="정원 늘리기"
                onClick={() => {
                  const next = capacity + 5;
                  setCapacity(next);
                  void classService.updateSettings(id, { capacity: next });
                }}
              >
                ＋
              </button>
            </em>
          </div>
        </section>
        <section className="oc-panel">
          <h2>관리 메뉴</h2>
          <div className="oc-menu-list">
            <Link to={`/classes/${id}/curriculum`}>
              커리큘럼 관리 <span>›</span>
            </Link>
            <Link to={`/classes/new?edit=${id}`}>
              강의 정보 수정 <span>›</span>
            </Link>
            <Link to={`/classes/new?edit=${id}&step=4`}>
              신청서 수정 <span>›</span>
            </Link>
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(
                  `${location.origin}/s/${detail?.shareToken || id}`,
                );
                notify('신청 링크를 복사했어요');
              }}
            >
              <Copy size={18} /> 신청 링크 복사 <span>›</span>
            </button>
            <button
              className="danger"
              onClick={() => setDeleteOpen(true)}
            >
              강의 삭제
            </button>
          </div>
        </section>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        title="강의를 삭제할까요?"
        description="삭제한 강의와 신청 페이지는 다시 복구할 수 없어요. 수강생에게 공유한 링크도 더 이상 사용할 수 없어요."
        confirmText="삭제하기"
        loading={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteClass()}
      />
    </>
  );
}

function WebCertificates({
  manager,
  classTitle,
}: {
  manager: CertificateManager;
  classTitle: string;
}) {
  const {
    issued,
    recipients,
    selected,
    condition,
    message,
    editOpen,
    pending,
    setEditOpen,
    setCondition,
    setMessage,
    toggleSelected,
    issue,
    saveSettings,
  } = manager;
  return (
    <section className="operation-content">
      <OperationHead
        title="수료증 관리"
        description="수료 조건을 확인하고 개별·일괄 발급하세요"
        action="발급 설정"
        onAction={() => setEditOpen(true)}
      />
      <div className="operation-metrics">
        <OperationMetric icon={Award} label="발급 완료" value={`${issued.length}명`} tone="green" />
        <OperationMetric
          icon={Users}
          label="발급 대기"
          value={`${pending.length}명`}
          tone="orange"
        />
        <OperationMetric
          icon={CheckCircle2}
          label="수료 기준"
          value={`진도 ${condition}%`}
          tone="purple"
        />
      </div>
      <div className="certificate-layout">
        <div className="oc-panel oc-cert-preview refined">
          <div className="oc-panel-title">
            <h2>수료증 미리보기</h2>
            <button onClick={() => setEditOpen(true)}>편집</button>
          </div>
          <div>
            <b>CERTIFICATE</b>
            <strong>수료증</strong>
            <p>
              홍길동 님은 「{classTitle}」 과정을 성실히 수료하였습니다.
              <br />
              {message}
            </p>
            <small>2026.03.15 · 원클릭 클래스</small>
          </div>
        </div>
        <div className="oc-panel certificate-targets">
          <div className="oc-panel-title">
            <div>
              <h2>발급 대상</h2>
              <p>
                {selected.length
                  ? `${selected.length}명 선택됨`
                  : '수료 조건을 충족한 수강생이에요'}
              </p>
            </div>
            <button
              className="oc-create"
              disabled={!pending.length}
              onClick={() => issue(pending.map((item) => item.id))}
            >
              일괄 발급
            </button>
          </div>
          {recipients.map((a, i) => {
            const done = issued.includes(a.id);
            const checked = selected.includes(a.id);
            return (
              <div className="oc-attend-row certificate-target-row" key={a.id}>
                <input
                  type="checkbox"
                  aria-label={`${a.name} 선택`}
                  checked={checked}
                  disabled={done}
                  onChange={() => toggleSelected(a.id)}
                />
                <span className="oc-avatar">{a.name[0]}</span>
                <b>
                  {a.name}
                  <small>
                    진도 {i ? 92 : 100}% · 출석 {i ? 90 : 100}%
                  </small>
                </b>
                {done ? (
                  <em className="issued">발급완료</em>
                ) : (
                  <button className="certificate-issue-one" onClick={() => issue([a.id])}>
                    개별 발급
                  </button>
                )}
              </div>
            );
          })}
          {!recipients.length && (
            <div className="certificate-empty-state">
              <Users size={26} />
              <b>수료증 발급 대상이 아직 없어요</b>
              <p>신청자가 수료 조건을 충족하면 이곳에서 발급할 수 있습니다.</p>
            </div>
          )}
          {selected.length > 0 && (
            <Button className="certificate-selected-issue" onClick={() => issue(selected)}>
              선택 {selected.length}명 발급
            </Button>
          )}
        </div>
      </div>
      <Modal
        open={editOpen}
        title="수료증 발급 설정"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              취소
            </Button>
            <Button onClick={saveSettings}>저장</Button>
          </>
        }
      >
        <label className="operation-stepper">
          <span>최소 진도</span>
          <button
            aria-label="최소 진도 줄이기"
            onClick={() => setCondition(Math.max(50, condition - 5))}
          >
            <Minus />
          </button>
          <b>{condition}%</b>
          <button
            aria-label="최소 진도 늘리기"
            onClick={() => setCondition(Math.min(100, condition + 5))}
          >
            <Plus />
          </button>
        </label>
        <Textarea
          label="증서 문구"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </Modal>
    </section>
  );
}

function OperationHead({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <header className="operation-head">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action && <button onClick={onAction}>{action}</button>}
    </header>
  );
}
function OperationMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`operation-metric ${tone}`}>
      <i>
        <Icon size={20} />
      </i>
      <span>
        <small>{label}</small>
        <b>{value}</b>
      </span>
    </div>
  );
}

function People({ id }: { id: string }) {
  const [filter, setFilter] = useState('전체');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<typeof applicants>([]);
  useEffect(() => {
    let alive = true;
    applicantService.listByClass(id).then((items) => {
      if (alive) setRows(items);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  const list = rows.filter(
    (a) =>
      (filter === '전체' || a.payment === filter) &&
      (a.name.includes(query) || a.phone.includes(query)),
  );
  const count = (payment: string) => rows.filter((item) => item.payment === payment).length;
  return (
    <>
      <div className="operation-stats">
        <div className="blue">
          <small>전체 신청</small>
          <b>
            {rows.length}<em>명</em>
          </b>
        </div>
        <div className="orange">
          <small>결제 대기</small>
          <b>
            {count('결제대기')}<em>건</em>
          </b>
        </div>
        <div className="green">
          <small>결제 완료</small>
          <b>
            {count('결제완료')}<em>명</em>
          </b>
        </div>
      </div>
      <input
        className="operation-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·전화번호로 검색"
      />
      <div className="chips">
        {[
          ['전체', String(rows.length)],
          ['결제대기', String(count('결제대기'))],
          ['결제완료', String(count('결제완료'))],
          ['환불', String(count('환불'))],
        ].map(([x, n]) => (
          <button className={filter === x ? 'active' : ''} onClick={() => setFilter(x)} key={x}>
            {x} <span>{n}</span>
          </button>
        ))}
      </div>
      {list.map((a, i) => (
        <Link
          className="applicant-row-link"
          to={`/applicants/${a.id}?classId=${encodeURIComponent(id)}`}
          key={a.id}
        >
          <ApplicantRow item={a} index={i} />
        </Link>
      ))}
      {!list.length && <div className="mobile-operation-empty">표시할 신청자가 없어요.</div>}
    </>
  );
}

function Attendance({
  id,
  enabled,
  sessionCount,
  schedule,
}: {
  id: string;
  enabled: boolean;
  sessionCount: number;
  schedule: string;
}) {
  const [session, setSession] = useState(1);
  const [absent, setAbsent] = useState<string[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    attendanceService.checkins(id).then((items) => {
      if (alive) setRows(items);
    });
    return () => {
      alive = false;
    };
  }, [enabled, id]);
  if (!enabled)
    return (
      <div className="mobile-operation-empty">
        <CalendarDays />
        <b>이 강의는 별도 출석 체크가 필요하지 않아요.</b>
        <Link to={`/classes/${id}`}>강의 개요로 돌아가기</Link>
      </div>
    );
  const present = rows.length - absent.length;
  return (
    <>
      <div className="operation-stats attendance-stats">
        <div className="blue">
          <small>전체 수강생</small>
          <b>
            {rows.length}<em>명</em>
          </b>
        </div>
        <div className="green">
          <small>출석</small>
          <b>
            {present}<em>명</em>
          </b>
        </div>
        <div className="orange">
          <small>결석</small>
          <b>
            {absent.length}<em>명</em>
          </b>
        </div>
      </div>
      <Link className="qr-callout" to={`/classes/${id}/attendance/qr`}>
        <QrCode />
        <span>
          <b>출석 QR 열기</b>
          <small>{schedule} · {session}회차</small>
        </span>
      </Link>
      <div className="chips session-chips">
        {Array.from({ length: sessionCount }, (_, index) => index + 1).map((n) => (
          <button className={session === n ? 'active' : ''} onClick={() => setSession(n)} key={n}>
            {n}회차
          </button>
        ))}
      </div>
      <h3 className="list-heading">
        {session}회차 출석 현황 <small>{schedule}</small>
      </h3>
      {rows.map((row) => (
        <button
          className="check-row"
          onClick={() =>
            setAbsent(
              absent.includes(row.id)
                ? absent.filter((value) => value !== row.id)
                : [...absent, row.id],
            )
          }
          key={row.id}
        >
          <span>{row.name[0]}</span>
          <b>{row.name}</b>
          <em className={absent.includes(row.id) ? 'absent' : ''}>
            {absent.includes(row.id) ? '결석' : '출석'}
          </em>
        </button>
      ))}
    </>
  );
}

function Survey({ id, detail }: { id: string; detail?: ClassDetail }) {
  const [items, setItems] = useState<SurveyOverviewItem[]>([]);
  useEffect(() => {
    let alive = true;
    surveyService.list(id).then((values) => {
      if (alive) setItems(values);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return (
    <>
      <Link className="soft-primary" to={`/classes/${id}/survey-builder`}>
        <Plus />
        설문 문항 만들기 · 수정
      </Link>
      <section className="survey-overview">
        <div>
          <small>등록 항목</small>
          <b>
            {items.length}<em>개</em>
          </b>
        </div>
        <div>
          <small>전체 만족도</small>
          <b>{detail?.reviewCount ? detail.rating : '-'}</b>
        </div>
      </section>
      {items.map((item) => (
        <article className="survey-result mobile-survey-item" key={item.id}>
          <b>{item.title}</b>
          <p>{item.meta}</p>
          <small>{item.status} · 응답률 {item.response}%</small>
        </article>
      ))}
      {!items.length && <div className="mobile-operation-empty">아직 만든 설문이 없어요.</div>}
    </>
  );
}

function Exams({ id }: { id: string }) {
  return (
    <>
      <Link className="soft-primary" to={`/classes/${id}/exam-builder`}>
        <Plus />새 시험 만들기
      </Link>
      <div className="operation-stats exam-stats">
        <div className="blue">
          <small>전체 응시</small>
          <b>
            19<em>명</em>
          </b>
        </div>
        <div className="green">
          <small>합격</small>
          <b>
            14<em>명</em>
          </b>
        </div>
        <div className="orange">
          <small>평균 점수</small>
          <b>
            82<em>점</em>
          </b>
        </div>
      </div>
      {['중간 점검 퀴즈', '최종 수료 시험'].map((x, i) => (
        <Link to={`/classes/${id}/exams/${i ? 'final' : 'mid'}`} className="exam-card" key={x}>
          <ClipboardList />
          <span>
            <b>{x}</b>
            <small>{i ? '응시 19명 · 평균 82점' : '응시 24명 · 평균 86점'}</small>
          </span>
          <em>{i ? '진행중' : '완료'}</em>
        </Link>
      ))}
    </>
  );
}

function Builder({
  classId,
  exam,
  notify,
}: {
  classId: string;
  exam: boolean;
  notify: (message: string) => void;
}) {
  const nav = useNavigate();
  const [questions, setQuestions] = useState(['']);
  const [pass, setPass] = useState(70);
  const returnTo = `/classes/${classId}/${exam ? 'exam-builder' : 'survey-builder'}`;
  const previewPath = `${exam ? '/learn/exam/take' : '/learn/survey/take'}?returnTo=${encodeURIComponent(returnTo)}`;
  const remove = (index: number) =>
    setQuestions(questions.length === 1 ? [''] : questions.filter((_, j) => j !== index));
  return (
    <>
      {exam && (
        <>
          <label className="builder-title">
            시험 이름
            <input placeholder="예) 1주차 · 노션 기본 개념" />
          </label>
          <div className="pass-score">
            <b>합격 기준 점수</b>
            <span>
              <button onClick={() => setPass(Math.max(0, pass - 5))}>
                <Minus />
              </button>
              <strong>{pass}점</strong>
              <button onClick={() => setPass(Math.min(100, pass + 5))}>
                <Plus />
              </button>
            </span>
          </div>
        </>
      )}
      {questions.map((q, i) => (
        <article className="builder-card original-builder" key={i}>
          <header>
            <small>
              {exam ? '문제' : 'Q'} {i + 1}
            </small>
            <button aria-label="문항 삭제" onClick={() => remove(i)}>
              <X />
            </button>
          </header>
          <input
            value={q}
            onChange={(e) => setQuestions(questions.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder={exam ? '문제를 입력하세요' : '질문을 입력하세요'}
          />
          {!exam && (
            <div className="question-types">
              <button className="active">객관식</button>
              <button>별점</button>
              <button>서술형</button>
            </div>
          )}
          <small className="option-label">{exam ? '보기 · 정답을 탭하세요' : '선택지'}</small>
          {['보기 1', '보기 2', ...(exam ? ['보기 3', '보기 4'] : [])].map((x, j) => (
            <label className="builder-option" key={x}>
              <input type="radio" name={`answer-${i}`} defaultChecked={exam && j === 0} />
              <input placeholder={x} />
              {!exam && (
                <button aria-label="선택지 삭제" onClick={() => notify('선택지를 삭제했어요')}>
                  <X />
                </button>
              )}
            </label>
          ))}
          {!exam && (
            <button className="add-option" onClick={() => notify('선택지를 추가했어요')}>
              <Plus />
              선택지 추가
            </button>
          )}
        </article>
      ))}
      <button className="outline-add" onClick={() => setQuestions([...questions, ''])}>
        <Plus />
        {exam ? '문제' : '질문'} 추가
      </button>
      <button className="primary" onClick={() => notify(`${exam ? '시험' : '설문'}을 저장했어요`)}>
        {exam ? '시험' : '설문'} 저장하기
      </button>
      <button className="builder-preview" onClick={() => nav(previewPath)}>
        <Eye />
        학생 화면으로 미리보기
      </button>
      {exam && (
        <button className="danger" onClick={() => notify('시험을 삭제했어요')}>
          이 시험 삭제
        </button>
      )}
    </>
  );
}

function Manage({
  id,
  detail,
  notify,
}: {
  id: string;
  detail?: ClassDetail;
  notify: (message: string) => void;
}) {
  const nav = useNavigate();
  const [publicOn, setPublicOn] = useState(true);
  const [closed, setClosed] = useState(false);
  const [capacity, setCapacity] = useState(30);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    if (!detail) return;
    setPublicOn(detail.publicOn ?? true);
    setClosed(detail.recruitmentClosed ?? false);
    setCapacity(detail.capacity);
  }, [detail]);
  const deleteClass = async () => {
    setDeleting(true);
    try {
      await classService.remove(id);
      nav('/classes');
    } finally {
      setDeleting(false);
    }
  };
  return (
    <>
      <Link className="thumbnail-manage-link" to={`/classes/new?edit=${id}`}>
        썸네일·강의 정보 수정 <span>›</span>
      </Link>
      <section className="settings-card">
        <div>
          <span>
            <b>공개 상태</b>
            <small>신청 페이지 노출</small>
          </span>
          <button
            className={`switch ${publicOn ? 'on' : ''}`}
            onClick={() => {
              setPublicOn(!publicOn);
              void classService.updateSettings(id, { publicOn: !publicOn });
              notify(publicOn ? '비공개로 전환했어요' : '공개로 전환했어요');
            }}
          >
            <i />
          </button>
        </div>
        <div>
          <span>
            <b>모집 상태</b>
            <small>{closed ? '신청을 받지 않아요' : '현재 신청을 받고 있어요'}</small>
          </span>
          <button
            className="badge blue"
            onClick={() => {
              setClosed(!closed);
              void classService.updateSettings(id, { recruitmentClosed: !closed });
              notify(closed ? '모집을 다시 열었어요' : '모집을 마감했어요');
            }}
          >
            {closed ? '모집 재개' : '모집 마감'}
          </button>
        </div>
        <div>
          <span>
            <b>정원</b>
            <small>현재 {detail?.enrolled || 0}명 신청</small>
          </span>
          <em>
            <button onClick={() => {
              const next = Math.max(1, capacity - 5);
              setCapacity(next);
              void classService.updateSettings(id, { capacity: next });
            }}>−</button>
            {capacity}명<button onClick={() => {
              const next = capacity + 5;
              setCapacity(next);
              void classService.updateSettings(id, { capacity: next });
            }}>＋</button>
          </em>
        </div>
      </section>
      <section className="menu-box">
        <Link to={`/classes/${id}/curriculum`}>
          <span>커리큘럼 관리</span>›
        </Link>
        <Link to={`/classes/new?edit=${id}`}>
          <span>강의 정보 수정</span>›
        </Link>
        <Link to={`/classes/new?edit=${id}&step=4`}>
          <span>신청서 수정</span>›
        </Link>
        <button
          onClick={() => {
            void navigator.clipboard?.writeText(
              `${location.origin}/s/${id === 'notion' ? 'notion-auto' : id}`,
            );
            notify('신청 링크를 복사했어요');
          }}
        >
          <Copy />
          <span>신청 링크 복사</span>›
        </button>
      </section>
      <button
        className="danger"
        onClick={() => setDeleteOpen(true)}
      >
        강의 삭제
      </button>
      <ConfirmDialog
        open={deleteOpen}
        title="강의를 삭제할까요?"
        description="삭제한 강의와 신청 페이지는 다시 복구할 수 없어요. 수강생에게 공유한 링크도 더 이상 사용할 수 없어요."
        confirmText="삭제하기"
        loading={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteClass()}
      />
    </>
  );
}

function Certificates({
  manager,
  requiresAttendance,
}: {
  manager: CertificateManager;
  requiresAttendance: boolean;
}) {
  const { issued, recipients, pending, condition, issue, setEditOpen } = manager;
  return (
    <>
      <button className="certificate-banner" onClick={() => setEditOpen(true)}>
        <Award />
        <span>
          <b>수료 조건</b>
          <small>
            진도 {condition}% 이상{requiresAttendance ? ' · 출석 80% 이상' : ''}
            <br />
            조건 충족 시 발급 대기 등록
          </small>
        </span>
        <Settings />
      </button>
      <div className="mini-stats cert-issue-stats">
        <div>
          발급 대기<b>{pending.length}명</b>
        </div>
        <div>
          발급 완료<b>{issued.length}명</b>
        </div>
      </div>
      {recipients.map((a, i) => {
        const done = issued.includes(a.id);
        return (
          <button className="check-row" disabled={done} onClick={() => issue([a.id])} key={a.id}>
            <span>{a.name[0]}</span>
            <b>
              {a.name}
              <small>{i ? '진도 92% · 출석 90%' : '진도 100% · 출석 100%'}</small>
            </b>
            <em>
              <Check />
              {done ? '발급완료' : '개별 발급'}
            </em>
          </button>
        );
      })}
      <button
        className="primary"
        disabled={!pending.length}
        onClick={() => issue(pending.map((item) => item.id))}
      >
        대기 {pending.length}명 일괄 발급
      </button>
    </>
  );
}
