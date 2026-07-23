import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CirclePlay,
  FileText,
  Pencil,
  Plus,
  Radio,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { curriculumService, detailService } from '../api/services';
import {
  Button,
  EmptyState,
  IconButton,
  Input,
  Modal,
  Select,
  Skeleton,
  Textarea,
  Toggle,
} from '../components/ui';
import type { CurriculumLesson, CurriculumSection, LessonContentType } from '../types/class';
import {
  contentProviderLabel,
  detectContentProvider,
  validateContentUrl,
} from '../utils/content';

const lessonTypes: Record<
  LessonContentType,
  { label: string; Icon: typeof CirclePlay; urlLabel: string; urlHint: string }
> = {
  video: {
    label: '녹화 영상',
    Icon: CirclePlay,
    urlLabel: '영상 URL (MP4 · YouTube · Vimeo)',
    urlHint: '이어보기는 영상 제공자의 재생 위치 연동이 지원되는 경우 저장돼요.',
  },
  live: { label: '라이브', Icon: Radio, urlLabel: '참여 URL', urlHint: '수강생이 바로 입장할 수 있는 주소를 입력해 주세요.' },
  document: { label: '학습 자료', Icon: FileText, urlLabel: '자료 URL', urlHint: '수강생이 열람할 수 있는 공개 주소를 입력해 주세요.' },
  assignment: { label: '과제', Icon: BookOpen, urlLabel: '제출 안내 URL', urlHint: '과제 설명이나 제출 화면 주소를 입력해 주세요.' },
};

const emptyLesson = (): Omit<CurriculumLesson, 'id'> => ({
  title: '',
  description: '',
  contentType: 'video',
  contentUrl: '',
  durationMinutes: 30,
  preview: false,
  published: false,
  required: true,
  sequential: false,
});

type LessonEditor = {
  sectionId: string;
  lessonId?: string;
};

