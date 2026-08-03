import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  MapPin,
  MonitorPlay,
  Pencil,
  Play,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  Users,
  Video,
  WalletCards,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  classService,
  curriculumService,
  detailService,
  type ClassSourceMetadata,
} from '../api/services';
import {
  classCreationFileTypes,
  classCreationLimits,
  classCreationFlowSteps,
  classTypeOptions,
} from '../constants/classCreation';
import { addressSuggestions, initialClassDraft } from '../constants/classDraft';
import { Button, ConfirmDialog, EmptyState, Input, Skeleton } from '../components/ui';
import {
  clearClassDraft,
  hasClassPreview,
  loadClassDraft,
  loadClassPreview,
  saveClassDraft,
  saveClassPreview,
} from '../utils/classDraft';
import {
  combineClassSchedule,
  buildSourceCurriculum,
  formatMediaDuration,
  formatClassSchedule,
  getYouTubeVideoId,
  isSupportedClassSourceFile,
  isPastClassSchedule,
  isValidYouTubeUrl,
  localDateInputValue,
  readVideoDuration,
  scheduleDateValue,
  scheduleTimeValue,
} from '../utils/classCreation';
import {
  getClassThumbnail,
  optimizeClassThumbnail,
  saveClassThumbnail,
} from '../utils/classThumbnail';
import type { ClassDetail, ClassDraft, ClassItem } from '../types/class';

type SupportedClassType = Exclude<ClassDraft['type'], 'hybrid'>;
type SourceKind = 'none' | 'youtube' | 'video' | 'documents';
type InformationMode = 'source' | 'manual' | 'analyzing' | 'generated' | 'analysis-error';
type SaveStatus = 'saving' | 'saved' | 'error';
type ThumbnailUploadStatus = 'idle' | 'uploading' | 'error';
type EditableField =
  | 'title'
  | 'summary'
  | 'description'
  | 'price'
  | 'capacity'
  | 'address'
  | 'startDate';
type FormField =
  | 'title'
  | 'summary'
  | 'description'
  | 'price'
  | 'capacity'
  | 'address'
  | 'startDate'
  | 'recruitEndDate';
type FieldErrors = Partial<Record<FormField, string>>;

interface UploadedMaterial {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'uploaded' | 'error';
  url?: string;
  progress?: number;
  durationSeconds?: number;
}

interface CreationMeta {
  deliverySelected: boolean;
  source: SourceKind;
  youtubeUrl: string;
  youtubeVideoId: string;
  youtubeConnected: boolean;
  youtubeMetadata?: ClassSourceMetadata;
  materials: UploadedMaterial[];
  informationMode: InformationMode;
  createdId: string;
  shareToken: string;
  step: number;
  maxStep: number;
}

interface ScheduleEditValue {
  date: string;
  time: string;
}

function getScheduleInputError(date: string, time: string, hasValue = Boolean(date || time)) {
  if (hasValue && (!date || !time)) {
    return '일정을 설정하려면 시작 날짜와 시간을 모두 입력해 주세요.';
  }
  const schedule = combineClassSchedule(date, time);
  if (schedule && isPastClassSchedule(schedule)) {
    return '클래스 시작 일정은 현재 이후로 선택해 주세요.';
  }
  return '';
}

const CLASS_CREATION_META_KEY = 'oneclick-class-creation-meta';

const initialCreationMeta: CreationMeta = {
  deliverySelected: false,
  source: 'none',
  youtubeUrl: '',
  youtubeVideoId: '',
  youtubeConnected: false,
  youtubeMetadata: undefined,
  materials: [],
  informationMode: 'source',
  createdId: '',
  shareToken: '',
  step: 1,
  maxStep: 1,
};

const typeIcons = {
  online: MonitorPlay,
  live: Radio,
  offline: MapPin,
} as const;

const draftTypeByLabel: Record<string, SupportedClassType> = {
  온라인: 'online',
  라이브: 'live',
  오프라인: 'offline',
  혼합형: 'offline',
};

function supportedType(type: ClassDraft['type']): SupportedClassType {
  return type === 'hybrid' ? 'offline' : type;
}

function editDraftFromClass(item: ClassItem, detail: ClassDetail): ClassDraft {
  const type = draftTypeByLabel[item.type] ?? 'online';
  return {
    ...initialClassDraft,
    type,
    title: detail.title,
    summary: detail.summary,
    description: detail.description,
    thumbnail: item.thumbnail ?? '',
    thumbnailPosition: item.thumbnailPosition ?? initialClassDraft.thumbnailPosition,
    startDate: item.startDate || detail.startDate || '',
    recruitEndDate: detail.recruitEndDate,
    capacity: detail.capacity,
    payment: detail.price > 0 ? 'paid' : 'free',
    price: detail.price,
    url: type !== 'offline' && /^https?:\/\//.test(detail.location) ? detail.location : '',
    address: type === 'offline' ? detail.location : '',
  };
}

