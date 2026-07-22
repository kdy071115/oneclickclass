import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Image,
  Layers3,
  MapPin,
  Minus,
  Plus,
  Radio,
  Search,
  Video,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StatusBar } from '../components/common/StatusBar';
import { FileDropzone, Stepper } from '../components/ui';
import { classService } from '../api/services';
import { addressSuggestions, initialClassDraft } from '../constants/classDraft';
import { clearClassDraft, loadClassDraft, loadClassPreview, saveClassDraft, saveClassPreview } from '../utils/classDraft';
import { getClassThumbnail, saveClassThumbnail } from '../utils/classThumbnail';

const types = [
  ['online', Video, '온라인', '녹화 영상으로 진행'],
  ['live', Radio, '라이브', '실시간 화상 강의'],
  ['offline', MapPin, '오프라인', '현장에서 만나요'],
  ['hybrid', Layers3, '혼합형', '온라인 + 오프라인'],
] as const;
const labels = [
  ['어떤 강의인지\n알려주세요', '제목과 소개만 있어도 시작할 수 있어요'],
  ['어떻게\n진행하나요?', '장소나 참여 링크를 함께 정해요'],
  ['일정과 가격을\n정해주세요', '모집 인원과 참가비를 설정해요'],
  ['신청자에게\n무엇을 받을까요?', '기본 정보는 자동으로 받아요'],
  ['공개 준비가\n끝났어요', '신청 페이지를 확인하고 공유하세요'],
] as const;
const extraQuestions = ['성별', '연령대', '소속·직업', '신청 동기', '사전 질문', '기타 문의'];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 900px)').matches,
  );
  useEffect(() => {
    const media = window.matchMedia('(min-width: 900px)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

export function CreateClassPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const [step, setStep] = useState(() => params.has('edit') ? Math.min(labels.length, Math.max(1, Number(params.get('step')) || 1)) : 1);
  const [maxStep, setMaxStep] = useState(() => (params.has('edit') ? labels.length : 1));
  const [draft, setDraft] = useState(() => {
    const savedDraft = editId ? loadClassPreview(editId, initialClassDraft) : loadClassDraft(initialClassDraft);
    const savedThumbnail = editId ? getClassThumbnail(editId) : '';
    return savedThumbnail ? { ...savedDraft, thumbnail: savedThumbnail } : savedDraft;
  });
  const [calendar, setCalendar] = useState<'startDate' | 'recruitEndDate'>();
  const [addressOpen, setAddressOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [tool, setTool] = useState(() => {
    const url = draft.url.toLowerCase();
    if (url.includes('zoom')) return 'Zoom';
    if (url.includes('meet.google')) return 'Meet';
    if (url.includes('youtu')) return 'YouTube';
    return draft.url ? '기타 URL' : 'YouTube';
  });
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (editId) saveClassPreview(editId, draft);
      else saveClassDraft(draft);
      setSavedAt(new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date()));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, editId]);
  async function next(e: FormEvent) {
    e.preventDefault();
    const needsAddress = draft.type === 'offline' || draft.type === 'hybrid';
    if (step === 1 && !draft.title.trim()) return setError('강의 제목을 입력해 주세요.');
    if (step === 2 && needsAddress && !draft.address.trim())
      return setError('진행 장소를 입력해 주세요.');
    if (step === 3 && !draft.startDate) return setError('강의 일정을 선택해 주세요.');
    setError('');
    if (step < 5) {
      const nextStep = step + 1;
      setMaxStep((current) => Math.max(current, nextStep));
      setStep(nextStep);
    }
    else {
      setSubmitting(true);
      try {
        const created = editId
          ? await classService.update(editId, draft)
          : await classService.create(draft);
        if (draft.thumbnail) saveClassThumbnail(created.id, draft.thumbnail);
        saveClassPreview(created.id, draft);
        clearClassDraft();
        nav(editId ? `/classes/${created.id}` : `/classes/${created.id}/preview?draft=1`);
      } catch {
        setError('강의를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        setSubmitting(false);
      }
    }
  }
  function setThumbnail(file: File) {
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, thumbnail: String(reader.result) }));
    reader.readAsDataURL(file);
  }
  function addThumbnail(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('썸네일은 JPG, PNG, WEBP 형식의 5MB 이하 파일만 가능해요.');
      return;
    }
    setError('');
    setThumbnail(file);
  }
  const title = labels[step - 1];
  const isDesktop = useIsDesktop();
  return (
    <>
    {isDesktop && <form className="oc-create-web oc-web-page" onSubmit={next}>
      <div className="oc-create-steps">
        <button type="button" onClick={() => nav('/classes')} aria-label="클래스로 돌아가기">
          <ArrowLeft size={18} />
        </button>
        {labels.map((item, index) => (
          <button
            type="button"
            className={`${step === index + 1 ? 'active' : ''} ${index + 1 < maxStep ? 'complete' : ''}`}
            onClick={() => setStep(index + 1)}
            disabled={index + 1 > maxStep}
            key={item[0]}
          >
            <span>{index + 1}</span>
            <b>{item[0].replace('\n', ' ')}</b>
          </button>
        ))}
      </div>
      <section className="oc-create-editor">
        <div className="oc-web-head inline">
          <h1>{title[0].replace('\n', ' ')}</h1>
          <p>{title[1]}</p>
        </div>
        <div className="oc-create-box">
          {step === 1 && (
            <div className="oc-form-grid">
              <Field label="강의 제목" value={draft.title} onChange={(v) => { setDraft({ ...draft, title: v }); setError(''); }} placeholder="예) 노션으로 시작하는 업무 자동화" />
              <Field label="한 줄 소개" value={draft.summary} onChange={(v) => setDraft({ ...draft, summary: v })} placeholder="예) 반복 업무를 자동화하는 4주 과정" />
              <label className="create-field wide">상세 소개 <small>(나중에 수정 가능)</small><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="강의에서 배우는 내용을 자유롭게 적어주세요" /></label>
              <div className="create-field wide">썸네일 <small>(선택)</small>{draft.thumbnail && <img className="oc-thumbnail-preview" src={draft.thumbnail} alt="선택한 썸네일 미리보기" />}<FileDropzone onFile={setThumbnail} /></div>
            </div>
          )}
          {step === 2 && (
            <div className="oc-form-grid">
              <div className="oc-type-grid wide">
                {types.map(([value, Icon, label, desc]) => (
                  <button
                    type="button"
                    aria-label={label}
                    className={draft.type === value ? 'active' : ''}
                    onClick={() => setDraft({ ...draft, type: value })}
                    key={value}
                  >
                    <i><Icon /></i>
                    <b>{label}</b>
                    <small>{desc}</small>
                    {draft.type === value && <Check size={18} />}
                  </button>
                ))}
              </div>
              <div className="delivery-fields wide">
                {draft.type !== 'offline' && <><label className="create-field wide">진행 도구<div className="question-chips tools">{['YouTube', 'Zoom', 'Meet', '기타 URL'].map((x) => <button type="button" className={tool === x ? 'active' : ''} onClick={() => setTool(x)} key={x}>{x}</button>)}</div></label><Field label="참여 링크" value={draft.url} onChange={(v) => setDraft({ ...draft, url: v })} placeholder="나중에 입력해도 돼요" /></>}
                {(draft.type === 'offline' || draft.type === 'hybrid') && <><label className="create-field">도로명 주소<button className="date-field" type="button" aria-label="도로명 주소 검색" onClick={() => setAddressOpen(true)}><span>{draft.address || '도로명 주소를 검색하세요'}</span><Search /></button></label><Field label="상세 주소" value={draft.detailedAddress} onChange={(v) => setDraft({ ...draft, detailedAddress: v })} placeholder="예) 3층 302호" /></>}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="oc-form-grid">
              <DateField label="강의 일정" value={draft.startDate} onClick={() => setCalendar('startDate')} />
              <DateField label="모집 마감일" value={draft.recruitEndDate} onClick={() => setCalendar('recruitEndDate')} onClear={() => setDraft({ ...draft, recruitEndDate: '' })} />
              <label className="create-field">모집 정원<div className="capacity"><button type="button" onClick={() => setDraft({ ...draft, capacity: Math.max(1, draft.capacity - 5) })}><Minus /></button><input aria-label="모집 정원" inputMode="numeric" value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1) })} /><small>명</small><button type="button" onClick={() => setDraft({ ...draft, capacity: draft.capacity + 5 })}><Plus /></button></div></label>
              <label className="create-field">참가비<div className="fee-tabs"><button type="button" aria-label="무료" className={draft.payment === 'free' ? 'active' : ''} onClick={() => setDraft({ ...draft, payment: 'free' })}>무료</button><button type="button" aria-label="유료" className={draft.payment === 'paid' ? 'active' : ''} onClick={() => setDraft({ ...draft, payment: 'paid' })}>유료</button></div></label>
              {draft.payment === 'paid' && <div className="price-input wide"><input inputMode="numeric" value={draft.price || ''} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} placeholder="0" /><b>원</b></div>}
            </div>
          )}
          {step === 4 && (
            <>
              <div className="required-fields">
                {['이름', '전화번호', '이메일'].map((x) => <div key={x}><Check /><b>{x}</b><small>필수</small></div>)}
              </div>
              <label className="create-field oc-question-area">추가 질문 <small>(선택)</small><div className="question-chips">{extraQuestions.map((q) => <button type="button" className={draft.questions.includes(q) ? 'active' : ''} onClick={() => setDraft({ ...draft, questions: draft.questions.includes(q) ? draft.questions.filter((x) => x !== q) : [...draft.questions, q] })} key={q}>{q}</button>)}<button type="button" onClick={() => setCustomOpen(true)}><Plus />직접 추가</button></div></label>
              {customOpen && <div className="custom-question"><input autoFocus value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} placeholder="직접 물어볼 질문" /><button type="button" disabled={!customQuestion.trim()} onClick={() => { setDraft({ ...draft, questions: [...draft.questions, customQuestion.trim()] }); setCustomQuestion(''); setCustomOpen(false); }}>추가</button></div>}
            </>
          )}
          {step === 5 && (
            <div className="publish-ready">
              <Check />
              <h2>신청 페이지가 준비됐어요</h2>
              <p>미리보기에서 화면을 확인한 뒤 바로 공개하고 링크를 복사할 수 있어요.</p>
              <dl>
                <div><dt>강의</dt><dd>{draft.title || '제목 미입력'}</dd></div>
                <div><dt>진행</dt><dd>{types.find(([value]) => value === draft.type)?.[2]}</dd></div>
                <div><dt>일정</dt><dd>{draft.startDate || '일정 미정'}</dd></div>
                <div><dt>가격</dt><dd>{draft.payment === 'paid' ? `${draft.price.toLocaleString()}원` : '무료'}</dd></div>
              </dl>
            </div>
          )}
          {error && <p className="form-error">{error}</p>}
        </div>
        <div className="oc-create-actions">
          {savedAt && <small>임시저장 {savedAt}</small>}
          <button type="button" onClick={() => (step > 1 ? setStep(step - 1) : nav('/classes'))}>이전</button>
          <button className="oc-create-submit" type="submit" disabled={submitting}>
            {submitting ? '저장 중' : step < 5 ? '다음 단계' : '미리보기로 확인하기'}
            <ChevronRight size={18} />
          </button>
        </div>
      </section>
    </form>}
    {!isDesktop && <main className="standalone framed create-mobile">
      <form className="page create exact-create" onSubmit={next}>
        <StatusBar />
        <div className="create-scroll">
          <header>
            <button
              type="button"
              onClick={() => (step > 1 ? setStep(step - 1) : nav('/classes'))}
              aria-label="뒤로"
            >
              <ArrowLeft />
            </button>
            <span />
            <button type="button" onClick={() => nav('/dashboard')}>
              닫기
            </button>
          </header>
          <Stepper current={step - 1} steps={labels.map((item) => item[0].replace('\n', ' '))} />
          <h1>
            {title[0].split('\n').map((line, i) => (
              <span key={line}>
                {line}
                {i === 0 && <br />}
              </span>
            ))}
          </h1>
          <p className="create-subtitle">{title[1]}</p>
          {step === 1 && (
            <>
              <Field
                label="강의 제목"
                value={draft.title}
                onChange={(title) => setDraft({ ...draft, title })}
                placeholder="예) 노션으로 시작하는 업무 자동화"
              />
              <Field
                label="한 줄 소개"
                value={draft.summary}
                onChange={(summary) => setDraft({ ...draft, summary })}
                placeholder="예) 반복 업무를 자동화하는 4주 과정"
              />
              <label className="create-field">
                상세 소개
                <small>(나중에 수정 가능)</small>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="강의에서 배우는 내용을 자유롭게 적어주세요"
                />
              </label>
              <label className="create-field">
                썸네일
                <span className="thumbnail-field">
                  {draft.thumbnail ? (
                    <img src={draft.thumbnail} alt="선택한 썸네일 미리보기" />
                  ) : (
                    <>
                      <Image />
                      <span>이미지 추가 (선택)</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={addThumbnail} />
                </span>
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <div className="type-list">
                {types.map(([value, Icon, label, desc]) => (
                  <button
                    type="button"
                    aria-label={label}
                    className={draft.type === value ? 'active' : ''}
                    onClick={() => setDraft({ ...draft, type: value })}
                    key={value}
                  >
                    <i>
                      <Icon />
                    </i>
                    <span>
                      <b>{label}</b>
                      <small>{desc}</small>
                    </span>
                    {draft.type === value && <Check />}
                  </button>
                ))}
              </div>
              <div className="delivery-fields">
              {draft.type !== 'offline' && (
                <>
                  <label className="create-field">
                    진행 도구
                    <div className="question-chips tools">
                      {['YouTube', 'Zoom', 'Meet', '기타 URL'].map((x) => (
                        <button
                          type="button"
                          className={tool === x ? 'active' : ''}
                          onClick={() => setTool(x)}
                          key={x}
                        >
                          {x}
                        </button>
                      ))}
                    </div>
                  </label>
                  <Field
                    label="참여 링크"
                    value={draft.url}
                    onChange={(url) => setDraft({ ...draft, url })}
                    placeholder="나중에 입력해도 돼요"
                  />
                </>
              )}
              {(draft.type === 'offline' || draft.type === 'hybrid') && (
                <>
                  <label className="create-field">
                    도로명 주소
                    <button
                      className="date-field"
                      type="button"
                      aria-label="도로명 주소 검색"
                      onClick={() => setAddressOpen(true)}
                    >
                      <span>{draft.address || '도로명 주소를 검색하세요'}</span>
                      <Search />
                    </button>
                  </label>
                  <Field
                    label="상세 주소"
                    value={draft.detailedAddress}
                    onChange={(detailedAddress) => setDraft({ ...draft, detailedAddress })}
                    placeholder="예) 3층 302호"
                  />
                </>
              )}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <DateField
                label="강의 일정"
                value={draft.startDate}
                onClick={() => setCalendar('startDate')}
              />
              <DateField
                label="모집 마감일 (선택)"
                value={draft.recruitEndDate}
                onClick={() => setCalendar('recruitEndDate')}
                onClear={() => setDraft({ ...draft, recruitEndDate: '' })}
              />
              <label className="create-field">
                모집 정원
                <div className="capacity">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, capacity: Math.max(1, draft.capacity - 5) })
                    }
                  >
                    <Minus />
                  </button>
                  <input
                    aria-label="모집 정원"
                    inputMode="numeric"
                    value={draft.capacity}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        capacity: Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1),
                      })
                    }
                  />
                  <small>명</small>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, capacity: draft.capacity + 5 })}
                  >
                    <Plus />
                  </button>
                </div>
              </label>
              <label className="create-field">
                참가비
                <div className="fee-tabs">
                  <button
                    type="button"
                    aria-label="무료"
                    className={draft.payment === 'free' ? 'active' : ''}
                    onClick={() => setDraft({ ...draft, payment: 'free' })}
                  >
                    무료
                  </button>
                  <button
                    type="button"
                    aria-label="유료"
                    className={draft.payment === 'paid' ? 'active' : ''}
                    onClick={() => setDraft({ ...draft, payment: 'paid' })}
                  >
                    유료
                  </button>
                </div>
              </label>
              {draft.payment === 'paid' && (
                <div className="price-input">
                  <input
                    inputMode="numeric"
                    value={draft.price || ''}
                    onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                    placeholder="0"
                  />
                  <b>원</b>
                </div>
              )}
            </>
          )}
          {step === 4 && (
            <>
              <div className="required-fields">
                {['이름', '전화번호', '이메일'].map((x) => (
                  <div key={x}>
                    <Check />
                    <b>{x}</b>
                    <small>필수</small>
                  </div>
                ))}
              </div>
              <label className="create-field">
                추가 질문 <small>(선택)</small>
                <div className="question-chips">
                  {extraQuestions.map((q) => (
                    <button
                      type="button"
                      className={draft.questions.includes(q) ? 'active' : ''}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          questions: draft.questions.includes(q)
                            ? draft.questions.filter((x) => x !== q)
                            : [...draft.questions, q],
                        })
                      }
                      key={q}
                    >
                      {q}
                    </button>
                  ))}
                  <button type="button" onClick={() => setCustomOpen(true)}>
                    <Plus />
                    직접 추가
                  </button>
                </div>
              </label>
              {customOpen && (
                <div className="custom-question">
                  <input
                    autoFocus
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="직접 물어볼 질문을 적어주세요"
                  />
                  <button
                    type="button"
                    disabled={!customQuestion.trim()}
                    onClick={() => {
                      setDraft({
                        ...draft,
                        questions: [...draft.questions, customQuestion.trim()],
                      });
                      setCustomQuestion('');
                      setCustomOpen(false);
                    }}
                  >
                    추가
                  </button>
                </div>
              )}
            </>
          )}
          {step === 5 && (
            <div className="publish-ready">
              <Check />
              <h2>신청 페이지가 준비됐어요</h2>
              <p>미리보기에서 확인한 뒤 바로 공개하고 링크를 복사할 수 있어요.</p>
              <dl>
                <div><dt>강의</dt><dd>{draft.title || '제목 미입력'}</dd></div>
                <div><dt>진행</dt><dd>{types.find(([value]) => value === draft.type)?.[2]}</dd></div>
                <div><dt>일정</dt><dd>{draft.startDate || '일정 미정'}</dd></div>
                <div><dt>가격</dt><dd>{draft.payment === 'paid' ? `${draft.price.toLocaleString()}원` : '무료'}</dd></div>
              </dl>
            </div>
          )}
          {error && <p className="form-error">{error}</p>}
        </div>
        <button className="primary create-cta" type="submit" disabled={submitting}>
          {submitting ? '저장 중' : step < 5 ? '다음' : '미리보기로 확인하기'}
        </button>
      </form>
    </main>}
    {calendar && <CalendarSheet title={calendar === 'startDate' ? '강의 일정을 골라주세요' : '모집 마감일을 골라주세요'} onClose={() => setCalendar(undefined)} onPick={(date) => { setDraft({ ...draft, [calendar]: date }); setError(''); setCalendar(undefined); }} />}
    {addressOpen && <div className="sheet-overlay" onClick={() => setAddressOpen(false)}><section className="address-sheet" onClick={(e) => e.stopPropagation()}><i /><header><b>주소 검색</b><button type="button" onClick={() => setAddressOpen(false)}>닫기</button></header><label><Search /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="도로명, 건물명 또는 지번 검색" /></label>{query && addressSuggestions.map((x) => <button type="button" className="address-result" onClick={() => { setDraft({ ...draft, address: x }); setError(''); setAddressOpen(false); }} key={x}><b>{x}</b><small>서울특별시 상세 주소</small></button>)}</section></div>}
    </>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="create-field">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
