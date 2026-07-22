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
import { Link, useParams } from 'react-router-dom';
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

const lessonTypes: Record<
  LessonContentType,
  { label: string; Icon: typeof CirclePlay; urlLabel: string }
> = {
  video: { label: '녹화 영상', Icon: CirclePlay, urlLabel: '영상 URL (MP4 · YouTube · Vimeo)' },
  live: { label: '라이브', Icon: Radio, urlLabel: '참여 URL' },
  document: { label: '학습 자료', Icon: FileText, urlLabel: '자료 URL' },
  assignment: { label: '과제', Icon: BookOpen, urlLabel: '제출 안내 URL' },
};

const emptyLesson = (): Omit<CurriculumLesson, 'id'> => ({
  title: '',
  description: '',
  contentType: 'video',
  contentUrl: '',
  durationMinutes: 30,
  preview: false,
  published: false,
});

type LessonEditor = {
  sectionId: string;
  lessonId?: string;
};

export function CurriculumPage() {
  const { id = 'notion' } = useParams();
  const [classTitle, setClassTitle] = useState('');
  const [sections, setSections] = useState<CurriculumSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [editor, setEditor] = useState<LessonEditor>();
  const [lesson, setLesson] = useState(emptyLesson);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([detailService.getClass(id), curriculumService.list(id)]).then(
      ([detail, curriculum]) => {
        if (!alive) return;
        setClassTitle(detail.title);
        setSections(curriculum);
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [id]);

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
    setLesson(emptyLesson());
    setError('');
    setEditor({ sectionId });
  };

  const openEditLesson = (sectionId: string, current: CurriculumLesson) => {
    const { id: lessonId, ...value } = current;
    setLesson(value);
    setError('');
    setEditor({ sectionId, lessonId });
  };

  const saveLesson = async () => {
    if (!editor || !lesson.title.trim()) {
      setError('차시 제목을 입력해 주세요.');
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
        <Link className="curriculum-preview-link" to={`/classes/${id}/preview`}>
          수강생 화면 보기
        </Link>
      </header>

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
          value={newSectionTitle}
          onChange={(event) => setNewSectionTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void addSection();
          }}
          placeholder="예) 1주차 · 업무 구조 이해하기"
        />
        <Button disabled={!newSectionTitle.trim()} onClick={() => void addSection()}>
          <Plus size={18} /> 섹션 추가
        </Button>
      </section>

      {loading ? (
        <Skeleton lines={5} />
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
                          {type.label} · {item.durationMinutes}분{item.preview ? ' · 미리보기' : ''}
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
        onClose={() => setEditor(undefined)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditor(undefined)}>
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
            error={error}
            onChange={(event) => {
              setLesson({ ...lesson, title: event.target.value });
              setError('');
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
            onChange={(event) =>
              setLesson({ ...lesson, contentType: event.target.value as LessonContentType })
            }
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
            onChange={(event) => setLesson({ ...lesson, contentUrl: event.target.value })}
            placeholder="https://"
            hint="나중에 입력해도 돼요."
          />
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