function loadCreationMeta(
  hasDraft: boolean,
  editing: boolean,
  requestedSource: string | null,
): CreationMeta {
  if (!editing && requestedSource === 'youtube') {
    return {
      ...initialCreationMeta,
      deliverySelected: true,
      informationMode: 'source',
      step: 2,
      maxStep: 2,
    };
  }
  try {
    const saved = sessionStorage.getItem(CLASS_CREATION_META_KEY);
    if (!saved) {
      return {
        ...initialCreationMeta,
        deliverySelected: hasDraft || editing,
        informationMode: hasDraft || editing ? 'generated' : 'source',
      };
    }
    const parsed = JSON.parse(saved) as Partial<CreationMeta>;
    const restoredStep = Math.min(4, Math.max(1, Number(parsed.step) || 1));
    const restoredMaxStep = Math.min(
      4,
      Math.max(restoredStep, Number(parsed.maxStep) || restoredStep),
    );
    return {
      ...initialCreationMeta,
      ...parsed,
      youtubeVideoId: parsed.youtubeVideoId || getYouTubeVideoId(parsed.youtubeUrl || ''),
      youtubeMetadata: parsed.youtubeMetadata,
      deliverySelected: parsed.deliverySelected ?? (hasDraft || editing),
      step: restoredStep,
      maxStep: editing ? 4 : restoredMaxStep,
      materials: (parsed.materials ?? []).map((file) => ({
        ...file,
        status:
          file.status === 'uploading' || (file.status === 'uploaded' && !file.url)
            ? 'error'
            : file.status,
        progress: file.status === 'uploaded' && file.url ? 100 : undefined,
      })),
    };
  } catch {
    return {
      ...initialCreationMeta,
      deliverySelected: hasDraft || editing,
      informationMode: hasDraft || editing ? 'generated' : 'source',
    };
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatPrice(value: number) {
  return value === 0 ? '무료' : `${value.toLocaleString('ko-KR')}원`;
}

function sourceIsReady(meta: CreationMeta) {
  return (
    (meta.source === 'youtube' && meta.youtubeConnected) ||
    (meta.materials.length > 0 &&
      meta.materials.every((file) => file.status === 'uploaded' && Boolean(file.url)))
  );
}

function updateTextSelection(
  ref: RefObject<HTMLTextAreaElement>,
  value: string,
  onChange: (value: string) => void,
  kind: 'heading' | 'bold' | 'bullet' | 'number' | 'link',
) {
  const input = ref.current;
  if (!input) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const selected = value.slice(start, end);
  let next = value;
  let cursorStart = start;
  let cursorEnd = end;

  if (kind === 'bold' || kind === 'link') {
    const [prefix, suffix] = kind === 'bold' ? ['**', '**'] : ['[', '](https://)'];
    next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
    cursorStart = start + prefix.length;
    cursorEnd = cursorStart + selected.length;
  } else {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const prefix = kind === 'heading' ? '## ' : kind === 'bullet' ? '- ' : '1. ';
    next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
    cursorStart = start + prefix.length;
    cursorEnd = end + prefix.length;
  }

  onChange(next);
  requestAnimationFrame(() => {
    input.focus();
    input.setSelectionRange(cursorStart, cursorEnd);
  });
}

function focusCreatorField(field: FormField) {
  const root = document.querySelector<HTMLElement>(`[data-creator-field="${field}"]`);
  if (!root) return;
  const target = root.matches('button, input, textarea')
    ? root
    : root.querySelector<HTMLElement>('input, textarea, button');
  target?.focus();
}

export function CreateClassPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const requestedSource = params.get('source');
  const requestedStep = Math.min(4, Math.max(1, Number(params.get('step')) || 1));
  const [draft, setDraft] = useState<ClassDraft>(() => {
    const savedDraft = editId
      ? loadClassPreview(editId, initialClassDraft)
      : loadClassDraft(initialClassDraft);
    const savedThumbnail = editId ? getClassThumbnail(editId) : '';
    return {
      ...savedDraft,
      type: supportedType(savedDraft.type),
      thumbnail: savedThumbnail || savedDraft.thumbnail,
    };
  });
  const [meta, setMeta] = useState<CreationMeta>(() =>
    loadCreationMeta(
      Boolean(draft.title || draft.summary || draft.description),
      Boolean(editId),
      requestedSource,
    ),
  );
  const [step, setStep] = useState(() =>
    params.has('step') || editId ? requestedStep : meta.step,
  );
  const [maxStep, setMaxStep] = useState(() => (editId ? 4 : Math.max(step, meta.maxStep)));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [saveRetryToken, setSaveRetryToken] = useState(0);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [youtubeError, setYoutubeError] = useState('');
  const [sourceDragActive, setSourceDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(() =>
    Boolean(draft.startDate || draft.recruitEndDate),
  );
  const [query, setQuery] = useState('');
  const [editField, setEditField] = useState<EditableField | null>(null);
  const [highlightField, setHighlightField] = useState<EditableField | null>(null);
  const [scheduleEditValue, setScheduleEditValue] = useState<ScheduleEditValue>({
    date: '',
    time: '',
  });
  const [showPreviewHint, setShowPreviewHint] = useState(false);
  const [editLoading, setEditLoading] = useState(() => Boolean(editId && !hasClassPreview(editId)));
  const [editLoadError, setEditLoadError] = useState('');
  const [editReload, setEditReload] = useState(0);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('');
  const [thumbnailUploadStatus, setThumbnailUploadStatus] =
    useState<ThumbnailUploadStatus>('idle');
  const [thumbnailUploadError, setThumbnailUploadError] = useState('');
  const analysisAbort = useRef<AbortController>();
  const youtubeMetadataAbort = useRef<AbortController>();
  const saveTimer = useRef<number>();
  const inlineOriginal = useRef<Partial<ClassDraft>>({});
  const pendingThumbnailFile = useRef<File>();
  const thumbnailUploadToken = useRef(0);
  const sourceFiles = useRef(new Map<string, File>());
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const previewHelpButtonRef = useRef<HTMLButtonElement>(null);
  const addressReturnFocusRef = useRef<HTMLElement>();
  const informationDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const previewDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(draft);
  const metaRef = useRef(meta);
  const stepRef = useRef(step);
  const maxStepRef = useRef(maxStep);

  draftRef.current = draft;
  metaRef.current = meta;
  stepRef.current = step;
  maxStepRef.current = maxStep;

  const type = supportedType(draft.type);
  const typeOption = classTypeOptions.find((option) => option.value === type)!;
  const TypeIcon = typeIcons[type];
  const stepInfo = classCreationFlowSteps[step - 1];
  const progressPercent = Math.round(((step - 1) / (classCreationFlowSteps.length - 1)) * 100);
  const todayDateValue = localDateInputValue();
  const commitScheduleInlineEdit = useCallback(
    (restoreFocus = true) => {
      const scheduleError = getScheduleInputError(
        scheduleEditValue.date,
        scheduleEditValue.time,
      );
      if (scheduleError) {
        setFieldErrors((current) => ({ ...current, startDate: scheduleError }));
        return false;
      }

      setDraft((current) => ({
        ...current,
        startDate: combineClassSchedule(scheduleEditValue.date, scheduleEditValue.time),
      }));
      setFieldErrors((current) => {
        if (!current.startDate) return current;
        const next = { ...current };
        delete next.startDate;
        return next;
      });
      setEditField(null);
      if (restoreFocus) {
        requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>('[data-preview-field="startDate"] button')
            ?.focus();
        });
      }
      return true;
    },
    [scheduleEditValue],
  );
  const informationDescription =
    meta.informationMode === 'manual'
      ? '핵심 정보만 입력하면 공개 페이지에서 바로 다듬을 수 있어요.'
      : meta.informationMode === 'analyzing'
        ? '자료를 확인하고 클래스 구성을 만들고 있어요.'
        : meta.informationMode === 'generated'
          ? '초안이 준비됐어요. 공개 전에 필요한 부분만 확인해 주세요.'
          : type === 'online'
            ? '영상 하나면 충분해요. 제목과 소개는 자동으로 초안을 만들어 드려요.'
            : '가지고 있는 자료를 바탕으로 제목, 소개와 내용을 준비해 드려요.';
  const informationSourceLabel =
    meta.informationMode === 'manual'
      ? '직접 작성'
      : meta.source === 'youtube'
        ? 'YouTube 영상'
        : meta.source === 'video'
          ? '영상 파일'
          : meta.source === 'documents'
            ? `참고자료 ${meta.materials.length}개`
            : '자료 선택 전';
  const sourceCurriculumDraft = buildSourceCurriculum({
    kind: meta.source,
    classTitle: draft.title,
    classSummary: draft.summary,
    youtubeUrl: meta.youtubeConnected ? meta.youtubeUrl : undefined,
    youtubeTitle: meta.youtubeMetadata?.title,
    youtubeDurationSeconds: meta.youtubeMetadata?.durationSeconds,
    materials: meta.materials.map(({ name, url, durationSeconds }) => ({
      name,
      url,
      durationSeconds,
    })),
  });
  const willPublish = Boolean(editId || sourceCurriculumDraft.lessons.length);
  const InformationIcon =
    meta.informationMode === 'manual'
      ? Pencil
      : meta.informationMode === 'generated'
        ? Sparkles
        : meta.informationMode === 'analyzing'
          ? LoaderCircle
          : meta.informationMode === 'analysis-error'
            ? CircleAlert
            : meta.source === 'youtube'
              ? Play
              : meta.source === 'video'
                ? Video
                : meta.source === 'documents'
                  ? FileText
                  : Upload;
  const shareUrl = useMemo(
    () =>
      meta.shareToken
        ? `${typeof window === 'undefined' ? 'https://oneclickclass.kr' : window.location.origin}/s/${meta.shareToken}`
        : '',
    [meta.shareToken],
  );
  const persistDraftSnapshot = useCallback(() => {
    if (editLoading || stepRef.current === 5) return true;
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = undefined;
    }
    try {
      if (editId) saveClassPreview(editId, draftRef.current);
      else saveClassDraft(draftRef.current);
      sessionStorage.setItem(
        CLASS_CREATION_META_KEY,
        JSON.stringify({
          ...metaRef.current,
          step: stepRef.current,
          maxStep: maxStepRef.current,
        }),
      );
      setSaveStatus('saved');
      return true;
    } catch {
      setSaveStatus('error');
      return false;
    }
  }, [editId, editLoading]);

  useEffect(() => {
    if (!editId || hasClassPreview(editId)) return;
    let alive = true;
    setEditLoading(true);
    setEditLoadError('');
    Promise.all([classService.get(editId), detailService.getClass(editId)])
      .then(([item, detail]) => {
        if (!alive) return;
        const nextDraft = editDraftFromClass(item, detail);
        setDraft(nextDraft);
        setMeta((current) => ({
          ...current,
          deliverySelected: true,
          informationMode: 'generated',
          createdId: editId,
        }));
        saveClassPreview(editId, nextDraft);
      })
      .catch(() => alive && setEditLoadError('클래스 정보를 불러오지 못했어요.'))
      .finally(() => alive && setEditLoading(false));
    return () => {
      alive = false;
    };
  }, [editId, editReload]);

  useEffect(() => {
    if (editLoading || step === 5) return;
    setSaveStatus('saving');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(persistDraftSnapshot, 500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [draft, editLoading, maxStep, meta, persistDraftSnapshot, saveRetryToken, step]);

  useEffect(() => {
    const saveBeforeUnload = () => {
      persistDraftSnapshot();
    };
    window.addEventListener('beforeunload', saveBeforeUnload);
    return () => window.removeEventListener('beforeunload', saveBeforeUnload);
  }, [persistDraftSnapshot]);

  useEffect(
    () => () => {
      persistDraftSnapshot();
    },
    [persistDraftSnapshot],
  );

  useEffect(() => {
    if (!editField) return;
    const finishEditOutside = (event: PointerEvent) => {
      const fieldRoot = document.querySelector<HTMLElement>(`[data-preview-field="${editField}"]`);
      const target = event.target as Node | null;
      if (!target || fieldRoot?.contains(target)) return;
      if ((target as Element).closest?.('.creator-address-dialog')) return;
      if (editField === 'startDate') {
        commitScheduleInlineEdit(false);
        return;
      }
      setEditField(null);
    };
    document.addEventListener('pointerdown', finishEditOutside);
    return () => document.removeEventListener('pointerdown', finishEditOutside);
  }, [commitScheduleInlineEdit, editField]);

  useEffect(
    () => () => {
      analysisAbort.current?.abort();
      youtubeMetadataAbort.current?.abort();
    },
    [],
  );

  useEffect(
    () => () => {
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    },
    [thumbnailPreviewUrl],
  );

  function selectType(nextType: SupportedClassType) {
    if (meta.deliverySelected && type === nextType) return;
    analysisAbort.current?.abort();
    youtubeMetadataAbort.current?.abort();
    sourceFiles.current.clear();
    const hasWrittenInformation = Boolean(
      draft.title.trim() || draft.summary.trim() || draft.description.trim(),
    );
    setDraft((current) => ({
      ...current,
      type: nextType,
      capacity: nextType === 'online' ? current.capacity : current.capacity || 20,
    }));
    setMeta((current) => ({
      ...current,
      deliverySelected: true,
      source: 'none',
      youtubeUrl: '',
      youtubeVideoId: '',
      youtubeConnected: false,
      youtubeMetadata: undefined,
      materials: [],
      informationMode: hasWrittenInformation ? 'manual' : 'source',
    }));
    setError('');
  }

  async function startAnalysis() {
    if (!sourceIsReady(meta)) {
      setError('분석할 영상이나 자료를 먼저 등록해 주세요.');
      return;
    }
    analysisAbort.current?.abort();
    const controller = new AbortController();
    analysisAbort.current = controller;
    setError('');
    setMeta((current) => ({ ...current, informationMode: 'analyzing' }));
    try {
      const result = await classService.analyzeSource(
        {
          type,
          source: {
            kind: meta.source === 'none' ? 'documents' : meta.source,
            youtubeUrl: meta.source === 'youtube' ? meta.youtubeUrl : undefined,
            materials: meta.materials.map((file) => ({
              url: file.url!,
              name: file.name,
              type: file.type,
              size: file.size,
              durationSeconds: file.durationSeconds,
            })),
          },
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setDraft((current) => {
        return {
          ...current,
          title: current.title.trim() || result.title,
          summary: current.summary.trim() || result.summary,
          description: current.description.trim() || result.description,
        };
      });
      setMeta((current) => ({
        ...current,
        informationMode: 'generated',
        youtubeMetadata: result.sourceMetadata
          ? { ...current.youtubeMetadata, ...result.sourceMetadata }
          : current.youtubeMetadata,
      }));
    } catch {
      if (controller.signal.aborted) return;
      setMeta((current) => ({ ...current, informationMode: 'analysis-error' }));
    }
  }

  function chooseManualMode() {
    analysisAbort.current?.abort();
    setMeta((current) => ({ ...current, informationMode: 'manual' }));
    setError('');
  }

  function resetSource() {
    analysisAbort.current?.abort();
    youtubeMetadataAbort.current?.abort();
    sourceFiles.current.clear();
    setMeta((current) => ({
      ...current,
      source: 'none',
      youtubeUrl: '',
      youtubeVideoId: '',
      youtubeConnected: false,
      youtubeMetadata: undefined,
      materials: [],
      informationMode: 'source',
    }));
    setYoutubeError('');
    setError('');
  }

  async function connectYouTube() {
    const videoId = getYouTubeVideoId(meta.youtubeUrl);
    if (!isValidYouTubeUrl(meta.youtubeUrl) || !videoId) {
      setYoutubeError('올바른 YouTube 영상 주소를 입력해 주세요.');
      return;
    }
    setYoutubeError('');
    youtubeMetadataAbort.current?.abort();
    const controller = new AbortController();
    youtubeMetadataAbort.current = controller;
    sourceFiles.current.clear();
    setMeta((current) => ({
      ...current,
      source: 'youtube',
      youtubeVideoId: videoId,
      youtubeConnected: true,
      youtubeMetadata: {
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      },
      materials: [],
      informationMode: 'source',
    }));
    try {
      const metadata = await classService.inspectYouTube(meta.youtubeUrl, videoId, controller.signal);
      if (controller.signal.aborted) return;
      setMeta((current) => ({ ...current, youtubeMetadata: metadata }));
    } catch {
      if (controller.signal.aborted) return;
      setMeta((current) => ({
        ...current,
        youtubeMetadata: {
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        },
      }));
    }
  }

  function updateMaterial(id: string, update: Partial<UploadedMaterial>) {
    setMeta((current) => ({
      ...current,
      materials: current.materials.map((file) => (file.id === id ? { ...file, ...update } : file)),
    }));
  }

  async function uploadMaterial(id: string, file: File) {
    updateMaterial(id, { status: 'uploading', progress: undefined });
    try {
      const uploaded = await classService.uploadFile(file, (progress) =>
        updateMaterial(id, { progress }),
      );
      updateMaterial(id, {
        status: 'uploaded',
        progress: 100,
        url: uploaded.url,
        name: uploaded.name || file.name,
        type: uploaded.type || file.type,
        size: uploaded.size ?? file.size,
      });
      return true;
    } catch {
      updateMaterial(id, { status: 'error', progress: undefined });
      return false;
    }
  }

  async function handleSourceFiles(selected: File[]) {
    if (!selected.length) return;

    const files = type === 'online' ? selected.slice(0, 1) : selected;
    const invalid = files.find((file) => {
      if (type === 'online') {
        return (
          !isSupportedClassSourceFile(file, 'video') ||
          file.size > classCreationLimits.videoBytes
        );
      }
      return (
        !isSupportedClassSourceFile(file, 'document') ||
        file.size > classCreationLimits.documentBytes
      );
    });
    if (invalid) {
      setError(
        type === 'online'
          ? `${classCreationFileTypes.video.label} 형식의 2GB 이하 영상 파일을 등록해 주세요.`
          : `${classCreationFileTypes.document.label} 형식의 50MB 이하 파일을 등록해 주세요.`,
      );
      return;
    }

    analysisAbort.current?.abort();
    youtubeMetadataAbort.current?.abort();
    sourceFiles.current.clear();
    const materials = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type || file.name.split('.').pop()?.toUpperCase() || 'FILE',
      size: file.size,
      status: 'uploading' as const,
    }));
    materials.forEach((material, index) => sourceFiles.current.set(material.id, files[index]));
    setMeta((current) => ({
      ...current,
      source: type === 'online' ? 'video' : 'documents',
      youtubeVideoId: '',
      youtubeConnected: false,
      youtubeMetadata: undefined,
      youtubeUrl: '',
      materials,
      informationMode: 'source',
    }));
    setError('');

    if (type === 'online') {
      void readVideoDuration(files[0]).then((durationSeconds) => {
        if (durationSeconds) updateMaterial(materials[0].id, { durationSeconds });
      });
    }

    const results = await Promise.all(
      files.map((file, index) => uploadMaterial(materials[index].id, file)),
    );
    if (results.some((uploaded) => !uploaded)) {
      setError('일부 파일을 업로드하지 못했어요. 실패한 파일을 다시 업로드해 주세요.');
    }
  }

  function addSourceFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';
    void handleSourceFiles(selected);
  }

  async function retryMaterial(file: UploadedMaterial) {
    const originalFile = sourceFiles.current.get(file.id);
    if (!originalFile) {
      removeMaterial(file.id);
      requestAnimationFrame(() => sourceFileInputRef.current?.click());
      return;
    }
    setError('');
    const uploaded = await uploadMaterial(file.id, originalFile);
    if (!uploaded) setError('파일을 다시 업로드하지 못했어요. 네트워크 상태를 확인해 주세요.');
  }

  function removeMaterial(id: string) {
    sourceFiles.current.delete(id);
    setMeta((current) => {
      const materials = current.materials.filter((file) => file.id !== id);
      return {
        ...current,
        materials,
        source: materials.length ? current.source : 'none',
        informationMode: 'source',
      };
    });
  }

  function getInformationErrors(): FieldErrors {
    const errors: FieldErrors = {};
    if (!draft.title.trim()) errors.title = '클래스 제목을 입력해 주세요.';
    if (!draft.summary.trim()) errors.summary = '클래스 소개를 입력해 주세요.';
    else if (draft.summary.trim().length < 10)
      errors.summary = '클래스 소개를 10자 이상 입력해 주세요.';
    if (!draft.description.trim()) errors.description = '클래스 내용을 입력해 주세요.';
    else if (draft.description.trim().length < 20)
      errors.description = '클래스 내용을 20자 이상 입력해 주세요.';
    return errors;
  }

  function getSettingsErrors(): FieldErrors {
    const errors: FieldErrors = {};
    if (
      !Number.isInteger(draft.price) ||
      draft.price < 0 ||
      draft.price > classCreationLimits.price
    ) {
      errors.price = '가격은 0원 이상 1억원 이하의 숫자로 입력해 주세요.';
    }
    if (
      type !== 'online' &&
      (!Number.isInteger(draft.capacity) ||
        draft.capacity < 1 ||
        draft.capacity > classCreationLimits.capacity)
    ) {
      errors.capacity = '참가인원은 1명 이상 10,000명 이하로 입력해 주세요.';
    }
    if (type !== 'online') {
      const scheduleError = getScheduleInputError(
        scheduleDateValue(draft.startDate),
        scheduleTimeValue(draft.startDate),
        Boolean(draft.startDate),
      );
      if (scheduleError) errors.startDate = scheduleError;
    }
    if (type !== 'online' && draft.recruitEndDate && !scheduleDateValue(draft.startDate)) {
      errors.recruitEndDate = '모집 마감일을 설정하려면 시작 일정을 먼저 입력해 주세요.';
    }
    if (draft.recruitEndDate && draft.recruitEndDate < todayDateValue) {
      errors.recruitEndDate = '모집 마감일은 오늘 이후로 선택해 주세요.';
    }
    if (
      draft.recruitEndDate &&
      scheduleDateValue(draft.startDate) &&
      draft.recruitEndDate > scheduleDateValue(draft.startDate)
    ) {
      errors.recruitEndDate = '모집 마감일은 클래스 시작일 이전으로 선택해 주세요.';
    }
    if (type === 'offline' && !draft.address.trim()) {
      errors.address = '오프라인 클래스가 열릴 주소를 입력해 주세요.';
    }
    return errors;
  }

  function firstErrorMessage(errors: FieldErrors, order: FormField[]) {
    const first = order.find((field) => errors[field]);
    return first ? (errors[first] ?? '') : '';
  }

  function showFieldErrors(errors: FieldErrors, order: FormField[]) {
    setFieldErrors(errors);
    const first = order.find((field) => errors[field]);
    if (!first) return false;
    if (first === 'startDate' || first === 'recruitEndDate') setScheduleOpen(true);
    requestAnimationFrame(() => focusCreatorField(first));
    return true;
  }

  function clearFieldError(field: FormField) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function goToStep(nextStep: number) {
    if (nextStep < 1 || nextStep > maxStep || nextStep === 5) return;
    setError('');
    setFieldErrors({});
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function submitFlow(event: FormEvent) {
    event.preventDefault();
    if (step === 1) {
      if (!meta.deliverySelected) return setError('클래스 진행 방식을 선택해 주세요.');
    }
    if (step === 2) {
      if (showFieldErrors(getInformationErrors(), ['title', 'summary', 'description'])) return;
    }
    if (step === 3) {
      if (
        showFieldErrors(getSettingsErrors(), [
          'capacity',
          'address',
          'price',
          'startDate',
          'recruitEndDate',
        ])
      )
        return;
    }
    if (step < 4) {
      const nextStep = step + 1;
      setError('');
      setFieldErrors({});
      setMaxStep((current) => Math.max(current, nextStep));
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (thumbnailUploadStatus === 'uploading') {
      setError('커버 이미지 업로드가 끝난 뒤 클래스를 게시해 주세요.');
      return;
    }
    if (thumbnailUploadStatus === 'error') {
      setError('커버 이미지 업로드를 다시 시도한 뒤 클래스를 게시해 주세요.');
      return;
    }

    const informationErrors = getInformationErrors();
    const settingsErrors = getSettingsErrors();
    const informationError = firstErrorMessage(informationErrors, [
      'title',
      'summary',
      'description',
    ]);
    if (informationError) {
      const field: EditableField = informationErrors.title
        ? 'title'
        : informationErrors.summary
          ? 'summary'
          : 'description';
      setError(informationError);
      setHighlightField(field);
      requestAnimationFrame(() => {
        document.querySelector(`[data-preview-field="${field}"]`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
      return;
    }

    const settingsError = firstErrorMessage(settingsErrors, [
      'capacity',
      'address',
      'price',
      'startDate',
      'recruitEndDate',
    ]);
    if (settingsError) {
      const settingsOrder: FormField[] = [
        'capacity',
        'address',
        'price',
        'startDate',
        'recruitEndDate',
      ];
      const first = settingsOrder.find((field) => settingsErrors[field]);
      setFieldErrors(settingsErrors);
      if (first === 'startDate' || first === 'recruitEndDate') setScheduleOpen(true);
      setError('');
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      requestAnimationFrame(() => {
        if (!first) return;
        focusCreatorField(first);
      });
      return;
    }

    setError('');
    setPublishConfirmOpen(true);
  }

  async function ensureSourceCurriculum(classId: string) {
    if (!sourceCurriculumDraft.lessons.length) return false;

    let sections = await curriculumService.list(classId);
    const sourceUrls = new Set(sourceCurriculumDraft.lessons.map((lesson) => lesson.contentUrl));
    const existingUrls = new Set(
      sections.flatMap((section) => section.lessons.map((lesson) => lesson.contentUrl)),
    );
    if ([...sourceUrls].every((url) => existingUrls.has(url))) return true;

    let targetSection = sections.find((section) =>
      section.lessons.some((lesson) => sourceUrls.has(lesson.contentUrl)),
    );
    if (!targetSection) {
      targetSection = sections.find(
        (section) => section.title === sourceCurriculumDraft.sectionTitle,
      );
    }
    if (!targetSection) {
      const existingSectionIds = new Set(sections.map((section) => section.id));
      sections = await curriculumService.createSection(
        classId,
        sourceCurriculumDraft.sectionTitle,
      );
      targetSection =
        sections.find((section) => !existingSectionIds.has(section.id)) ??
        sections.find((section) => section.title === sourceCurriculumDraft.sectionTitle);
    }
    if (!targetSection) throw new Error('source curriculum section was not created');

    for (const lesson of sourceCurriculumDraft.lessons) {
      if (existingUrls.has(lesson.contentUrl)) continue;
      sections = await curriculumService.createLesson(classId, targetSection.id, lesson);
      existingUrls.add(lesson.contentUrl);
      targetSection = sections.find((section) => section.id === targetSection?.id) ?? targetSection;
    }
    return true;
  }

  async function publishClass() {
    setSubmitting(true);
    setError('');
    let stage: 'saving' | 'curriculum' | 'publishing' = 'saving';
    try {
      const createdId = editId || meta.createdId;
      const created = createdId
        ? await classService.update(createdId, draft)
        : await classService.create(draft);
      setMeta((current) => ({ ...current, createdId: created.id }));
      if (draft.thumbnail) saveClassThumbnail(created.id, draft.thumbnail);
      saveClassPreview(created.id, draft);
      stage = 'curriculum';
      const hasSourceCurriculum = editId ? false : await ensureSourceCurriculum(created.id);
      let shareToken = '';
      if (editId || hasSourceCurriculum) {
        stage = 'publishing';
        const published = await classService.publish(created.id);
        shareToken = published.shareToken;
      }
      const nextMeta = {
        ...metaRef.current,
        createdId: created.id,
        shareToken,
      };
      setMeta(nextMeta);
      sessionStorage.setItem(
        CLASS_CREATION_META_KEY,
        JSON.stringify(nextMeta),
      );
      setSaveStatus('saved');
      setMaxStep(5);
      setStep(5);
      setPublishConfirmOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setPublishConfirmOpen(false);
      setError(
        stage === 'curriculum'
          ? '첫 차시를 준비하지 못했어요. 기본 정보는 저장되어 있으니 다시 시도해 주세요.'
          : stage === 'publishing'
            ? '클래스를 게시하지 못했어요. 첫 차시는 저장되어 있으니 다시 시도해 주세요.'
            : '클래스 기본 정보를 저장하지 못했어요. 입력 내용은 유지되니 다시 시도해 주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadThumbnail(file: File) {
    const token = thumbnailUploadToken.current + 1;
    thumbnailUploadToken.current = token;
    const optimized = await optimizeClassThumbnail(file);
    if (token !== thumbnailUploadToken.current) return;

    pendingThumbnailFile.current = optimized;
    setThumbnailPreviewUrl(URL.createObjectURL(optimized));
    setThumbnailUploadStatus('uploading');
    setThumbnailUploadError('');
    try {
      const uploaded = await classService.uploadImage(optimized);
      if (token !== thumbnailUploadToken.current) return;
      setDraft((current) => ({ ...current, thumbnail: uploaded.url }));
      pendingThumbnailFile.current = undefined;
      setThumbnailPreviewUrl('');
      setThumbnailUploadStatus('idle');
      setError('');
    } catch {
      if (token !== thumbnailUploadToken.current) return;
      setThumbnailUploadStatus('error');
      setThumbnailUploadError('커버 이미지를 업로드하지 못했어요. 다시 시도해 주세요.');
    }
  }

  function addThumbnail(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > classCreationLimits.thumbnailBytes
    ) {
      setError('썸네일은 JPG, PNG, WEBP 형식의 5MB 이하 파일만 가능해요.');
      return;
    }
    setError('');
    void uploadThumbnail(file);
  }

  function finishInlineEdit(field: EditableField) {
    if (field === 'startDate') {
      commitScheduleInlineEdit();
      return;
    }
    setEditField(null);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-preview-field="${field}"] button`)
        ?.focus();
    });
  }

  function startInlineEdit(field: EditableField) {
    if (field === 'startDate') {
      setScheduleEditValue({
        date: scheduleDateValue(draft.startDate),
        time: scheduleTimeValue(draft.startDate),
      });
    } else {
      inlineOriginal.current = { ...inlineOriginal.current, [field]: draft[field] };
    }
    setHighlightField(null);
    setEditField(field);
  }

  function cancelInlineEdit(field: EditableField) {
    if (field === 'startDate') {
      clearFieldError('startDate');
      setEditField(null);
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>('[data-preview-field="startDate"] button')
          ?.focus();
      });
      return;
    }
    const previous = inlineOriginal.current[field];
    if (previous !== undefined) {
      setDraft((current) => ({ ...current, [field]: previous }));
    }
    finishInlineEdit(field);
  }

  function openAddressDialog() {
    addressReturnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    setAddressOpen(true);
  }

  function closeAddressDialog() {
    setAddressOpen(false);
    requestAnimationFrame(() => addressReturnFocusRef.current?.focus());
  }

  function dismissPreviewHint() {
    setShowPreviewHint(false);
    requestAnimationFrame(() => previewHelpButtonRef.current?.focus());
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('링크를 복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.');
    }
  }

  function leaveCreator(target: string) {
    if (!persistDraftSnapshot()) {
      setError('마지막 변경 내용을 저장하지 못했어요. 다시 저장한 뒤 나가 주세요.');
      return;
    }
    nav(target);
  }

  function restart() {
    clearClassDraft();
    sessionStorage.removeItem(CLASS_CREATION_META_KEY);
    setDraft(initialClassDraft);
    setMeta(initialCreationMeta);
    setStep(1);
    setMaxStep(1);
    setError('');
    nav('/classes/new', { replace: true });
  }

  if (editLoading) {
    return (
      <main className="create-load-state">
        <section aria-label="클래스 정보 불러오는 중">
          <Skeleton lines={5} />
        </section>
      </main>
    );
  }

  if (editLoadError) {
    return (
      <main className="create-load-state">
        <EmptyState
          title={editLoadError}
          description="잠시 후 다시 시도하거나 클래스 상세 화면으로 돌아가 주세요."
          action={
            <div className="create-load-actions">
              <Button variant="secondary" onClick={() => nav(`/classes/${editId}`)}>
                상세로 돌아가기
              </Button>
              <Button onClick={() => setEditReload((value) => value + 1)}>다시 시도</Button>
            </div>
          }
        />
      </main>
    );
  }

  return (
    <main className={`class-creator ${step === 4 ? 'is-preview-step' : ''}`}>
      <header className="creator-progress">
        <button className="creator-brand" type="button" onClick={() => leaveCreator('/dashboard')}>
          <span aria-hidden="true">
            <Check />
          </span>
          <strong>원클릭 클래스</strong>
        </button>
        <nav className="creator-progress-inner" aria-label="클래스 만들기 진행률">
          <div className="creator-progress-copy">
            <span>{stepInfo.label}</span>
          </div>
          <div
            className="creator-progress-track"
            role="progressbar"
            aria-label="클래스 만들기 진행률"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-valuetext={`${stepInfo.label} 진행 중`}
          >
            <span style={{ transform: `scaleX(${progressPercent / 100})` }} />
          </div>
        </nav>
        <button className="creator-exit" type="button" onClick={() => leaveCreator('/classes')}>
          나가기
        </button>
      </header>

      <div className={`creator-save-status ${saveStatus}`} role="status" aria-live="polite">
        {saveStatus === 'error' ? (
          <button
            type="button"
            onClick={() => {
              setSaveStatus('saving');
              setSaveRetryToken((current) => current + 1);
            }}
          >
            <CircleAlert />
            저장 실패 · 다시 시도
          </button>
        ) : (
          <>
            {saveStatus === 'saving' ? <LoaderCircle className="spin" /> : <Check />}
            {saveStatus === 'saving' ? '저장 중...' : '저장됨'}
          </>
        )}
      </div>

      <form className="creator-form" onSubmit={submitFlow}>
        {step < 5 && (
          <header
            className={`creator-step-heading ${step === 1 ? 'is-wide' : ''} ${
              step === 3 ? 'is-compact' : ''
            }`}
          >
            <h1>{stepInfo.title}</h1>
            <p>{step === 2 ? informationDescription : stepInfo.description}</p>
          </header>
        )}

        {step > 1 && step < 4 && (
          <dl
            className={`creator-context ${step === 3 ? 'is-compact' : ''}`}
            aria-label="현재 클래스 설정"
          >
            <div className="creator-context-item">
              <i aria-hidden="true">
                <TypeIcon />
              </i>
              <span>
                <dt>진행 방식</dt>
                <dd>{typeOption.label}</dd>
              </span>
            </div>
            <div className="creator-context-item">
              <i aria-hidden="true">
                <InformationIcon
                  className={meta.informationMode === 'analyzing' ? 'spin' : undefined}
                />
              </i>
              <span>
                <dt>정보 준비</dt>
                <dd>{informationSourceLabel}</dd>
              </span>
            </div>
          </dl>
        )}

        {step === 1 && (
          <section className="class-type-grid" aria-label="클래스 진행 방식">
            {classTypeOptions.map((option) => {
              const Icon = typeIcons[option.value];
              const selected = meta.deliverySelected && type === option.value;
              return (
                <button
                  type="button"
                  className={selected ? 'selected' : ''}
                  aria-pressed={selected}
                  onClick={() => selectType(option.value)}
                  key={option.value}
                >
                  <i>
                    <Icon />
                  </i>
                  <span>
                    <b>{option.label}</b>
                    <strong>{option.description}</strong>
                    <small>{option.detail}</small>
                  </span>
                  <em>{selected ? <Check /> : <ChevronRight />}</em>
                </button>
              );
            })}
          </section>
        )}

        {step === 2 && (
          <section className="creator-information">
            {meta.informationMode === 'source' && (
              <>
                {type === 'online' ? (
                  <div className="source-card">
                    <div className="source-card-title">
                      <i>
                        <Play />
                      </i>
                      <span>
                        <h2>YouTube 영상 연결</h2>
                        <p>공개 또는 일부 공개 영상 주소를 붙여 넣어 주세요.</p>
                      </span>
                    </div>
                    <div className={`youtube-input ${youtubeError ? 'invalid' : ''}`}>
                      <Link2 />
                      <label>
                        <span className="sr-only">YouTube URL</span>
                        <input
                          value={meta.youtubeUrl}
                          onChange={(event) => {
                            setMeta((current) => ({
                              ...current,
                              youtubeUrl: event.target.value,
                              youtubeVideoId: '',
                              youtubeConnected: false,
                              youtubeMetadata: undefined,
                            }));
                            setYoutubeError('');
                          }}
                          placeholder="https://www.youtube.com/watch?v=..."
                          aria-invalid={Boolean(youtubeError)}
                        />
                      </label>
                      <button type="button" onClick={() => void connectYouTube()}>
                        영상 불러오기
                      </button>
                    </div>
                    {youtubeError && (
                      <p className="field-message error">
                        <CircleAlert />
                        {youtubeError}
                      </p>
                    )}
                    {meta.youtubeConnected && (
                      <article className="connected-video">
                        <div>
                          <Play />
                          {meta.youtubeMetadata?.thumbnailUrl && (
                            <img
                              src={meta.youtubeMetadata.thumbnailUrl}
                              alt="연결한 YouTube 영상 썸네일"
                              onError={(event) => {
                                event.currentTarget.hidden = true;
                              }}
                            />
                          )}
                        </div>
                        <span>
                          <small>YouTube · 연결 완료</small>
                          <b>{meta.youtubeMetadata?.title || '연결한 YouTube 영상'}</b>
                          <em>
                            {[
                              meta.youtubeMetadata?.channel,
                              meta.youtubeMetadata?.durationSeconds
                                ? formatMediaDuration(meta.youtubeMetadata.durationSeconds)
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' · ') || '상세 영상 정보는 분석할 때 함께 확인해요'}
                          </em>
                        </span>
                        <Check />
                      </article>
                    )}
                  </div>
                ) : (
                  <div className="source-intro">
                    <Sparkles />
                    <span>
                      <b>가지고 있는 강의 자료를 올려주세요</b>
                      <p>여러 파일을 한 번에 올려도 괜찮아요.</p>
                    </span>
                  </div>
                )}

                {type === 'online' && (
                  <div className="source-divider">
                    <span>또는</span>
                  </div>
                )}

                <label
                  className={`material-dropzone ${meta.youtubeConnected ? 'is-replace' : ''} ${
                    sourceDragActive ? 'is-dragging' : ''
                  }`}
                  onDragOver={(event: DragEvent<HTMLLabelElement>) => {
                    event.preventDefault();
                    setSourceDragActive(true);
                  }}
                  onDragLeave={(event: DragEvent<HTMLLabelElement>) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                    setSourceDragActive(false);
                  }}
                  onDrop={(event: DragEvent<HTMLLabelElement>) => {
                    event.preventDefault();
                    setSourceDragActive(false);
                    void handleSourceFiles(Array.from(event.dataTransfer.files));
                  }}
                >
                  <input
                    ref={sourceFileInputRef}
                    type="file"
                    accept={
                      type === 'online'
                        ? classCreationFileTypes.video.accept
                        : classCreationFileTypes.document.accept
                    }
                    multiple={type !== 'online'}
                    onChange={addSourceFiles}
                  />
                  <i>
                    <Upload />
                  </i>
                  <b>
                    {type === 'online'
                      ? '영상 파일을 끌어놓거나 클릭해 업로드하세요'
                      : 'PDF, PPT, 문서 또는 이미지를 끌어놓으세요'}
                  </b>
                  <span>
                    {type === 'online'
                      ? `${classCreationFileTypes.video.label} · 최대 2GB`
                      : '파일당 최대 50MB · 여러 파일 선택 가능'}
                  </span>
                  {meta.youtubeConnected && <em>새 영상을 등록하면 YouTube 연결을 교체합니다</em>}
                </label>

                {meta.materials.length > 0 && (
                  <div className="material-list" aria-label="업로드된 자료">
                    {meta.materials.map((file) => (
                      <article key={file.id}>
                        <i>{type === 'online' ? <Video /> : <FileText />}</i>
                        <span>
                          <b>{file.name}</b>
                          <small>
                            {formatBytes(file.size)} ·{' '}
                            {file.status === 'uploading'
                              ? file.progress === undefined
                                ? '업로드 중'
                                : `업로드 중 ${file.progress}%`
                              : file.status === 'uploaded'
                                ? '업로드 완료'
                                : '업로드 실패'}
                            {file.durationSeconds
                              ? ` · 재생 시간 ${formatMediaDuration(file.durationSeconds)}`
                              : ''}
                          </small>
                          {file.status === 'uploading' && (
                            <em
                              className={`upload-progress ${
                                file.progress === undefined ? 'indeterminate' : ''
                              }`}
                              aria-label={
                                file.progress === undefined
                                  ? `${file.name} 업로드 중`
                                  : `${file.name} 업로드 ${file.progress}%`
                              }
                            >
                              <span
                                style={
                                  file.progress === undefined
                                    ? undefined
                                    : { transform: `scaleX(${file.progress / 100})` }
                                }
                              />
                            </em>
                          )}
                        </span>
                        {file.status === 'uploaded' ? (
                          <Check className="success" />
                        ) : file.status === 'error' ? (
                          <button
                            className="material-retry"
                            type="button"
                            onClick={() => void retryMaterial(file)}
                          >
                            <RefreshCw />
                            <span>다시 업로드</span>
                          </button>
                        ) : (
                          <LoaderCircle className="spin" />
                        )}
                        <button
                          type="button"
                          aria-label={`${file.name} 삭제`}
                          onClick={() => removeMaterial(file.id)}
                        >
                          <X />
                        </button>
                      </article>
                    ))}
                  </div>
                )}

                {sourceIsReady(meta) && (
                  <button
                    className="analyze-source-button"
                    type="button"
                    onClick={() => void startAnalysis()}
                  >
                    <Sparkles />이 자료로 클래스 정보 만들기
                  </button>
                )}
                <button className="manual-entry-button" type="button" onClick={chooseManualMode}>
                  자료 없이 직접 작성하기
                  <ChevronRight />
                </button>
              </>
            )}

            {meta.informationMode === 'analyzing' && (
              <AnalysisProgress
                sourceLabel={
                  meta.source === 'youtube' ? 'YouTube 영상' : `${meta.materials.length}개 자료`
                }
              />
            )}

            {meta.informationMode === 'analysis-error' && (
              <div className="analysis-error" role="alert">
                <i>
                  <CircleAlert />
                </i>
                <h2>자료를 확인하지 못했어요</h2>
                <p>파일 형식이나 네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
                <div>
                  <button
                    type="button"
                    onClick={() => void startAnalysis()}
                    disabled={!sourceIsReady(meta)}
                  >
                    <RefreshCw />
                    다시 시도
                  </button>
                  <button type="button" onClick={resetSource}>
                    다른 자료 등록
                  </button>
                  <button type="button" onClick={chooseManualMode}>
                    직접 작성
                  </button>
                </div>
              </div>
            )}

            {(meta.informationMode === 'manual' || meta.informationMode === 'generated') && (
              <div className="information-editor">
                <div className="information-basics">
                  <TextField
                    field="title"
                    label="클래스 제목"
                    value={draft.title}
                    error={fieldErrors.title}
                    maxLength={classCreationLimits.title}
                    placeholder="예) 처음 시작하는 React 웹 개발"
                    onChange={(title) => {
                      clearFieldError('title');
                      setDraft((current) => ({ ...current, title }));
                    }}
                  />
                  <TextAreaField
                    field="summary"
                    label="클래스 소개"
                    value={draft.summary}
                    error={fieldErrors.summary}
                    maxLength={classCreationLimits.summary}
                    placeholder="어떤 분을 위한 클래스인지 짧게 소개해 주세요."
                    onChange={(summary) => {
                      clearFieldError('summary');
                      setDraft((current) => ({ ...current, summary }));
                    }}
                  />
                </div>
                <RichTextEditor
                  textareaRef={informationDescriptionRef}
                  value={draft.description}
                  error={fieldErrors.description}
                  onChange={(description) => {
                    clearFieldError('description');
                    setDraft((current) => ({ ...current, description }));
                  }}
                />
                <div className="information-footer">
                  <div className="information-ready">
                    <i>{meta.informationMode === 'generated' ? <Sparkles /> : <Pencil />}</i>
                    <span>
                      <b>
                        {meta.informationMode === 'generated'
                          ? '클래스 정보 초안을 준비했어요'
                          : draft.title || draft.summary || draft.description
                            ? '작성한 클래스 정보를 이어서 편집해 주세요'
                            : '클래스 정보를 직접 작성해 주세요'}
                      </b>
                      <p>모든 내용은 지금 수정할 수 있고 자동으로 저장됩니다.</p>
                    </span>
                  </div>
                  <button
                    className="information-source-reset"
                    type="button"
                    onClick={resetSource}
                  >
                    <RefreshCw />
                    자료 다시 선택
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className={`settings-panel ${type}`}>
            <article className="setting-card">
              <div className="setting-card-heading">
                <i>
                  <WalletCards />
                </i>
                <span>
                  <h2>참가비</h2>
                  <p>0원을 입력하면 무료 클래스로 표시됩니다.</p>
                </span>
                <em className={draft.price === 0 ? 'free' : ''}>{formatPrice(draft.price)}</em>
              </div>
              <label className="number-field" data-creator-field="price">
                <span>금액</span>
                <div>
                  <input
                    aria-label="참가비"
                    aria-invalid={Boolean(fieldErrors.price)}
                    aria-describedby={fieldErrors.price ? 'price-error' : undefined}
                    inputMode="numeric"
                    value={draft.price ? draft.price.toLocaleString('ko-KR') : '0'}
                    onChange={(event) => {
                      clearFieldError('price');
                      const value = Number(event.target.value.replace(/\D/g, ''));
                      setDraft((current) => ({
                        ...current,
                        price: Math.min(value, classCreationLimits.price),
                        payment: value > 0 ? 'paid' : 'free',
                      }));
                    }}
                  />
                  <b>원</b>
                </div>
              </label>
              {fieldErrors.price && (
                <p className="field-message error" id="price-error">
                  <CircleAlert />
                  {fieldErrors.price}
                </p>
              )}
            </article>

            {type !== 'online' && (
              <article className="setting-card">
                <div className="setting-card-heading">
                  <i>
                    <Users />
                  </i>
                  <span>
                    <h2>참가인원</h2>
                    <p>신청 가능한 최대 인원을 입력해 주세요.</p>
                  </span>
                </div>
                <label className="number-field" data-creator-field="capacity">
                  <span>최대 인원</span>
                  <div>
                    <input
                      aria-label="참가인원"
                      aria-invalid={Boolean(fieldErrors.capacity)}
                      aria-describedby={fieldErrors.capacity ? 'capacity-error' : undefined}
                      inputMode="numeric"
                      value={draft.capacity}
                      onChange={(event) => {
                        clearFieldError('capacity');
                        setDraft((current) => ({
                          ...current,
                          capacity: Math.min(
                            Number(event.target.value.replace(/\D/g, '')) || 0,
                            classCreationLimits.capacity,
                          ),
                        }));
                      }}
                    />
                    <b>명</b>
                  </div>
                </label>
                {(fieldErrors.capacity || draft.capacity < 1) && (
                  <p className="field-message error" id="capacity-error">
                    <CircleAlert />
                    {fieldErrors.capacity || '참가인원은 1명 이상 입력해 주세요.'}
                  </p>
                )}
              </article>
            )}

            {type === 'offline' && (
              <article className="setting-card address-setting">
                <div className="setting-card-heading">
                  <i>
                    <MapPin />
                  </i>
                  <span>
                    <h2>클래스 장소</h2>
                    <p>수강생이 찾아올 주소를 확인해 주세요.</p>
                  </span>
                </div>
                <button
                  className="address-search-button"
                  type="button"
                  data-creator-field="address"
                  aria-invalid={Boolean(fieldErrors.address)}
                  aria-describedby={fieldErrors.address ? 'address-error' : undefined}
                  onClick={openAddressDialog}
                >
                  <Search />
                  <span>
                    <small>기본 주소</small>
                    <b>{draft.address || '주소를 검색해 주세요'}</b>
                  </span>
                  <ChevronRight />
                </button>
                {fieldErrors.address && (
                  <p className="field-message error" id="address-error">
                    <CircleAlert />
                    {fieldErrors.address}
                  </p>
                )}
                <TextField
                  field="address"
                  label="상세 주소"
                  value={draft.detailedAddress}
                  placeholder="예) 3층 302호"
                  onChange={(detailedAddress) =>
                    setDraft((current) => ({ ...current, detailedAddress }))
                  }
                />
                {draft.address && (
                  <div className="location-preview">
                    <MapPin />
                    <span>
                      <b>{draft.address}</b>
                      <small>선택한 위치를 클래스 페이지에 표시합니다.</small>
                    </span>
                  </div>
                )}
              </article>
            )}

            {type !== 'online' && (
              <details
                className="optional-schedule"
                open={scheduleOpen}
                onToggle={(event) => setScheduleOpen(event.currentTarget.open)}
              >
                <summary>
                  <span>
                    <i>
                      <Clock3 />
                    </i>
                    <span>
                      <b>일정도 지금 설정할까요?</b>
                      <small>선택 사항 · 게시 후 클래스 정보에서 추가할 수 있어요.</small>
                    </span>
                  </span>
                  <em>{draft.startDate ? formatClassSchedule(draft.startDate) : '선택'}</em>
                  <ChevronRight />
                </summary>
                <div className="optional-schedule-content">
                  <fieldset
                    className="schedule-fieldset"
                    data-creator-field="startDate"
                    aria-describedby={fieldErrors.startDate ? 'class-schedule-error' : undefined}
                  >
                    <legend className="sr-only">클래스 시작 일정</legend>
                    <div className="schedule-grid">
                      <Input
                        label="시작 날짜"
                        type="date"
                        min={todayDateValue}
                        value={scheduleDateValue(draft.startDate)}
                        aria-invalid={Boolean(fieldErrors.startDate)}
                        onChange={(event) => {
                          clearFieldError('startDate');
                          setDraft((current) => ({
                            ...current,
                            startDate: combineClassSchedule(
                              event.target.value,
                              scheduleTimeValue(current.startDate),
                            ),
                          }));
                        }}
                      />
                      <Input
                        label="시작 시간"
                        type="time"
                        value={scheduleTimeValue(draft.startDate)}
                        aria-invalid={Boolean(fieldErrors.startDate)}
                        onChange={(event) => {
                          clearFieldError('startDate');
                          setDraft((current) => ({
                            ...current,
                            startDate: combineClassSchedule(
                              scheduleDateValue(current.startDate),
                              event.target.value,
                            ),
                          }));
                        }}
                      />
                    </div>
                    {fieldErrors.startDate && (
                      <p className="field-message error" id="class-schedule-error">
                        <CircleAlert />
                        {fieldErrors.startDate}
                      </p>
                    )}
                  </fieldset>
                  <div data-creator-field="recruitEndDate">
                    <Input
                      label="모집 마감일"
                      type="date"
                      min={todayDateValue}
                      value={scheduleDateValue(draft.recruitEndDate)}
                      error={fieldErrors.recruitEndDate}
                      hint="비워 두면 별도로 모집 마감일을 표시하지 않아요."
                      onChange={(event) => {
                        clearFieldError('recruitEndDate');
                        setDraft((current) => ({
                          ...current,
                          recruitEndDate: event.target.value,
                        }));
                      }}
                    />
                  </div>
                  {(draft.startDate || draft.recruitEndDate) && (
                    <button
                      className="clear-schedule"
                      type="button"
                      onClick={() => {
                        setDraft((current) => ({
                          ...current,
                          startDate: '',
                          recruitEndDate: '',
                        }));
                        clearFieldError('startDate');
                        clearFieldError('recruitEndDate');
                      }}
                    >
                      일정 비우기
                    </button>
                  )}
                </div>
              </details>
            )}
          </section>
        )}

        {step === 4 && (
          <section className="preview-workspace">
            <div className="preview-toolbar">
              <span>
                <Sparkles />
                공개 페이지 미리보기를 편집하고 있어요
              </span>
              <button
                ref={previewHelpButtonRef}
                className="preview-help-button"
                type="button"
                aria-expanded={showPreviewHint}
                aria-controls="preview-editing-help"
                onClick={() => setShowPreviewHint((current) => !current)}
              >
                <Pencil />
                편집 방법
              </button>
            </div>
            {showPreviewHint && (
              <div className="preview-hint" id="preview-editing-help" role="status">
                <Pencil />
                <span>
                  <b>수정하고 싶은 부분을 클릭해 보세요.</b>
                  제목, 소개, 가격과 내용을 이 화면에서 바로 바꿀 수 있어요.
                </span>
                <button
                  type="button"
                  aria-label="도움말 닫기"
                  onClick={dismissPreviewHint}
                >
                  <X />
                </button>
              </div>
            )}
            <div className="class-preview-frame">
              <article className="class-public-preview">
                <section className="preview-public-hero" aria-label="클래스 핵심 정보">
                  <div className="preview-hero-media">
                    <div className="preview-cover editable">
                      {thumbnailPreviewUrl || draft.thumbnail ? (
                        <img
                          src={thumbnailPreviewUrl || draft.thumbnail}
                          alt="클래스 썸네일 미리보기"
                          style={{ objectPosition: draft.thumbnailPosition }}
                        />
                      ) : (
                        <span className="cover-placeholder">
                          <em>ONECLICK CLASS</em>
                          <b>{draft.title || typeOption.label}</b>
                        </span>
                      )}
                      <label className="cover-edit">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          aria-label="클래스 썸네일 변경"
                          onChange={addThumbnail}
                        />
                        {thumbnailUploadStatus === 'uploading' ? (
                          <LoaderCircle className="spin" />
                        ) : (
                          <ImageIcon />
                        )}
                        {thumbnailUploadStatus === 'uploading' ? '업로드 중' : '이미지 변경'}
                        <small>권장 16:9 · 최대 5MB</small>
                      </label>
                      {thumbnailUploadError && (
                        <div className="cover-upload-error" role="alert">
                          <CircleAlert />
                          <span>{thumbnailUploadError}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (pendingThumbnailFile.current) {
                                void uploadThumbnail(pendingThumbnailFile.current);
                              }
                            }}
                          >
                            다시 시도
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="preview-hero-copy">
                    <span className={`class-type-badge ${type}`}>{typeOption.label}</span>
                    <InlineEditor
                      field="title"
                      active={editField === 'title'}
                      highlighted={highlightField === 'title'}
                      value={draft.title}
                      placeholder="클래스 제목을 입력해 주세요"
                      maxLength={classCreationLimits.title}
                      onStart={startInlineEdit}
                      onChange={(title) => setDraft((current) => ({ ...current, title }))}
                      onDone={() => finishInlineEdit('title')}
                      onCancel={cancelInlineEdit}
                    />
                    <InlineEditor
                      field="summary"
                      active={editField === 'summary'}
                      highlighted={highlightField === 'summary'}
                      value={draft.summary}
                      placeholder="클래스 소개를 입력해 주세요"
                      multiline
                      maxLength={classCreationLimits.summary}
                      onStart={startInlineEdit}
                      onChange={(summary) => setDraft((current) => ({ ...current, summary }))}
                      onDone={() => finishInlineEdit('summary')}
                      onCancel={cancelInlineEdit}
                    />

                    <div className={`preview-facts ${type}`}>
                      <InlineFact
                        field="price"
                        icon={<WalletCards />}
                        label="참가비"
                        display={formatPrice(draft.price)}
                        active={editField === 'price'}
                        highlighted={highlightField === 'price'}
                        value={draft.price}
                        unit="원"
                        onStart={startInlineEdit}
                        onChange={(price) =>
                          setDraft((current) => ({
                            ...current,
                            price,
                            payment: price > 0 ? 'paid' : 'free',
                          }))
                        }
                        onDone={() => finishInlineEdit('price')}
                        onCancel={cancelInlineEdit}
                      />
                      {type !== 'online' && (
                        <>
                          <InlineFact
                            field="capacity"
                            icon={<Users />}
                            label="참가인원"
                            display={`${draft.capacity.toLocaleString('ko-KR')}명`}
                            active={editField === 'capacity'}
                            highlighted={highlightField === 'capacity'}
                            value={draft.capacity}
                            unit="명"
                            onStart={startInlineEdit}
                            onChange={(capacity) =>
                              setDraft((current) => ({ ...current, capacity }))
                            }
                            onDone={() => finishInlineEdit('capacity')}
                            onCancel={cancelInlineEdit}
                          />
                          <InlineScheduleFact
                            active={editField === 'startDate'}
                            highlighted={highlightField === 'startDate'}
                            display={formatClassSchedule(draft.startDate)}
                            date={scheduleEditValue.date}
                            time={scheduleEditValue.time}
                            minDate={todayDateValue}
                            error={fieldErrors.startDate}
                            onStart={startInlineEdit}
                            onDateChange={(date) => {
                              clearFieldError('startDate');
                              setScheduleEditValue((current) => ({ ...current, date }));
                            }}
                            onTimeChange={(time) => {
                              clearFieldError('startDate');
                              setScheduleEditValue((current) => ({ ...current, time }));
                            }}
                            onDone={() => finishInlineEdit('startDate')}
                            onCancel={() => cancelInlineEdit('startDate')}
                          />
                        </>
                      )}
                      {type === 'offline' && (
                        <div
                          className={`preview-fact preview-fact-address editable ${
                            editField === 'address' ? 'is-editing' : ''
                          } ${highlightField === 'address' ? 'highlighted' : ''}`}
                          data-preview-field="address"
                        >
                          <MapPin />
                          {editField === 'address' ? (
                            <div className="inline-address">
                              <label>
                                <span>주소</span>
                                <span className="inline-address-field">
                                  <input
                                    autoFocus
                                    value={draft.address}
                                    aria-label="클래스 장소 편집"
                                    onChange={(event) =>
                                      setDraft((current) => ({
                                        ...current,
                                        address: event.target.value,
                                      }))
                                    }
                                    onKeyDown={(event) => {
                                      if (event.key === 'Escape') cancelInlineEdit('address');
                                      if (event.key === 'Enter') finishInlineEdit('address');
                                    }}
                                  />
                                </span>
                              </label>
                              <button
                                type="button"
                                aria-label="주소 검색"
                                onClick={openAddressDialog}
                              >
                                <Search />
                                <span>검색</span>
                              </button>
                              <button
                                type="button"
                                aria-label="클래스 장소 편집 완료"
                                onClick={() => finishInlineEdit('address')}
                              >
                                <Check />
                                <span>완료</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              aria-label="클래스 장소 수정"
                              onClick={() => startInlineEdit('address')}
                            >
                              <span className="preview-fact-copy">
                                <small>장소</small>
                                <b>{draft.address || '주소를 입력해 주세요'}</b>
                              </span>
                              <Pencil />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </section>

                <div className="preview-content">
                  <div className="preview-main">
                    <section
                      className={`preview-description editable ${
                        highlightField === 'description' ? 'highlighted' : ''
                      }`}
                      data-preview-field="description"
                    >
                      <h2>클래스 소개</h2>
                      {editField === 'description' ? (
                        <div className="preview-rich-editor">
                          <EditorToolbar
                            onFormat={(kind) =>
                              updateTextSelection(
                                previewDescriptionRef,
                                draft.description,
                                (description) =>
                                  setDraft((current) => ({ ...current, description })),
                                kind,
                              )
                            }
                          />
                          <textarea
                            ref={previewDescriptionRef}
                            autoFocus
                            value={draft.description}
                            aria-label="클래스 내용 편집"
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Escape') cancelInlineEdit('description');
                            }}
                          />
                          <button
                            className="inline-done"
                            type="button"
                            onClick={() => finishInlineEdit('description')}
                          >
                            <Check />
                            완료
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label="클래스 내용 수정"
                          onClick={() => startInlineEdit('description')}
                        >
                          {draft.description ? (
                            draft.description
                              .split('\n')
                              .map((paragraph, index) =>
                                paragraph ? (
                                  <p key={`${paragraph}-${index}`}>{paragraph}</p>
                                ) : (
                                  <br key={index} />
                                ),
                              )
                          ) : (
                            <p className="empty-copy">클래스 내용을 입력해 주세요.</p>
                          )}
                          <span className="edit-affordance">
                            <Pencil />
                            클릭하여 수정
                          </span>
                        </button>
                      )}
                    </section>

                    {meta.source !== 'none' && (
                      <details className="preview-materials">
                        <summary>
                          <span>
                            {meta.source === 'youtube' || meta.source === 'video' ? (
                              <>
                                <Video /> 강의 영상 · 등록됨
                              </>
                            ) : (
                              <>
                                <FileText /> 참고자료 · {meta.materials.length}개 등록됨
                              </>
                            )}
                          </span>
                          <small>더보기</small>
                        </summary>
                        {meta.source === 'youtube' && (
                          <p>
                            {meta.youtubeMetadata?.title || 'YouTube 영상'}
                            {meta.youtubeMetadata?.channel
                              ? ` · ${meta.youtubeMetadata.channel}`
                              : ''}
                          </p>
                        )}
                        {meta.materials.map((file) => (
                          <p key={file.id}>
                            {file.name} <small>{formatBytes(file.size)}</small>
                          </p>
                        ))}
                      </details>
                    )}
                  </div>
                </div>
              </article>
            </div>
            <p className="creator-publish-note">
              <ExternalLink />
              {willPublish
                ? '입력 내용과 첫 차시는 자동 저장됩니다. 게시하면 공유 링크가 활성화돼요.'
                : '기본 정보를 저장한 뒤 첫 차시를 만들면 공유 링크를 열 수 있어요.'}
            </p>
          </section>
        )}

        {step === 5 && (
          <section className="creation-complete">
            <div className="completion-mark">
              <span>
                <Check />
              </span>
              <i />
              <i />
            </div>
            <h1>
              {meta.shareToken
                ? editId
                  ? '클래스 수정이 완료됐어요'
                  : '클래스와 첫 차시가 완성됐어요!'
                : '클래스 기본 정보가 준비됐어요'}
            </h1>
            <p>
              {meta.shareToken
                ? '신청 링크를 공유하면 수강생이 클래스 정보를 확인하고 바로 신청할 수 있어요.'
                : '첫 차시를 추가하고 공개 페이지를 확인하면 신청 링크를 만들 수 있어요.'}
            </p>
            {meta.shareToken && (
              <>
                <div className="share-link-card">
                  <span>
                    <Link2 />
                    <input aria-label="클래스 링크" readOnly value={shareUrl} />
                  </span>
                  <button type="button" className={copied ? 'copied' : ''} onClick={copyShareLink}>
                    {copied ? <Check /> : <Copy />}
                    {copied ? '복사됨' : '링크 복사'}
                  </button>
                </div>
                {copied && (
                  <div className="copy-toast" role="status">
                    <Check />
                    클래스 링크를 복사했어요.
                  </div>
                )}
              </>
            )}
            <div className="completion-actions">
              {meta.shareToken ? (
                <>
                  <button
                    type="button"
                    className="view-class"
                    onClick={() => nav(`/s/${meta.shareToken}`)}
                  >
                    클래스 보러가기
                    <ExternalLink />
                  </button>
                  <button type="button" onClick={restart}>
                    새 클래스 만들기
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="view-class"
                    onClick={() => nav(`/classes/${meta.createdId}/curriculum?setup=1`)}
                  >
                    첫 차시 만들기
                    <ArrowRight />
                  </button>
                  <button type="button" onClick={() => nav(`/classes/${meta.createdId}`)}>
                    클래스 관리
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {error && (
          <p className="creator-form-error" role="alert">
            <CircleAlert />
            {error}
          </p>
        )}

        {step < 5 && (
          <footer
            className={`creator-actions ${step === 1 ? 'single' : ''} ${
              step === 2 ? 'is-information' : step === 3 ? 'is-compact' : ''
            }`}
          >
            <div className="creator-action-group">
              {step > 1 && (
                <button type="button" className="creator-back" onClick={() => goToStep(step - 1)}>
                  <ArrowLeft />
                  이전
                </button>
              )}
              <button
                className="creator-next"
                type="submit"
                disabled={
                  (step === 1 && !meta.deliverySelected) ||
                  (step === 2 &&
                    meta.informationMode !== 'manual' &&
                    meta.informationMode !== 'generated') ||
                  submitting
                }
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="spin" />
                    {willPublish ? '클래스를 게시하고 있어요' : '기본 정보를 저장하고 있어요'}
                  </>
                ) : (
                  <>
                    {step === 4 ? (willPublish ? '클래스 게시' : '기본 정보 저장') : '다음'}
                    <ArrowRight />
                  </>
                )}
              </button>
            </div>
          </footer>
        )}
      </form>

      {addressOpen && (
        <AddressDialog
          query={query}
          onQuery={setQuery}
          onClose={closeAddressDialog}
          onPick={(address) => {
            setDraft((current) => ({ ...current, address }));
            clearFieldError('address');
            closeAddressDialog();
            setError('');
          }}
        />
      )}

      <ConfirmDialog
        open={publishConfirmOpen}
        title={willPublish ? '클래스를 게시할까요?' : '기본 정보를 저장할까요?'}
        description={
          <div className="publish-summary">
            <p>
              {willPublish
                ? '등록한 자료를 첫 차시로 만들고 공유 링크를 활성화해요.'
                : '기본 정보를 먼저 저장하고, 다음 화면에서 첫 차시를 만들 수 있어요.'}
              {willPublish && type !== 'online' && !draft.startDate
                ? ' 일정은 게시 후 클래스 정보에서 추가할 수 있어요.'
                : ''}
            </p>
            <dl>
              <div>
                <dt>진행 방식</dt>
                <dd>{typeOption.label}</dd>
              </div>
              <div>
                <dt>정보 준비</dt>
                <dd>{informationSourceLabel}</dd>
              </div>
              {type !== 'online' && (
                <div>
                  <dt>일정</dt>
                  <dd>{formatClassSchedule(draft.startDate)}</dd>
                </div>
              )}
              <div>
                <dt>참가비</dt>
                <dd>{formatPrice(draft.price)}</dd>
              </div>
              {type !== 'online' && (
                <div>
                  <dt>참가인원</dt>
                  <dd>{draft.capacity.toLocaleString('ko-KR')}명</dd>
                </div>
              )}
              {type === 'offline' && (
                <div>
                  <dt>장소</dt>
                  <dd>{draft.address}</dd>
                </div>
              )}
            </dl>
          </div>
        }
        confirmText={willPublish ? '클래스 게시' : '저장하고 계속'}
        cancelText="계속 수정하기"
        tone="primary"
        loading={submitting}
        onCancel={() => setPublishConfirmOpen(false)}
        onConfirm={() => void publishClass()}
      />
    </main>
  );
}

function TextField({
  field,
  label,
  value,
  placeholder,
  maxLength,
  error,
  onChange,
}: {
  field: FormField;
  label: string;
  value: string;
  placeholder: string;
  maxLength?: number;
  error?: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  return (
    <div className="creator-field" data-creator-field={field}>
      <span>
        <label htmlFor={inputId}>{label}</label>
        {maxLength && (
          <small>
            {value.length} / {maxLength}
          </small>
        )}
      </span>
      <input
        id={inputId}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p className="field-message error" id={errorId}>
          <CircleAlert />
          {error}
        </p>
      )}
    </div>
  );
}

function TextAreaField({
  field,
  label,
  value,
  placeholder,
  maxLength,
  error,
  onChange,
}: {
  field: FormField;
  label: string;
  value: string;
  placeholder: string;
  maxLength: number;
  error?: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  return (
    <div className="creator-field" data-creator-field={field}>
      <span>
        <label htmlFor={inputId}>{label}</label>
        <small>
          {value.length} / {maxLength}
        </small>
      </span>
      <textarea
        id={inputId}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p className="field-message error" id={errorId}>
          <CircleAlert />
          {error}
        </p>
      )}
    </div>
  );
}

function RichTextEditor({
  textareaRef,
  value,
  error,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement>;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  return (
    <div className="creator-field rich-text-field" data-creator-field="description">
      <span>
        <label htmlFor={inputId}>클래스 내용</label>
        <small>{value.length}자</small>
      </span>
      <div>
        <EditorToolbar
          onFormat={(kind) => updateTextSelection(textareaRef, value, onChange, kind)}
        />
        <textarea
          id={inputId}
          ref={textareaRef}
          value={value}
          placeholder="클래스에서 배우는 내용을 자유롭게 적어 주세요."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {error && (
        <p className="field-message error" id={errorId}>
          <CircleAlert />
          {error}
        </p>
      )}
    </div>
  );
}

function EditorToolbar({
  onFormat,
}: {
  onFormat: (kind: 'heading' | 'bold' | 'bullet' | 'number' | 'link') => void;
}) {
  return (
    <div className="editor-toolbar" role="toolbar" aria-label="텍스트 서식">
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onFormat('heading')}
      >
        제목
      </button>
      <button
        type="button"
        aria-label="굵게"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onFormat('bold')}
      >
        <b>B</b>
      </button>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onFormat('bullet')}
      >
        • 목록
      </button>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onFormat('number')}
      >
        1. 목록
      </button>
      <button
        type="button"
        aria-label="링크"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onFormat('link')}
      >
        <Link2 />
      </button>
    </div>
  );
}

function AnalysisProgress({ sourceLabel }: { sourceLabel: string }) {
  const tasks = [
    '자료 내용을 확인하고 있어요',
    '핵심 내용을 정리하고 있어요',
    '클래스 소개를 작성하고 있어요',
  ];
  return (
    <div className="analysis-progress" role="status" aria-live="polite">
      <div className="analysis-orbit">
        <Sparkles />
        <i />
      </div>
      <span className="analysis-source">{sourceLabel} 분석 중</span>
      <h2>클래스 정보를 준비하고 있어요</h2>
      <p>이전 단계로 돌아가도 분석은 계속됩니다.</p>
      <ol>
        {tasks.map((task, index) => (
          <li key={task}>
            <span>{index + 1}</span>
            {task}
          </li>
        ))}
      </ol>
    </div>
  );
}

function InlineEditor({
  field,
  active,
  highlighted,
  value,
  placeholder,
  multiline = false,
  maxLength,
  onStart,
  onChange,
  onDone,
  onCancel,
}: {
  field: Extract<EditableField, 'title' | 'summary'>;
  active: boolean;
  highlighted: boolean;
  value: string;
  placeholder: string;
  multiline?: boolean;
  maxLength: number;
  onStart: (field: EditableField) => void;
  onChange: (value: string) => void;
  onDone: () => void;
  onCancel: (field: EditableField) => void;
}) {
  const label = field === 'title' ? '클래스 제목' : '클래스 소개';
  if (active) {
    const shared = {
      autoFocus: true,
      value,
      maxLength,
      placeholder,
      'aria-label': `${label} 편집`,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChange(event.target.value),
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key === 'Escape') onCancel(field);
        if (!multiline && event.key === 'Enter') onDone();
      },
    };
    return (
      <div className={`inline-copy-editor ${field}`} data-preview-field={field}>
        {multiline ? <textarea {...shared} /> : <input {...shared} />}
        <span>
          {value.length} / {maxLength}
        </span>
        <button type="button" onClick={onDone}>
          <Check />
          완료
        </button>
      </div>
    );
  }
  return (
    <div
      className={`preview-copy editable ${field} ${highlighted ? 'highlighted' : ''}`}
      data-preview-field={field}
    >
      {field === 'title' ? <h2>{value || placeholder}</h2> : <p>{value || placeholder}</p>}
      <button
        className="preview-copy-trigger"
        type="button"
        aria-label={`${label} 수정`}
        onClick={() => onStart(field)}
      />
      <span className="edit-affordance" aria-hidden="true">
        <Pencil />
        클릭하여 수정
      </span>
    </div>
  );
}

function InlineFact({
  field,
  icon,
  label,
  display,
  active,
  highlighted,
  value,
  unit,
  onStart,
  onChange,
  onDone,
  onCancel,
}: {
  field: Extract<EditableField, 'price' | 'capacity'>;
  icon: React.ReactNode;
  label: string;
  display: string;
  active: boolean;
  highlighted: boolean;
  value: number;
  unit: string;
  onStart: (field: EditableField) => void;
  onChange: (value: number) => void;
  onDone: () => void;
  onCancel: (field: EditableField) => void;
}) {
  return (
    <div
      className={`preview-fact editable ${active ? 'is-editing' : ''} ${
        highlighted ? 'highlighted' : ''
      }`}
      data-preview-field={field}
    >
      {icon}
      {active ? (
        <div className="inline-number">
          <label>
            <span>{label}</span>
            <span className="inline-number-field">
              <input
                autoFocus
                inputMode="numeric"
                aria-label={`${label} 편집`}
                value={value}
                onChange={(event) => onChange(Number(event.target.value.replace(/\D/g, '')) || 0)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') onCancel(field);
                  if (event.key === 'Enter') onDone();
                }}
              />
              <b aria-hidden="true">{unit}</b>
            </span>
          </label>
          <button type="button" onClick={onDone} aria-label={`${label} 편집 완료`}>
            <Check />
            <span>완료</span>
          </button>
        </div>
      ) : (
        <button type="button" aria-label={`${label} 수정`} onClick={() => onStart(field)}>
          <span className="preview-fact-copy">
            <small>{label}</small>
            <b>{display}</b>
          </span>
          <Pencil />
        </button>
      )}
    </div>
  );
}

function InlineScheduleFact({
  active,
  highlighted,
  display,
  date,
  time,
  minDate,
  error,
  onStart,
  onDateChange,
  onTimeChange,
  onDone,
  onCancel,
}: {
  active: boolean;
  highlighted: boolean;
  display: string;
  date: string;
  time: string;
  minDate: string;
  error?: string;
  onStart: (field: EditableField) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const errorId = useId();
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') onCancel();
    if (event.key === 'Enter') onDone();
  };

  return (
    <div
      className={`preview-fact preview-fact-schedule editable ${active ? 'is-editing' : ''} ${
        highlighted ? 'highlighted' : ''
      }`}
      data-preview-field="startDate"
    >
      <Clock3 />
      {active ? (
        <fieldset className="inline-schedule" aria-describedby={error ? errorId : undefined}>
          <legend className="sr-only">클래스 일정 편집</legend>
          <label>
            <span>시작 날짜</span>
            <input
              autoFocus
              type="date"
              min={minDate}
              value={date}
              aria-label="클래스 시작 날짜 편집"
              aria-invalid={Boolean(error)}
              onChange={(event) => onDateChange(event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </label>
          <label>
            <span>시작 시간</span>
            <input
              type="time"
              value={time}
              aria-label="클래스 시작 시간 편집"
              aria-invalid={Boolean(error)}
              onChange={(event) => onTimeChange(event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </label>
          <span className="inline-schedule-actions">
            <button type="button" aria-label="클래스 일정 편집 취소" onClick={onCancel}>
              <X />
            </button>
            <button type="button" aria-label="클래스 일정 편집 완료" onClick={onDone}>
              <Check />
            </button>
          </span>
          {error && (
            <small className="inline-schedule-error" id={errorId} role="alert">
              <CircleAlert />
              {error}
            </small>
          )}
        </fieldset>
      ) : (
        <button type="button" aria-label="클래스 일정 수정" onClick={() => onStart('startDate')}>
          <span className="preview-fact-copy schedule">
            <small>일정</small>
            <b>{display}</b>
          </span>
          <Pencil />
        </button>
      )}
    </div>
  );
}

function AddressDialog({
  query,
  onQuery,
  onClose,
  onPick,
}: {
  query: string;
  onQuery: (value: string) => void;
  onClose: () => void;
  onPick: (address: string) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const input = dialog?.querySelector('input');
    input?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input'),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const results = addressSuggestions.filter((address) =>
    address.replace(/\s/g, '').includes(query.replace(/\s/g, '')),
  );

  return (
    <div className="creator-dialog-backdrop" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="creator-address-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <span>
            <MapPin />
            <b id="address-dialog-title">주소 검색</b>
          </span>
          <button type="button" onClick={onClose} aria-label="주소 검색 닫기">
            <X />
          </button>
        </header>
        <label>
          <Search />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="도로명, 건물명 또는 지번 검색"
          />
        </label>
        <div className="address-results">
          {(query ? results : addressSuggestions).map((address) => (
            <button type="button" onClick={() => onPick(address)} key={address}>
              <MapPin />
              <span>
                <b>{address}</b>
                <small>서울특별시 상세 주소</small>
              </span>
              <ChevronRight />
            </button>
          ))}
          {query && results.length === 0 && (
            <p>
              <Search />
              검색 결과가 없어요. 도로명이나 건물명을 다시 확인해 주세요.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