function DateField({
  label,
  value,
  onClick,
  onClear,
}: {
  label: string;
  value: string;
  onClick: () => void;
  onClear?: () => void;
}) {
  return (
    <label className="create-field">
      {label}
      <button className="date-field" type="button" onClick={onClick}>
        <span>{value || '날짜를 선택하세요'}</span>
        <CalendarDays />
      </button>
      {value && onClear && (
        <button className="date-clear" type="button" onClick={onClear}>
          선택 안 함
        </button>
      )}
    </label>
  );
}
function CalendarSheet({
  title,
  onClose,
  onPick,
}: {
  title: string;
  onClose: () => void;
  onPick: (date: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const days = Array.from({ length: new Date(year, monthIndex + 1, 0).getDate() }, (_, i) => i + 1);
  const offset = new Date(year, monthIndex, 1).getDay();
  const moveMonth = (amount: number) => setMonth(new Date(year, monthIndex + amount, 1));
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <section className="calendar-sheet" onClick={(e) => e.stopPropagation()}>
        <i />
        <header>
          <b>{title}</b>
          <button type="button" onClick={onClose}>
            닫기
          </button>
        </header>
        <div className="month">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달">
            ‹
          </button>
          <b>
            {year}년 {monthIndex + 1}월
          </b>
          <button type="button" onClick={() => moveMonth(1)} aria-label="다음 달">
            ›
          </button>
        </div>
        <div className="week">
          {['일', '월', '화', '수', '목', '금', '토'].map((x) => (
            <b key={x}>{x}</b>
          ))}
        </div>
        <div className="days">
          {Array.from({ length: offset }, (_, i) => (
            <span key={`e${i}`} />
          ))}
          {days.map((day) => (
            <button
              type="button"
              className={new Date().toDateString() === new Date(year, monthIndex, day).toDateString() ? 'active' : ''}
              onClick={() =>
                onPick(
                  `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                )
              }
              key={day}
            >
              {day}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