export function CurriculumPage() {
  const { id = 'notion' } = useParams();
  const [searchParams] = useSearchParams();
  const setup = searchParams.get('setup') === '1';
  const [classTitle, setClassTitle] = useState('');
  const [sections, setSections] = useState<CurriculumSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [editor, setEditor] = useState<LessonEditor>();
  const [lesson, setLesson] = useState(emptyLesson);
  const [lessonSnapshot, setLessonSnapshot] = useState('');
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [contentUrlError, setContentUrlError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError('');
    Promise.all([detailService.getClass(id), curriculumService.list(id)])
      .then(([detail, curriculum]) => {
        if (!alive) return;
        setClassTitle(detail.title);
        setSections(curriculum);
      })
      .catch(() => alive && setLoadError('커리큘럼을 불러오지 못했어요.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, reload]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 1800);
  };

  const addSection = async () => {
    const title = newSectionTitle.trim();
    if (!title) return;
    setSections(await curriculumService.createSection(id, title));
    setNewSectionTitle('');
    notify('섹션을 추가했어요');
  };

  const renameSection = async (section: CurriculumSection, title: string) => {
    const nextTitle = title.trim();
    if (!nextTitle || nextTitle === section.title) return;
    setSections(await curriculumService.updateSection(id, section.id, nextTitle));
    notify('섹션 이름을 저장했어요');
  };

  const removeSection = async (section: CurriculumSection) => {
    if (
      !window.confirm(
        section.lessons.length
          ? `‘${section.title}’ 섹션과 차시 ${section.lessons.length}개를 삭제할까요?`
          : `‘${section.title}’ 섹션을 삭제할까요?`,
      )
    )
      return;
    setSections(await curriculumService.deleteSection(id, section.id));
    notify('섹션을 삭제했어요');
  };

  const moveSection = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
    setSections(await curriculumService.reorder(id, next));
  };

  const moveLesson = async (sectionIndex: number, lessonIndex: number, direction: -1 | 1) => {
    const target = lessonIndex + direction;
    const section = sections[sectionIndex];
    if (target < 0 || target >= section.lessons.length) return;
    const lessons = [...section.lessons];
    [lessons[lessonIndex], lessons[target]] = [lessons[target], lessons[lessonIndex]];
    const next = sections.map((item, index) =>
      index === sectionIndex ? { ...item, lessons } : item,
    );
    setSections(next);
    setSections(await curriculumService.reorder(id, next));
  };

  const openCreateLesson = (sectionId: string) => {
    const value = emptyLesson();
    setLesson(value);
    setLessonSnapshot(JSON.stringify(value));
    setTitleError('');
    setContentUrlError('');
    setEditor({ sectionId });
  };

  const openEditLesson = (sectionId: string, current: CurriculumLesson) => {
    const { id: lessonId, ...value } = current;
    const nextValue = { ...value, required: value.required ?? true, sequential: value.sequential ?? false };
    setLesson(nextValue);
    setLessonSnapshot(JSON.stringify(nextValue));
    setTitleError('');
    setContentUrlError('');
    setEditor({ sectionId, lessonId });
  };

  const saveLesson = async () => {
    if (!editor || !lesson.title.trim()) {
      setTitleError('차시 제목을 입력해 주세요.');
      return;
    }
    if (lesson.published && !lesson.contentUrl.trim()) {
      setContentUrlError(
        `공개하려면 ${lessonTypes[lesson.contentType].urlLabel}을 입력해 주세요.`,
      );
      return;
    }
    const urlError = validateContentUrl(lesson.contentUrl, lesson.contentType);
    if (urlError) {
      setContentUrlError(urlError);
      return;
    }
    setSaving(true);
    try {
      const value = {
        ...lesson,
        title: lesson.title.trim(),
        durationMinutes: Math.max(0, lesson.durationMinutes),
      };
      const next = editor.lessonId
        ? await curriculumService.updateLesson(id, editor.lessonId, value)
        : await curriculumService.createLesson(id, editor.sectionId, value);
      setSections(next);
      setEditor(undefined);
      notify(editor.lessonId ? '차시를 수정했어요' : '차시를 추가했어요');
    } finally {
      setSaving(false);
    }
  };

  const closeEditor = () => {
    const changed = JSON.stringify(lesson) !== lessonSnapshot;
    if (changed && !window.confirm('저장하지 않은 변경 내용이 있어요. 편집을 종료할까요?')) return;
    setEditor(undefined);
    setTitleError('');
    setContentUrlError('');
  };

  const removeLesson = async (current: CurriculumLesson) => {
    if (!window.confirm(`‘${current.title}’ 차시를 삭제할까요?`)) return;
    setSections(await curriculumService.deleteLesson(id, current.id));
    notify('차시를 삭제했어요');
  };

  const totalLessons = sections.reduce((total, section) => total + section.lessons.length, 0);
  const publishedLessons = sections.reduce(
    (total, section) => total + section.lessons.filter((item) => item.published).length,
    0,
  );
  const detectedProvider = detectContentProvider(lesson.contentUrl, lesson.contentType);

  return (
    <div className="page subpage curriculum-manager-page">
      <header className="curriculum-manager-head">
        <Link to={`/classes/${id}`} aria-label="클래스 상세로 돌아가기">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <small>{classTitle || '클래스'}</small>
          <h1>커리큘럼 관리</h1>
          <p>섹션과 차시를 수강생이 학습할 순서대로 구성하세요.</p>
        </div>
        {!setup && (
          <Link className="curriculum-preview-link" to={`/classes/${id}/preview`}>
            수강생 화면 보기
          </Link>
        )}
      </header>

      {setup && (
        <section className="curriculum-setup-guide" aria-label="강의 공개 준비">
          <div>
            <small>강의 공개 준비</small>
            <h2>{publishedLessons ? '신청 페이지를 확인할 차례예요' : '첫 차시를 만들어 주세요'}</h2>
            <p>{publishedLessons ? '수강생 화면을 확인한 뒤 공개하면 신청 링크가 만들어져요.' : '섹션을 추가하고 영상·라이브·자료를 차시에 연결해 주세요.'}</p>
          </div>
          <ol>
            <li className="complete"><b>1</b><span>기본 정보<small>저장 완료</small></span></li>
            <li className={publishedLessons ? 'complete' : 'active'}><b>2</b><span>커리큘럼<small>{publishedLessons ? `공개 차시 ${publishedLessons}개` : '첫 차시 등록'}</small></span></li>
            <li className={publishedLessons ? 'active' : ''}><b>3</b><span>미리보기·공개<small>신청 링크 만들기</small></span></li>
          </ol>
          {publishedLessons > 0 && <Link to={`/classes/${id}/preview`}>신청 페이지 미리보기</Link>}
        </section>
      )}

      <div className="curriculum-summary" aria-label="커리큘럼 현황">
        <span>
          <b>{sections.length}</b>개 섹션
        </span>
        <span>
          <b>{totalLessons}</b>개 차시
        </span>
        <span>
          <b>{publishedLessons}</b>개 공개
        </span>
      </div>

      <section className="curriculum-add-section">
        <Input
          label="새 섹션"
          disabled={!!loadError}
          value={newSectionTitle}
          onChange={(event) => setNewSectionTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void addSection();
          }}
          placeholder="예) 1주차 · 업무 구조 이해하기"
        />
        <Button disabled={!!loadError || !newSectionTitle.trim()} onClick={() => void addSection()}>
          <Plus size={18} /> 섹션 추가
        </Button>
      </section>

      {loading ? (
        <Skeleton lines={5} />
      ) : loadError ? (
        <EmptyState
          title={loadError}
          description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
          action={<Button onClick={() => setReload((value) => value + 1)}>다시 시도</Button>}
        />
      ) : sections.length ? (
        <div className="curriculum-section-list">
          {sections.map((section, sectionIndex) => (
            <section className="curriculum-section-card" key={section.id}>
              <header>
                <span>{sectionIndex + 1}</span>
                <input
                  aria-label={`${sectionIndex + 1}번 섹션 이름`}
                  defaultValue={section.title}
                  onBlur={(event) => void renameSection(section, event.target.value)}
                />
                <small>{section.lessons.length}개 차시</small>
                <div className="curriculum-order-actions">
                  <IconButton
                    label="섹션 위로 이동"
                    disabled={sectionIndex === 0}
                    onClick={() => void moveSection(sectionIndex, -1)}
                  >
                    <ChevronUp size={17} />
                  </IconButton>
                  <IconButton
                    label="섹션 아래로 이동"
                    disabled={sectionIndex === sections.length - 1}
                    onClick={() => void moveSection(sectionIndex, 1)}
                  >
                    <ChevronDown size={17} />
                  </IconButton>
                  <IconButton label="섹션 삭제" onClick={() => void removeSection(section)}>
                    <Trash2 size={17} />
                  </IconButton>
                </div>
              </header>

              <div className="curriculum-lesson-list">
                {section.lessons.map((item, lessonIndex) => {
                  const type = lessonTypes[item.contentType];
                  const TypeIcon = type.Icon;
                  return (
                    <article className="curriculum-lesson-row" key={item.id}>
                      <span className="curriculum-lesson-number">{lessonIndex + 1}</span>
                      <i>
                        <TypeIcon size={19} />
                      </i>
                      <div>
                        <b>{item.title}</b>
                        <small>
                          {type.label} · {item.durationMinutes}분{item.required === false ? '' : ' · 필수'}{item.sequential ? ' · 순차 학습' : ''}{item.preview ? ' · 미리보기' : ''}
                        </small>
                      </div>
                      <em className={item.published ? 'published' : ''}>
                        {item.published ? '공개' : '비공개'}
                      </em>
                      <div className="curriculum-order-actions">
                        <IconButton
                          label="차시 위로 이동"
                          disabled={lessonIndex === 0}
                          onClick={() => void moveLesson(sectionIndex, lessonIndex, -1)}
                        >
                          <ChevronUp size={17} />
                        </IconButton>
                        <IconButton
                          label="차시 아래로 이동"
                          disabled={lessonIndex === section.lessons.length - 1}
                          onClick={() => void moveLesson(sectionIndex, lessonIndex, 1)}
                        >
                          <ChevronDown size={17} />
                        </IconButton>
                        <IconButton
                          label="차시 수정"
                          onClick={() => openEditLesson(section.id, item)}
                        >
                          <Pencil size={17} />
                        </IconButton>
                        <IconButton label="차시 삭제" onClick={() => void removeLesson(item)}>
                          <Trash2 size={17} />
                        </IconButton>
                      </div>
                    </article>
                  );
                })}
                {!section.lessons.length && (
                  <EmptyState
                    title="아직 차시가 없어요"
                    description="첫 차시를 추가해 학습 순서를 만들어 주세요."
                  />
                )}
              </div>
              <button
                type="button"
                className="curriculum-add-lesson"
                onClick={() => openCreateLesson(section.id)}
              >
                <Plus size={18} /> 차시 추가
              </button>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title="아직 커리큘럼이 없어요"
          description="첫 섹션을 추가하면 차시를 구성할 수 있어요."
        />
      )}

      <Modal
        open={!!editor}
        title={editor?.lessonId ? '차시 수정' : '새 차시 추가'}
        onClose={closeEditor}
        footer={
          <>
            <Button variant="secondary" onClick={closeEditor}>
              취소
            </Button>
            <Button disabled={saving} onClick={() => void saveLesson()}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </>
        }
      >
        <div className="curriculum-lesson-form">
          <Input
            label="차시 제목"
            value={lesson.title}
            error={titleError}
            onChange={(event) => {
              setLesson({ ...lesson, title: event.target.value });
              setTitleError('');
            }}
            placeholder="예) 데이터베이스 기본 구조 만들기"
          />
          <Textarea
            label="간단한 설명"
            value={lesson.description}
            onChange={(event) => setLesson({ ...lesson, description: event.target.value })}
            placeholder="수강생이 이 차시에서 배우는 내용을 적어 주세요."
          />
          <Select
            label="콘텐츠 유형"
            value={lesson.contentType}
            onChange={(event) => {
              setLesson({ ...lesson, contentType: event.target.value as LessonContentType });
              setContentUrlError('');
            }}
          >
            {Object.entries(lessonTypes).map(([value, item]) => (
              <option value={value} key={value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Input
            label={lessonTypes[lesson.contentType].urlLabel}
            type="url"
            value={lesson.contentUrl}
            error={contentUrlError}
            onChange={(event) => {
              setLesson({ ...lesson, contentUrl: event.target.value });
              setContentUrlError('');
            }}
            placeholder="https://"
            hint={lessonTypes[lesson.contentType].urlHint}
          />
          {lesson.contentUrl.trim() && !contentUrlError && (
            <div className="content-source-status" role="status">
              자동 확인 · {contentProviderLabel[detectedProvider]}
            </div>
          )}
          <Input
            label="예상 학습 시간(분)"
            type="number"
            min={0}
            value={lesson.durationMinutes}
            onChange={(event) =>
              setLesson({ ...lesson, durationMinutes: Number(event.target.value) || 0 })
            }
          />
          <div className="curriculum-toggle-row">
            <span>
              <b>무료 미리보기</b>
              <small>신청 전에도 이 차시를 볼 수 있어요.</small>
            </span>
            <Toggle
              label="무료 미리보기 설정"
              checked={lesson.preview}
              onChange={(preview) => setLesson({ ...lesson, preview })}
            />
          </div>
          <div className="curriculum-toggle-row">
            <span>
              <b>필수 차시</b>
              <small>이수 조건을 계산할 때 반드시 완료해야 하는 차시예요.</small>
            </span>
            <Toggle
              label="필수 차시 설정"
              checked={lesson.required ?? true}
              onChange={(required) => setLesson({ ...lesson, required })}
            />
          </div>
          <div className="curriculum-toggle-row">
            <span>
              <b>순서대로 학습</b>
              <small>이전 차시를 완료한 뒤 이 차시를 열 수 있어요.</small>
            </span>
            <Toggle
              label="순차 학습 설정"
              checked={lesson.sequential ?? false}
              onChange={(sequential) => setLesson({ ...lesson, sequential })}
            />
          </div>
          <div className="curriculum-toggle-row">
            <span>
              <b>수강생에게 공개</b>
              <small>비공개 차시는 커리큘럼에 표시되지 않아요.</small>
            </span>
            <Toggle
              label="차시 공개 설정"
              checked={lesson.published}
              onChange={(published) => setLesson({ ...lesson, published })}
            />
          </div>
        </div>
      </Modal>
      {toast && (
        <div className="done-toast" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
