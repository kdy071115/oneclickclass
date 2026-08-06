import {
  Fragment,
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  type DragEvent,
  type FormEvent,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  ClipboardPaste,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Globe2,
  GripVertical,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  MapPin,
  MonitorPlay,
  Pencil,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  Users,
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
  classCreationFlowSteps,
  classCreationLimits,
  classTypeOptions,
} from '../constants/classCreation';
import { addressSuggestions, initialClassDraft } from '../constants/classDraft';
import { Button, ConfirmDialog, EmptyState, Skeleton } from '../components/ui';
import { ClassThumbnail } from '../components/feature/ClassThumbnail';
import {
  SourcePreviewPanel,
  type SourcePreviewItem,
} from '../components/feature/SourcePreviewPanel';
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
  formatClassSchedule,
  formatMediaDuration,
  isPastClassSchedule,
  isSupportedClassSourceFile,
  localDateInputValue,
  readVideoDuration,
  scheduleDateValue,
  scheduleTimeValue,
} from '../utils/classCreation';
import {
  contentProviderLabel,
  detectContentProvider,
  isSupportedVideoProvider,
  validateContentUrl,
  type SupportedVideoProvider,
} from '../utils/content';
import {
  getClassThumbnail,
  optimizeClassThumbnail,
  saveClassThumbnail,
} from '../utils/classThumbnail';
import type { ClassDetail, ClassDraft, ClassItem } from '../types/class';

type SupportedClassType = Exclude<ClassDraft['type'], 'hybrid'>;
type SourceKind = 'none' | 'links' | 'video' | 'documents' | 'mixed';
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
  | 'startDate'
  | 'instructorName';
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
  contentType: 'video' | 'document';
  status: 'uploading' | 'uploaded' | 'error';
  url?: string;
  progress?: number;
  durationSeconds?: number;
}

interface SourceLink {
  id: string;
  url: string;
  provider: ReturnType<typeof detectContentProvider>;
  title?: string;
  channel?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
}

interface CreationMeta {
  deliverySelected: boolean;
  source: SourceKind;
  linkInput: string;
  links: SourceLink[];
  videoUrl: string;
  videoProvider: SupportedVideoProvider | '';
  videoConnected: boolean;
  videoMetadata?: ClassSourceMetadata;
  materials: UploadedMaterial[];
  sourceOrder: string[];
  informationMode: InformationMode;
  createdId: string;
  shareToken: string;
  thumbnailOrigin: 'none' | 'ai' | 'user';
  step: number;
  maxStep: number;
}

type StoredCreationMeta = Partial<Omit<CreationMeta, 'source'>> & {
  source?: SourceKind | 'youtube' | 'video-url';
  youtubeUrl?: string;
  youtubeConnected?: boolean;
  youtubeMetadata?: ClassSourceMetadata;
};

interface ScheduleEditValue {
  date: string;
  time: string;
}

interface SourceDragPreview {
  id: string;
  pointerType: string;
  x: number;
  y: number;
}

function sourceDragPreviewPosition(x: number, y: number, pointerType: string) {
  const gutter = 12;
  const previewWidth = Math.min(280, window.innerWidth - gutter * 2);
  const previewHeight = 64;
  const requestedX = pointerType === 'touch' ? x - previewWidth / 2 : x + 14;
  const requestedY = pointerType === 'touch' ? y - 76 : y + 14;
  return {
    x: Math.min(Math.max(gutter, requestedX), window.innerWidth - previewWidth - gutter),
    y: Math.min(Math.max(gutter, requestedY), window.innerHeight - previewHeight - gutter),
  };
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
const SOURCE_UNDO_DELAY_MS = 7000;
const classCreationMetaStorageKey = (editId: string | null) =>
  editId ? `${CLASS_CREATION_META_KEY}:edit:${editId}` : CLASS_CREATION_META_KEY;

function restoredLinks(parsed: StoredCreationMeta): SourceLink[] {
  if (Array.isArray(parsed.links)) return parsed.links;
  const legacyUrl = parsed.videoUrl || parsed.youtubeUrl || '';
  if (!legacyUrl || !(parsed.videoConnected ?? parsed.youtubeConnected)) return [];
  return [
    {
      id: 'restored-video-link',
      url: legacyUrl,
      provider: detectContentProvider(legacyUrl, 'video'),
      title: parsed.videoMetadata?.title ?? parsed.youtubeMetadata?.title,
      channel: parsed.videoMetadata?.channel ?? parsed.youtubeMetadata?.channel,
      durationSeconds:
        parsed.videoMetadata?.durationSeconds ?? parsed.youtubeMetadata?.durationSeconds,
      thumbnailUrl: parsed.videoMetadata?.thumbnailUrl ?? parsed.youtubeMetadata?.thumbnailUrl,
    },
  ];
}

type OrderedSource =
  | { id: string; kind: 'link'; value: SourceLink }
  | { id: string; kind: 'material'; value: UploadedMaterial };

type RemovedSource = {
  source: OrderedSource;
  orderIndex: number;
  localFile?: File;
};

function normalizeSourceOrder(
  order: string[] | undefined,
  links: SourceLink[],
  materials: UploadedMaterial[],
) {
  const availableIds = [...links.map((link) => link.id), ...materials.map((file) => file.id)];
  const available = new Set(availableIds);
  const normalized = (order ?? []).filter(
    (id, index, values) => available.has(id) && values.indexOf(id) === index,
  );
  const included = new Set(normalized);
  return [...normalized, ...availableIds.filter((id) => !included.has(id))];
}

function orderedCreationSources(meta: Pick<CreationMeta, 'links' | 'materials' | 'sourceOrder'>) {
  const byId = new Map<string, OrderedSource>([
    ...meta.links.map((link) => [link.id, { id: link.id, kind: 'link', value: link }] as const),
    ...meta.materials.map(
      (file) => [file.id, { id: file.id, kind: 'material', value: file }] as const,
    ),
  ]);
  return normalizeSourceOrder(meta.sourceOrder, meta.links, meta.materials).flatMap((id) => {
    const source = byId.get(id);
    return source ? [source] : [];
  });
}

const initialCreationMeta: CreationMeta = {
  deliverySelected: false,
  source: 'none',
  linkInput: '',
  links: [],
  videoUrl: '',
  videoProvider: '',
  videoConnected: false,
  videoMetadata: undefined,
  materials: [],
  sourceOrder: [],
  informationMode: 'source',
  createdId: '',
  shareToken: '',
  thumbnailOrigin: 'none',
  step: 1,
  maxStep: 3,
};

function clearCompletedCreationSession(storageKey: string) {
  try {
    const saved = sessionStorage.getItem(storageKey);
    if (!saved) return false;
    const parsed = JSON.parse(saved) as StoredCreationMeta;
    const links = restoredLinks(parsed);
    const materials = Array.isArray(parsed.materials) ? parsed.materials : [];
    const normalized: CreationMeta = {
      ...initialCreationMeta,
      ...parsed,
      source:
        parsed.source === 'youtube' || parsed.source === 'video-url'
          ? 'links'
          : (parsed.source ?? 'none'),
      links,
      videoUrl: parsed.videoUrl || parsed.youtubeUrl || '',
      videoConnected: parsed.videoConnected ?? parsed.youtubeConnected ?? false,
      videoMetadata: parsed.videoMetadata ?? parsed.youtubeMetadata,
      materials,
      sourceOrder: normalizeSourceOrder(parsed.sourceOrder, links, materials),
    };
    if (!normalized.createdId || (!normalized.shareToken && sourceIsReady(normalized)))
      return false;
    clearClassDraft();
    sessionStorage.removeItem(storageKey);
    return true;
  } catch {
    return false;
  }
}

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
  storageKey: string,
): CreationMeta {
  if (!editing && (requestedSource === 'video' || requestedSource === 'youtube')) {
    return {
      ...initialCreationMeta,
      deliverySelected: true,
      informationMode: 'source',
      step: 2,
      maxStep: 3,
    };
  }
  try {
    const saved = sessionStorage.getItem(storageKey);
    if (!saved) {
      return {
        ...initialCreationMeta,
        deliverySelected: hasDraft || editing,
        informationMode: hasDraft || editing ? 'generated' : 'source',
        step: hasDraft || editing ? 3 : 1,
      };
    }
    const parsed = JSON.parse(saved) as StoredCreationMeta;
    const legacyStep = Number(parsed.step) || 1;
    const deliverySelected = parsed.deliverySelected ?? (hasDraft || editing || legacyStep >= 2);
    const restoredStep =
      editing || legacyStep >= 3 || parsed.informationMode === 'generated'
        ? 3
        : deliverySelected
          ? Math.min(2, legacyStep)
          : 1;
    const videoUrl = parsed.videoUrl || parsed.youtubeUrl || '';
    const detectedProvider = detectContentProvider(videoUrl, 'video');
    const links = restoredLinks(parsed);
    const materials = (parsed.materials ?? []).map((file) => ({
      ...file,
      contentType: file.contentType ?? materialContentType(file.name, file.type),
      status:
        file.status === 'uploading' || (file.status === 'uploaded' && !file.url)
          ? ('error' as const)
          : file.status,
      progress: file.status === 'uploaded' && file.url ? 100 : undefined,
    }));
    return {
      ...initialCreationMeta,
      ...parsed,
      source:
        parsed.source === 'youtube' || parsed.source === 'video-url'
          ? 'links'
          : (parsed.source ?? 'none'),
      links,
      videoUrl,
      videoProvider:
        parsed.videoProvider ||
        (isSupportedVideoProvider(detectedProvider) ? detectedProvider : ''),
      videoConnected: parsed.videoConnected ?? parsed.youtubeConnected ?? false,
      videoMetadata: parsed.videoMetadata ?? parsed.youtubeMetadata,
      deliverySelected,
      step: restoredStep,
      maxStep: 3,
      materials,
      sourceOrder: normalizeSourceOrder(parsed.sourceOrder, links, materials),
    };
  } catch {
    return {
      ...initialCreationMeta,
      deliverySelected: hasDraft || editing,
      informationMode: hasDraft || editing ? 'generated' : 'source',
      step: hasDraft || editing ? 3 : 1,
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

function sourceLinkHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}

function sourceUrlsFromInput(value: string) {
  return [
    ...new Set(
      value
        .split(/\s+/)
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  ];
}

function materialContentType(name: string, mimeType: string): UploadedMaterial['contentType'] {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  return mimeType.startsWith('video/') ||
    classCreationFileTypes.video.extensions.includes(
      extension as (typeof classCreationFileTypes.video.extensions)[number],
    )
    ? 'video'
    : 'document';
}

function sourceIsReady(meta: CreationMeta) {
  const hasSource =
    meta.links.some((link) => link.provider !== 'SOCIAL') || meta.materials.length > 0;
  const filesReady = meta.materials.every(
    (file) => file.status === 'uploaded' && Boolean(file.url),
  );
  return hasSource && filesReady;
}

function sourceKindFor(links: SourceLink[], materials: UploadedMaterial[]): SourceKind {
  const hasVideo = materials.some((material) => material.contentType === 'video');
  const hasDocuments = materials.some((material) => material.contentType === 'document');
  if ((links.length && materials.length) || (hasVideo && hasDocuments)) return 'mixed';
  if (links.length) return 'links';
  if (hasVideo) return 'video';
  if (hasDocuments) return 'documents';
  return 'none';
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

export function CreateClassPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const requestedSource = params.get('source');
  const requestedStepValue = Number(params.get('step'));
  const requestedStep = requestedStepValue <= 1 ? 1 : requestedStepValue === 2 ? 2 : 3;
  const metaStorageKey = classCreationMetaStorageKey(editId);
  const [draft, setDraft] = useState<ClassDraft>(() => {
    if (!editId) clearCompletedCreationSession(metaStorageKey);
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
      metaStorageKey,
    ),
  );
  const [step, setStep] = useState(() =>
    editId ? 3 : params.has('step') ? requestedStep : meta.step,
  );
  const [maxStep, setMaxStep] = useState(3);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [saveRetryToken, setSaveRetryToken] = useState(0);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [videoUrlError, setVideoUrlError] = useState('');
  const [sourceDragActive, setSourceDragActive] = useState(false);
  const [draggedSourceId, setDraggedSourceId] = useState('');
  const [sourceDragPreview, setSourceDragPreview] = useState<SourceDragPreview | null>(null);
  const [recentlyMovedSourceId, setRecentlyMovedSourceId] = useState('');
  const [recentlyAddedSourceIds, setRecentlyAddedSourceIds] = useState<string[]>([]);
  const [sourceOrderAnnouncement, setSourceOrderAnnouncement] = useState('');
  const [sourcePreviewId, setSourcePreviewId] = useState('');
  const [materialPreviewUrl, setMaterialPreviewUrl] = useState('');
  const [fileOptionsOpen, setFileOptionsOpen] = useState(true);
  const [sourceAddOpen, setSourceAddOpen] = useState(
    () => orderedCreationSources(meta).length === 0,
  );
  const [removedSource, setRemovedSource] = useState<RemovedSource | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
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
  const [thumbnailUploadStatus, setThumbnailUploadStatus] = useState<ThumbnailUploadStatus>('idle');
  const [thumbnailUploadError, setThumbnailUploadError] = useState('');
  const analysisAbort = useRef<AbortController>();
  const videoMetadataAbort = useRef<AbortController>();
  const saveTimer = useRef<number>();
  const inlineOriginal = useRef<Partial<ClassDraft>>({});
  const pendingThumbnailFile = useRef<File>();
  const thumbnailUploadToken = useRef(0);
  const sourceFiles = useRef(new Map<string, File>());
  const pointerSourceId = useRef('');
  const pointerStartIndex = useRef(-1);
  const pointerInsertionIndex = useRef(-1);
  const sourceDragPreviewRef = useRef<HTMLDivElement>(null);
  const sourceOrderListRef = useRef<HTMLOListElement>(null);
  const sourceOrderItemRefs = useRef(new Map<string, HTMLLIElement>());
  const sourcePreviewTriggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const previousSourcePositions = useRef<Map<string, number>>();
  const sourcePointerCleanup = useRef<() => void>();
  const sourceDragPoint = useRef({ x: 0, y: 0 });
  const sourceDragFrame = useRef<number>();
  const sourceMoveTimer = useRef<number>();
  const sourceAddTimer = useRef<number>();
  const removedSourceTimer = useRef<number>();
  const removedSourceRef = useRef<RemovedSource>();
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const sourceAddToggleRef = useRef<HTMLButtonElement>(null);
  const previewHelpButtonRef = useRef<HTMLButtonElement>(null);
  const addressReturnFocusRef = useRef<HTMLElement>();
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
  const sourceFileAccept = `${classCreationFileTypes.video.accept},${classCreationFileTypes.document.accept}`;
  const videoFileLimitLabel = formatBytes(classCreationLimits.videoBytes);
  const documentFileLimitLabel = formatBytes(classCreationLimits.documentBytes);
  const todayDateValue = localDateInputValue();
  const commitScheduleInlineEdit = useCallback(
    (restoreFocus = true) => {
      const scheduleError = getScheduleInputError(scheduleEditValue.date, scheduleEditValue.time);
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
          document.querySelector<HTMLElement>('[data-preview-field="startDate"] button')?.focus();
        });
      }
      return true;
    },
    [scheduleEditValue],
  );
  const sourceLocked = meta.informationMode === 'analyzing';
  const stepInfo = classCreationFlowSteps[Math.min(step - 1, classCreationFlowSteps.length - 1)];
  const progressPercent = step <= 1 ? 0 : step === 2 ? 50 : 100;
  const orderedSources = orderedCreationSources(meta);
  const lessonSources = orderedSources.filter(
    (source) => source.kind !== 'link' || source.value.provider !== 'SOCIAL',
  );
  const profileSources = orderedSources.filter(
    (source) => source.kind === 'link' && source.value.provider === 'SOCIAL',
  );
  const displayedSources = [...lessonSources, ...profileSources];
  const previewSource = sourceDragPreview
    ? orderedSources.find((source) => source.id === sourceDragPreview.id)
    : undefined;
  const previewSourceTitle = previewSource
    ? previewSource.kind === 'link'
      ? previewSource.value.title || sourceLinkHost(previewSource.value.url)
      : previewSource.value.name
    : '';
  const sourceCount = orderedSources.length;
  const lessonSourceCount = lessonSources.length;
  const hasSources = sourceCount > 0;
  const workspaceLabel = step === 2 && hasSources ? '차시 구성' : stepInfo.label;
  const previewableSources = step === 3 ? lessonSources : displayedSources;
  const sourcePreviewSource = previewableSources.find((source) => source.id === sourcePreviewId);
  const sourcePreviewIndex = previewableSources.findIndex(
    (source) => source.id === sourcePreviewId,
  );
  const sourcePreviewMaterial =
    sourcePreviewSource?.kind === 'material' ? sourcePreviewSource.value : undefined;
  const sourcePreviewMaterialId = sourcePreviewMaterial?.id ?? '';
  const sourcePreviewMaterialUploadedUrl = sourcePreviewMaterial?.url ?? '';

  useEffect(() => {
    if (sourceCount === 0) setSourceAddOpen(true);
  }, [sourceCount]);

  function closeSourceAddFields() {
    setSourceAddOpen(false);
    requestAnimationFrame(() => sourceAddToggleRef.current?.focus());
  }

  useEffect(() => {
    setMaterialPreviewUrl('');
    if (!sourcePreviewMaterialId) return;
    const localFile = sourceFiles.current.get(sourcePreviewMaterialId);
    if (!localFile || typeof URL.createObjectURL !== 'function') {
      setMaterialPreviewUrl(sourcePreviewMaterialUploadedUrl);
      return;
    }
    const objectUrl = URL.createObjectURL(localFile);
    setMaterialPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [sourcePreviewMaterialId, sourcePreviewMaterialUploadedUrl]);

  useEffect(() => {
    if (!sourcePreviewId) return;
    if ((step !== 2 && step !== 3) || sourceLocked || sourcePreviewIndex < 0) {
      setSourcePreviewId('');
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      const activeId = sourcePreviewId;
      setSourcePreviewId('');
      requestAnimationFrame(() => sourcePreviewTriggerRefs.current.get(activeId)?.focus());
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [sourceLocked, sourcePreviewId, sourcePreviewIndex, step]);

  const sourcePreviewItem: SourcePreviewItem | undefined = sourcePreviewSource
    ? sourcePreviewSource.kind === 'link'
      ? {
          id: sourcePreviewSource.id,
          title: sourcePreviewSource.value.title || sourceLinkHost(sourcePreviewSource.value.url),
          label: contentProviderLabel[sourcePreviewSource.value.provider],
          url: sourcePreviewSource.value.url,
          previewUrl: sourcePreviewSource.value.url,
          provider: sourcePreviewSource.value.provider,
          contentType: isSupportedVideoProvider(sourcePreviewSource.value.provider)
            ? 'video'
            : sourcePreviewSource.value.provider === 'DOCUMENT'
              ? 'document'
              : 'link',
          thumbnailUrl: sourcePreviewSource.value.thumbnailUrl,
          detail:
            [
              sourcePreviewSource.value.channel,
              sourcePreviewSource.value.durationSeconds
                ? `재생 시간 ${formatMediaDuration(sourcePreviewSource.value.durationSeconds)}`
                : '',
            ]
              .filter(Boolean)
              .join(' · ') || sourceLinkHost(sourcePreviewSource.value.url),
          status: sourcePreviewSource.value.provider === 'SOCIAL' ? '강사 소개용' : '분석 준비됨',
        }
      : {
          id: sourcePreviewSource.id,
          title: sourcePreviewSource.value.name,
          label: sourcePreviewSource.value.contentType === 'video' ? '영상 파일' : '문서 파일',
          url: sourcePreviewSource.value.url || materialPreviewUrl,
          previewUrl: materialPreviewUrl || sourcePreviewSource.value.url || '',
          provider: sourcePreviewSource.value.contentType === 'video' ? 'FILE' : 'DOCUMENT',
          contentType: sourcePreviewSource.value.contentType,
          mimeType: sourcePreviewSource.value.type,
          detail: `${formatBytes(sourcePreviewSource.value.size)}${
            sourcePreviewSource.value.durationSeconds
              ? ` · 재생 시간 ${formatMediaDuration(sourcePreviewSource.value.durationSeconds)}`
              : ''
          }`,
          status:
            sourcePreviewSource.value.status === 'uploading'
              ? '업로드 중'
              : sourcePreviewSource.value.status === 'uploaded'
                ? '업로드 완료'
                : '업로드 실패',
        }
    : undefined;

  useLayoutEffect(() => {
    const previous = previousSourcePositions.current;
    previousSourcePositions.current = undefined;
    if (!previous || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    sourceOrderItemRefs.current.forEach((item, sourceId) => {
      const previousTop = previous.get(sourceId);
      if (previousTop === undefined) return;
      const offset = previousTop - item.getBoundingClientRect().top;
      if (Math.abs(offset) < 1) return;
      item.animate?.(
        [{ transform: `translate3d(0, ${offset}px, 0)` }, { transform: 'translate3d(0, 0, 0)' }],
        { duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      );
    });
  }, [draggedSourceId, meta.sourceOrder]);

  const informationSourceLabel = sourceCount > 0 ? `자료 ${sourceCount}개` : '자료 선택 전';
  const sourceCurriculumDraft = buildSourceCurriculum({
    kind: meta.source,
    classTitle: draft.title,
    classSummary: draft.summary,
    links: meta.links.map(({ id, url, title, provider, durationSeconds }) => ({
      id,
      url,
      title,
      provider,
      durationSeconds,
    })),
    materials: meta.materials.map(({ id, name, url, durationSeconds, contentType }) => ({
      id,
      name,
      url,
      durationSeconds,
      contentType,
    })),
    sourceOrder: meta.sourceOrder,
  });
  const willPublish = Boolean(editId || sourceCurriculumDraft.lessons.length);
  const shareUrl = useMemo(
    () =>
      meta.shareToken
        ? `${typeof window === 'undefined' ? 'https://oneclickclass.kr' : window.location.origin}/s/${meta.shareToken}`
        : '',
    [meta.shareToken],
  );
  const persistDraftSnapshot = useCallback(() => {
    if (editLoading || stepRef.current === 4) return true;
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = undefined;
    }
    try {
      if (editId) saveClassPreview(editId, draftRef.current);
      else saveClassDraft(draftRef.current);
      sessionStorage.setItem(
        metaStorageKey,
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
  }, [editId, editLoading, metaStorageKey]);

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
    if (editLoading || step === 4) return;
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
      videoMetadataAbort.current?.abort();
      sourcePointerCleanup.current?.();
      if (sourceDragFrame.current) window.cancelAnimationFrame(sourceDragFrame.current);
      if (sourceMoveTimer.current) window.clearTimeout(sourceMoveTimer.current);
      if (sourceAddTimer.current) window.clearTimeout(sourceAddTimer.current);
      if (removedSourceTimer.current) window.clearTimeout(removedSourceTimer.current);
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
    setDraft((current) => ({
      ...current,
      type: nextType,
      capacity: nextType === 'online' ? current.capacity : current.capacity || 20,
    }));
    setMeta((current) => ({
      ...current,
      deliverySelected: true,
      source: sourceKindFor(current.links, current.materials),
    }));
    setError('');
  }

  async function startAnalysis() {
    const analysisSourceKind = sourceKindFor(meta.links, meta.materials);
    if (!sourceIsReady(meta) || analysisSourceKind === 'none') {
      setError('분석할 링크나 파일을 먼저 추가해 주세요.');
      return;
    }
    analysisAbort.current?.abort();
    const controller = new AbortController();
    analysisAbort.current = controller;
    setError('');
    setVideoUrlError('');
    setMeta((current) => ({ ...current, informationMode: 'analyzing' }));
    try {
      const orderedLinks = orderedSources.flatMap((source) =>
        source.kind === 'link' ? [source.value] : [],
      );
      const orderedMaterials = orderedSources.flatMap((source) =>
        source.kind === 'material' ? [source.value] : [],
      );
      const result = await classService.analyzeSource(
        {
          type,
          source: {
            kind: analysisSourceKind,
            links: orderedLinks.map(({ url, provider, title }) => ({
              url,
              provider,
              title,
              name: title || new URL(url).hostname.replace(/^www\./, ''),
            })),
            materials: orderedMaterials.map((file) => ({
              url: file.url!,
              name: file.name,
              type: file.type,
              size: file.size,
              durationSeconds: file.durationSeconds,
              contentType: file.contentType,
            })),
          },
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setDraft((current) => {
        return {
          ...current,
          title: result.title || current.title,
          summary: result.summary || current.summary,
          description: result.description || current.description,
          thumbnail: result.thumbnailUrl || current.thumbnail,
          price: result.price ?? current.price,
          payment: result.payment ?? (result.price ? 'paid' : current.payment),
          capacity: result.capacity ?? current.capacity,
          startDate: result.startDate ?? current.startDate,
          recruitEndDate: result.recruitEndDate ?? current.recruitEndDate,
          address: result.address ?? current.address,
          detailedAddress: result.detailedAddress ?? current.detailedAddress,
          instructorName: result.instructorName ?? current.instructorName,
          instructorBio: result.instructorBio ?? current.instructorBio,
          instructorImage: result.instructorImage ?? current.instructorImage,
          instructorLinks:
            result.instructorLinks ??
            meta.links.filter((link) => link.provider === 'SOCIAL').map((link) => link.url),
        };
      });
      setMeta((current) => ({
        ...current,
        informationMode: 'generated',
        thumbnailOrigin: result.thumbnailUrl ? 'ai' : current.thumbnailOrigin,
        videoMetadata: result.sourceMetadata
          ? { ...current.videoMetadata, ...result.sourceMetadata }
          : current.videoMetadata,
      }));
      setMaxStep((current) => Math.max(current, 3));
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      if (controller.signal.aborted) return;
      setMeta((current) => ({ ...current, informationMode: 'analysis-error' }));
    }
  }

  function cancelAnalysis() {
    analysisAbort.current?.abort();
    analysisAbort.current = undefined;
    setMeta((current) => ({ ...current, informationMode: 'source' }));
  }

  function resetSource() {
    analysisAbort.current?.abort();
    videoMetadataAbort.current?.abort();
    sourceFiles.current.clear();
    setFileOptionsOpen(true);
    setMeta((current) => ({
      ...current,
      source: 'none',
      linkInput: '',
      links: [],
      videoUrl: '',
      videoProvider: '',
      videoConnected: false,
      videoMetadata: undefined,
      materials: [],
      sourceOrder: [],
      informationMode: 'source',
    }));
    setVideoUrlError('');
    setRecentlyAddedSourceIds([]);
    if (sourceAddTimer.current) window.clearTimeout(sourceAddTimer.current);
    if (removedSourceTimer.current) window.clearTimeout(removedSourceTimer.current);
    removedSourceRef.current = undefined;
    setRemovedSource(null);
    setError('');
  }

  function markSourcesAdded(sourceIds: string[]) {
    if (sourceAddTimer.current) window.clearTimeout(sourceAddTimer.current);
    setRecentlyAddedSourceIds(sourceIds);
    sourceAddTimer.current = window.setTimeout(() => {
      setRecentlyAddedSourceIds([]);
      sourceAddTimer.current = undefined;
    }, 1800);
  }

  async function addSourceLinks(rawValue: string) {
    const urls = sourceUrlsFromInput(rawValue);
    if (!urls.length) {
      setVideoUrlError('추가할 자료의 링크를 입력해 주세요.');
      return;
    }
    const invalidUrl = urls.find((url) => validateContentUrl(url, 'document'));
    const validationError = invalidUrl ? validateContentUrl(invalidUrl, 'document') : '';
    if (validationError) {
      setVideoUrlError(validationError);
      return;
    }
    const existingUrls = new Set(meta.links.map((link) => link.url));
    const additions = urls
      .filter((url) => !existingUrls.has(url))
      .map((url) => ({
        id: crypto.randomUUID(),
        url,
        provider: detectContentProvider(url, 'link'),
      }));
    if (!additions.length) {
      setVideoUrlError('이미 추가한 링크예요. 다른 자료 주소를 입력해 주세요.');
      return;
    }
    setVideoUrlError('');
    setMeta((current) => ({
      ...current,
      linkInput: '',
      links: [...current.links, ...additions],
      sourceOrder: [
        ...normalizeSourceOrder(current.sourceOrder, current.links, current.materials),
        ...additions.map((link) => link.id),
      ],
      source: sourceKindFor([...current.links, ...additions], current.materials),
      informationMode: 'source',
    }));
    markSourcesAdded(additions.map((link) => link.id));
    await Promise.all(
      additions.map(async ({ id, url, provider }) => {
        if (!isSupportedVideoProvider(provider)) return;
        const controller = new AbortController();
        try {
          const metadata = await classService.inspectVideo(url, provider, controller.signal);
          setMeta((current) => ({
            ...current,
            links: current.links.map((link) => (link.id === id ? { ...link, ...metadata } : link)),
          }));
        } catch {
          // The URL itself remains useful even when optional metadata cannot be loaded.
        }
      }),
    );
  }

  async function addSourceLink() {
    await addSourceLinks(meta.linkInput);
  }

  function addPastedSourceLinks(event: ClipboardEvent<HTMLInputElement>) {
    const value = event.clipboardData.getData('text');
    if (!value.trim()) return;
    event.preventDefault();
    void addSourceLinks(value);
  }

  async function pasteSourceLinks() {
    try {
      const value = await navigator.clipboard.readText();
      await addSourceLinks(value);
    } catch {
      setVideoUrlError('클립보드를 읽지 못했어요. 입력란에 직접 붙여넣어 주세요.');
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

    const invalid = selected.find((file) => {
      const contentType = materialContentType(file.name, file.type);
      const maxSize =
        contentType === 'video'
          ? classCreationLimits.videoBytes
          : classCreationLimits.documentBytes;
      return !isSupportedClassSourceFile(file, contentType) || file.size > maxSize;
    });
    if (invalid) {
      const contentType = materialContentType(invalid.name, invalid.type);
      setError(
        contentType === 'video'
          ? `${classCreationFileTypes.video.label} 형식의 ${videoFileLimitLabel} 이하 영상 파일을 추가해 주세요.`
          : `${classCreationFileTypes.document.label} 형식의 ${documentFileLimitLabel} 이하 파일을 추가해 주세요.`,
      );
      return;
    }

    analysisAbort.current?.abort();
    const materials: UploadedMaterial[] = selected.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type || file.name.split('.').pop()?.toUpperCase() || 'FILE',
      size: file.size,
      contentType: materialContentType(file.name, file.type),
      status: 'uploading',
    }));
    materials.forEach((material, index) => sourceFiles.current.set(material.id, selected[index]));
    setMeta((current) => {
      const nextMaterials = [...current.materials, ...materials];
      return {
        ...current,
        materials: nextMaterials,
        sourceOrder: [
          ...normalizeSourceOrder(current.sourceOrder, current.links, current.materials),
          ...materials.map((file) => file.id),
        ],
        source: sourceKindFor(current.links, nextMaterials),
        informationMode: 'source',
      };
    });
    setError('');

    materials.forEach((material, index) => {
      if (material.contentType !== 'video') return;
      void readVideoDuration(selected[index]).then((durationSeconds) => {
        if (durationSeconds) updateMaterial(material.id, { durationSeconds });
      });
    });

    const results = await Promise.all(
      selected.map((file, index) => uploadMaterial(materials[index].id, file)),
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
      removeMaterial(file.id, false);
      requestAnimationFrame(() => sourceFileInputRef.current?.click());
      return;
    }
    setError('');
    const uploaded = await uploadMaterial(file.id, originalFile);
    if (!uploaded) setError('파일을 다시 업로드하지 못했어요. 네트워크 상태를 확인해 주세요.');
  }

  function openSourcePreview(sourceId: string) {
    setSourcePreviewId(sourceId);
  }

  function closeSourcePreview(restoreFocus = true) {
    const activeId = sourcePreviewId;
    setSourcePreviewId('');
    if (restoreFocus) {
      requestAnimationFrame(() => sourcePreviewTriggerRefs.current.get(activeId)?.focus());
    }
  }

  function showAdjacentSourcePreview(offset: -1 | 1) {
    if (sourcePreviewIndex < 0 || previewableSources.length < 2) return;
    const nextIndex =
      (sourcePreviewIndex + offset + previewableSources.length) % previewableSources.length;
    setSourcePreviewId(previewableSources[nextIndex].id);
  }

  function finalizeRemovedSource() {
    const pending = removedSourceRef.current;
    if (pending?.source.kind === 'material') sourceFiles.current.delete(pending.source.id);
    if (removedSourceTimer.current) window.clearTimeout(removedSourceTimer.current);
    removedSourceTimer.current = undefined;
    removedSourceRef.current = undefined;
    setRemovedSource(null);
  }

  function removeSource(source: OrderedSource, undoable = true) {
    if (sourcePreviewId === source.id) closeSourcePreview(false);
    if (removedSourceRef.current) finalizeRemovedSource();
    const pending: RemovedSource = {
      source,
      orderIndex: orderedSources.findIndex((item) => item.id === source.id),
      localFile: source.kind === 'material' ? sourceFiles.current.get(source.id) : undefined,
    };
    if (undoable) {
      removedSourceRef.current = pending;
      setRemovedSource(pending);
      removedSourceTimer.current = window.setTimeout(finalizeRemovedSource, SOURCE_UNDO_DELAY_MS);
    } else if (source.kind === 'material') {
      sourceFiles.current.delete(source.id);
    }
    setMeta((current) => {
      const links = current.links.filter((link) => link.id !== source.id);
      const materials = current.materials.filter((file) => file.id !== source.id);
      return {
        ...current,
        links,
        materials,
        sourceOrder: current.sourceOrder.filter((sourceId) => sourceId !== source.id),
        source: sourceKindFor(links, materials),
        informationMode: 'source',
      };
    });
  }

  function removeSourceLink(id: string) {
    const source = orderedSources.find((item) => item.kind === 'link' && item.id === id);
    if (source) removeSource(source);
  }

  function removeMaterial(id: string, undoable = true) {
    const source = orderedSources.find((item) => item.kind === 'material' && item.id === id);
    if (source) removeSource(source, undoable);
  }

  function undoSourceRemoval() {
    const pending = removedSourceRef.current;
    if (!pending) return;
    if (removedSourceTimer.current) window.clearTimeout(removedSourceTimer.current);
    removedSourceTimer.current = undefined;
    removedSourceRef.current = undefined;
    setRemovedSource(null);
    if (pending.localFile) sourceFiles.current.set(pending.source.id, pending.localFile);
    setMeta((current) => {
      const links =
        pending.source.kind === 'link' ? [...current.links, pending.source.value] : current.links;
      const materials =
        pending.source.kind === 'material'
          ? [...current.materials, pending.source.value]
          : current.materials;
      const order = normalizeSourceOrder(current.sourceOrder, links, materials).filter(
        (sourceId) => sourceId !== pending.source.id,
      );
      order.splice(Math.min(Math.max(0, pending.orderIndex), order.length), 0, pending.source.id);
      return {
        ...current,
        links,
        materials,
        sourceOrder: order,
        source: sourceKindFor(links, materials),
        informationMode: 'source',
      };
    });
  }

  function queueSourceDragPreviewPosition(x: number, y: number, pointerType: string) {
    sourceDragPoint.current = sourceDragPreviewPosition(x, y, pointerType);
    if (sourceDragFrame.current) return;
    sourceDragFrame.current = window.requestAnimationFrame(() => {
      sourceDragFrame.current = undefined;
      const preview = sourceDragPreviewRef.current;
      if (!preview) return;
      preview.style.setProperty('--source-drag-x', `${sourceDragPoint.current.x}px`);
      preview.style.setProperty('--source-drag-y', `${sourceDragPoint.current.y}px`);
    });
  }

  function markSourceMoved(sourceId: string) {
    setRecentlyMovedSourceId(sourceId);
    if (sourceMoveTimer.current) window.clearTimeout(sourceMoveTimer.current);
    sourceMoveTimer.current = window.setTimeout(() => {
      setRecentlyMovedSourceId('');
      sourceMoveTimer.current = undefined;
    }, 280);
  }

  function rememberSourcePositions() {
    previousSourcePositions.current = new Map(
      Array.from(sourceOrderItemRefs.current, ([sourceId, item]) => [
        sourceId,
        item.getBoundingClientRect().top,
      ]),
    );
  }

  function moveSourceToIndex(sourceId: string, insertionIndex: number) {
    if (!sourceId || insertionIndex < 0) return;
    rememberSourcePositions();
    setMeta((current) => {
      const currentSources = orderedCreationSources(current);
      const lessonIds = currentSources
        .filter((source) => source.kind !== 'link' || source.value.provider !== 'SOCIAL')
        .map((source) => source.id);
      const profileIds = currentSources
        .filter((source) => source.kind === 'link' && source.value.provider === 'SOCIAL')
        .map((source) => source.id);
      const sourceIndex = lessonIds.indexOf(sourceId);
      if (sourceIndex < 0) return current;
      const nextLessonIds = lessonIds.filter((id) => id !== sourceId);
      const nextIndex = Math.min(Math.max(0, insertionIndex), nextLessonIds.length);
      if (sourceIndex === nextIndex) return current;
      nextLessonIds.splice(nextIndex, 0, sourceId);
      return {
        ...current,
        sourceOrder: [...nextLessonIds, ...profileIds],
        informationMode: stepRef.current === 3 ? current.informationMode : 'source',
      };
    });
  }

  function announceSourceMove(sourceId: string, insertionIndex: number) {
    const source = lessonSources.find((item) => item.id === sourceId);
    if (!source || insertionIndex < 0) return;
    const label =
      source.kind === 'link'
        ? source.value.title || sourceLinkHost(source.value.url)
        : source.value.name;
    setSourceOrderAnnouncement(`${label} 차시를 ${insertionIndex + 1}번째로 이동했어요.`);
  }

  function moveSourceBy(sourceId: string, offset: -1 | 1) {
    const sourceIndex = lessonSources.findIndex((source) => source.id === sourceId);
    const insertionIndex = sourceIndex + offset;
    if (sourceIndex < 0 || insertionIndex < 0 || insertionIndex >= lessonSources.length) return;
    moveSourceToIndex(sourceId, insertionIndex);
    announceSourceMove(sourceId, insertionIndex);
    markSourceMoved(sourceId);
  }

  function updateSourceInsertion(sourceId: string, pointerY: number) {
    const list = sourceOrderListRef.current;
    if (!list) return;
    const items = Array.from(
      list.querySelectorAll<HTMLLIElement>('[data-source-group="lesson"]'),
    ).filter((item) => item.dataset.sourceId !== sourceId);
    const nextIndex = items.findIndex((item) => {
      const bounds = item.getBoundingClientRect();
      return pointerY < bounds.top + bounds.height / 2;
    });
    const insertionIndex = nextIndex < 0 ? items.length : nextIndex;
    if (pointerInsertionIndex.current === insertionIndex) return;
    pointerInsertionIndex.current = insertionIndex;
    moveSourceToIndex(sourceId, insertionIndex);
  }

  function finishSourceDrag(sourceId: string) {
    const insertionIndex = pointerInsertionIndex.current;
    if (sourceId && insertionIndex >= 0 && pointerStartIndex.current !== insertionIndex) {
      announceSourceMove(sourceId, insertionIndex);
      markSourceMoved(sourceId);
    }
    if (sourceDragFrame.current) {
      window.cancelAnimationFrame(sourceDragFrame.current);
      sourceDragFrame.current = undefined;
    }
    sourcePointerCleanup.current?.();
    rememberSourcePositions();
    pointerSourceId.current = '';
    pointerStartIndex.current = -1;
    pointerInsertionIndex.current = -1;
    setDraggedSourceId('');
    setSourceDragPreview(null);
  }

  function cancelSourceDrag(sourceId: string) {
    if (sourceId && pointerStartIndex.current >= 0) {
      moveSourceToIndex(sourceId, pointerStartIndex.current);
    }
    finishSourceDrag('');
  }

  function listenForSourcePointer(pointerId: number, pointerType: string) {
    sourcePointerCleanup.current?.();
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId || !pointerSourceId.current) return;
      event.preventDefault();
      queueSourceDragPreviewPosition(event.clientX, event.clientY, pointerType);
      updateSourceInsertion(pointerSourceId.current, event.clientY);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      finishSourceDrag(pointerSourceId.current);
    };
    const handlePointerCancel = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      cancelSourceDrag(pointerSourceId.current);
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      if (sourcePointerCleanup.current === cleanup) sourcePointerCleanup.current = undefined;
    };
    sourcePointerCleanup.current = cleanup;
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
  }

  function getInformationErrors(): FieldErrors {
    const errors: FieldErrors = {};
    if (!draft.title.trim()) errors.title = '제목을 입력해 주세요.';
    if (!draft.summary.trim()) errors.summary = '소개를 입력해 주세요.';
    else if (draft.summary.trim().length < 10) errors.summary = '소개를 10자 이상 입력해 주세요.';
    if (!draft.description.trim()) errors.description = '내용을 입력해 주세요.';
    else if (draft.description.trim().length < 20)
      errors.description = '내용을 20자 이상 입력해 주세요.';
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

  function clearFieldError(field: FormField) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function goToStep(nextStep: number) {
    if (nextStep < 1 || nextStep > 3) return;
    setError('');
    setFieldErrors({});
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function submitFlow(event: FormEvent) {
    event.preventDefault();
    if (step === 1) {
      if (!meta.deliverySelected) {
        setError('클래스 진행 방식을 선택해 주세요.');
        return;
      }
      setError('');
      setMaxStep((current) => Math.max(current, 2));
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step !== 3) return;

    if (!editId && !sourceIsReady(meta)) {
      setError('클래스를 만들려면 링크나 파일이 하나 이상 필요해요.');
      setStep(2);
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
      setError(settingsError);
      if (first && first !== 'recruitEndDate') {
        setHighlightField(first as EditableField);
      }
      requestAnimationFrame(() => {
        if (!first) return;
        document.querySelector(`[data-preview-field="${first}"]`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
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
      sections = await curriculumService.createSection(classId, sourceCurriculumDraft.sectionTitle);
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
      if (!editId) clearClassDraft();
      sessionStorage.removeItem(metaStorageKey);
      setSaveStatus('saved');
      setMaxStep(4);
      setStep(4);
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
      setMeta((current) => ({ ...current, thumbnailOrigin: 'user' }));
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
      document.querySelector<HTMLElement>(`[data-preview-field="${field}"] button`)?.focus();
    });
  }

  function startInlineEdit(field: EditableField) {
    if (field === 'startDate') {
      setScheduleEditValue({
        date: scheduleDateValue(draft.startDate),
        time: scheduleTimeValue(draft.startDate),
      });
    } else if (field === 'instructorName') {
      inlineOriginal.current = {
        ...inlineOriginal.current,
        instructorName: draft.instructorName,
        instructorBio: draft.instructorBio,
      };
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
        document.querySelector<HTMLElement>('[data-preview-field="startDate"] button')?.focus();
      });
      return;
    }
    if (field === 'instructorName') {
      setDraft((current) => ({
        ...current,
        instructorName: inlineOriginal.current.instructorName ?? current.instructorName,
        instructorBio: inlineOriginal.current.instructorBio ?? current.instructorBio,
      }));
      finishInlineEdit(field);
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
    sourceFiles.current.clear();
    setFileOptionsOpen(true);
    sessionStorage.removeItem(CLASS_CREATION_META_KEY);
    sessionStorage.removeItem(metaStorageKey);
    setDraft(initialClassDraft);
    setMeta(initialCreationMeta);
    setStep(1);
    setMaxStep(3);
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
    <main
      className={`class-creator ${step === 3 ? 'is-preview-step' : ''} ${
        step === 2 && sourcePreviewItem ? 'has-source-preview' : ''
      } ${step === 2 && hasSources ? 'has-sources' : ''}`}
    >
      <header className="creator-progress">
        <button className="creator-brand" type="button" onClick={() => leaveCreator('/dashboard')}>
          <span aria-hidden="true">
            <Check />
          </span>
          <strong>원클릭 클래스</strong>
        </button>
        <nav className="creator-progress-inner" aria-label="클래스 만들기 진행률">
          <div className="creator-progress-copy">
            <span className="creator-progress-step">{Math.min(step, 3)}/3</span>
            <span className="creator-progress-label">{workspaceLabel}</span>
          </div>
          <div
            className="creator-progress-track"
            role="progressbar"
            aria-label="클래스 만들기 진행률"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-valuetext={`${Math.min(step, 3)}/3 ${workspaceLabel} 진행 중`}
          >
            <span style={{ transform: `scaleX(${progressPercent / 100})` }} />
          </div>
        </nav>
        <div className="creator-progress-actions">
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
                <span>저장 실패 · 다시 시도</span>
              </button>
            ) : (
              <>
                {saveStatus === 'saving' ? <LoaderCircle className="spin" /> : <Check />}
                <span>{saveStatus === 'saving' ? '저장 중...' : '저장됨'}</span>
              </>
            )}
          </div>
          <button className="creator-exit" type="button" onClick={() => leaveCreator('/classes')}>
            나가기
          </button>
        </div>
      </header>

      <form className="creator-form" onSubmit={submitFlow}>
        {step < 4 && (
          <header className={`creator-step-heading ${step === 1 ? 'is-wide' : ''}`}>
            <h1>
              {step === 2 && hasSources
                ? '예상 차시를 확인해 주세요'
                : step === 3 && editId
                  ? '클래스 정보를 확인해 주세요'
                  : stepInfo.title}
            </h1>
            <p>
              {step === 2
                ? hasSources
                  ? '수업 자료는 차시로, 강사 소개 링크는 프로필 정보로 반영돼요.'
                  : '링크를 붙여넣거나 컴퓨터의 파일을 추가하면 AI가 자료를 분석해요.'
                : step === 3 && editId
                  ? '기존 정보를 수정하고 바로 다시 게시할 수 있어요.'
                  : stepInfo.description}
            </p>
          </header>
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
                  aria-label={option.label}
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
          <section
            className={`creator-information ${sourcePreviewItem ? 'has-source-preview' : ''}`}
          >
            <div
              className={`source-card ${hasSources ? 'has-sources' : ''} ${
                sourceLocked ? 'is-busy' : ''
              }`}
            >
              <div className="source-card-title">
                <i>{hasSources ? <FileText /> : <Link2 />}</i>
                <span>
                  <h2>{hasSources ? '차시 구성' : '수업 자료 추가'}</h2>
                  <p>
                    {hasSources
                      ? '수업 자료 순서대로 차시가 만들어져요.'
                      : '링크를 붙여넣거나 컴퓨터에서 파일을 선택하세요.'}
                  </p>
                </span>
              </div>
              {hasSources && (
                <button
                  ref={sourceAddToggleRef}
                  className="source-add-toggle"
                  type="button"
                  aria-expanded={sourceAddOpen}
                  aria-controls="source-add-fields"
                  onClick={() => setSourceAddOpen((current) => !current)}
                >
                  <Plus />
                  <span>
                    <b>{sourceAddOpen ? '자료 입력 접기' : '자료 더 추가'}</b>
                    <small>
                      {sourceAddOpen
                        ? '입력 영역을 접고 예상 차시를 확인해요'
                        : '링크 또는 컴퓨터 파일'}
                    </small>
                  </span>
                  <ChevronRight />
                </button>
              )}
              <div
                className="source-add-fields"
                id="source-add-fields"
                hidden={hasSources && !sourceAddOpen}
              >
                <div className={`source-link-input ${videoUrlError ? 'invalid' : ''}`}>
                  <Globe2 />
                  <label>
                    <span className="sr-only">자료 링크</span>
                    <input
                      type="url"
                      value={meta.linkInput}
                      disabled={sourceLocked}
                      onChange={(event) => {
                        setMeta((current) => ({
                          ...current,
                          linkInput: event.target.value,
                        }));
                        setVideoUrlError('');
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;
                        event.preventDefault();
                        void addSourceLink();
                      }}
                      onPaste={addPastedSourceLinks}
                      placeholder="링크를 붙여넣으면 바로 추가돼요"
                      aria-invalid={Boolean(videoUrlError)}
                      aria-describedby={videoUrlError ? 'source-link-error' : undefined}
                    />
                  </label>
                  <button
                    className="source-paste-button"
                    type="button"
                    aria-label="클립보드 링크 붙여넣기"
                    disabled={sourceLocked}
                    onClick={() => void pasteSourceLinks()}
                  >
                    <ClipboardPaste />
                    <span>붙여넣기</span>
                  </button>
                  <button
                    className="source-add-button"
                    type="button"
                    aria-label="링크 추가"
                    disabled={sourceLocked || !meta.linkInput.trim()}
                    onClick={() => void addSourceLink()}
                  >
                    <Plus />
                  </button>
                </div>
                {videoUrlError && (
                  <p className="field-message error" id="source-link-error" role="alert">
                    <CircleAlert />
                    {videoUrlError}
                  </p>
                )}
                {recentlyAddedSourceIds.length > 0 && !videoUrlError && (
                  <p
                    className="field-message success source-link-feedback"
                    key={recentlyAddedSourceIds.join('-')}
                    role="status"
                    aria-live="polite"
                  >
                    <Check /> 링크 {recentlyAddedSourceIds.length}개가 추가됐어요.
                  </p>
                )}
                <details
                  className="source-file-option"
                  open={fileOptionsOpen}
                  onToggle={(event) => setFileOptionsOpen(event.currentTarget.open)}
                >
                  <summary>
                    <span>
                      <Upload />
                      <b>컴퓨터 파일 추가</b>
                      <small>영상, PDF, PPT, 문서와 이미지</small>
                    </span>
                    <ChevronRight />
                  </summary>
                  <label
                    className={`material-dropzone ${sourceDragActive ? 'is-dragging' : ''} ${
                      sourceLocked ? 'is-disabled' : ''
                    }`}
                    onDragOver={(event: DragEvent<HTMLLabelElement>) => {
                      event.preventDefault();
                      if (!sourceLocked) setSourceDragActive(true);
                    }}
                    onDragLeave={(event: DragEvent<HTMLLabelElement>) => {
                      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                      setSourceDragActive(false);
                    }}
                    onDrop={(event: DragEvent<HTMLLabelElement>) => {
                      event.preventDefault();
                      setSourceDragActive(false);
                      if (!sourceLocked)
                        void handleSourceFiles(Array.from(event.dataTransfer.files));
                    }}
                  >
                    <input
                      ref={sourceFileInputRef}
                      type="file"
                      accept={sourceFileAccept}
                      multiple
                      disabled={sourceLocked}
                      onChange={addSourceFiles}
                    />
                    <i>
                      <Upload />
                    </i>
                    <b>파일을 끌어놓거나 클릭해 추가하세요</b>
                    <span>
                      영상 최대 {videoFileLimitLabel} · 문서 최대 {documentFileLimitLabel} · 여러
                      파일 선택 가능
                    </span>
                  </label>
                </details>
                {hasSources && (
                  <button className="source-add-done" type="button" onClick={closeSourceAddFields}>
                    <Check />
                    자료 추가 완료
                  </button>
                )}
              </div>

              <div className="source-primary-actions">
                <button
                  className="source-back-button"
                  type="button"
                  disabled={sourceLocked}
                  onClick={() => goToStep(1)}
                >
                  <ArrowLeft />
                  이전
                </button>
                <button
                  className="analyze-source-button"
                  type="button"
                  onClick={() => void startAnalysis()}
                  disabled={!sourceIsReady(meta) || sourceLocked}
                >
                  <Sparkles />
                  <span>
                    <b>AI로 미리보기 만들기</b>
                    <small>
                      {lessonSourceCount
                        ? `${lessonSourceCount}개 수업 자료로 차시와 클래스 정보를 준비해요`
                        : '차시로 만들 링크나 파일을 1개 이상 추가해 주세요'}
                    </small>
                  </span>
                  <ArrowRight />
                </button>
              </div>

              {orderedSources.length > 0 && (
                <section className="source-order-section" aria-labelledby="source-order-title">
                  <div className="source-order-heading">
                    <span>
                      <h3 id="source-order-title">예상 차시</h3>
                      <p id="source-order-help">자료를 미리 보고 원하는 순서로 바꿀 수 있어요.</p>
                    </span>
                    <small>{lessonSourceCount}개 차시</small>
                  </div>
                  {lessonSourceCount === 0 && (
                    <p className="source-order-empty">
                      차시로 만들 링크나 파일을 추가하면 여기에 예상 순서가 표시돼요.
                    </p>
                  )}
                  <ol ref={sourceOrderListRef} className="source-order-list">
                    {displayedSources.map((source) => {
                      const link = source.kind === 'link' ? source.value : undefined;
                      const file = source.kind === 'material' ? source.value : undefined;
                      const isProfile = link?.provider === 'SOCIAL';
                      const groupSources = isProfile ? profileSources : lessonSources;
                      const index = groupSources.findIndex((item) => item.id === source.id);
                      const title = link
                        ? link.title || sourceLinkHost(link.url)
                        : (file?.name ?? '자료');
                      const videoSource = link
                        ? isSupportedVideoProvider(link.provider)
                        : file?.contentType === 'video';
                      const sourceLabel = link
                        ? contentProviderLabel[link.provider]
                        : file?.contentType === 'video'
                          ? '영상 파일'
                          : '문서 파일';
                      return (
                        <Fragment key={source.id}>
                          {isProfile && index === 0 && (
                            <li className="source-profile-heading" role="presentation">
                              <span>
                                <Users />
                                <b>강사 소개 링크</b>
                              </span>
                              <small>{profileSources.length}개</small>
                            </li>
                          )}
                          <li
                            className={`source-order-item ${isProfile ? 'is-profile-source' : ''} ${
                              draggedSourceId === source.id ? 'is-dragging' : ''
                            } ${recentlyMovedSourceId === source.id ? 'is-recently-moved' : ''} ${
                              recentlyAddedSourceIds.includes(source.id) ? 'is-recently-added' : ''
                            } ${sourcePreviewId === source.id ? 'is-preview-selected' : ''}`}
                            ref={(item) => {
                              if (item) sourceOrderItemRefs.current.set(source.id, item);
                              else sourceOrderItemRefs.current.delete(source.id);
                            }}
                            data-source-id={source.id}
                            data-source-group={isProfile ? 'profile' : 'lesson'}
                            aria-posinset={index + 1}
                            aria-setsize={groupSources.length}
                          >
                            {isProfile ? (
                              <span className="source-order-handle is-static" aria-hidden="true">
                                <span>소개</span>
                              </span>
                            ) : (
                              <button
                                className="source-order-handle"
                                type="button"
                                disabled={sourceLocked}
                                aria-label={`${title} 순서 이동. 위아래 방향키를 사용할 수 있어요.`}
                                aria-describedby="source-order-help"
                                onKeyDown={(event) => {
                                  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                                  event.preventDefault();
                                  moveSourceBy(source.id, event.key === 'ArrowUp' ? -1 : 1);
                                }}
                                onPointerDown={(event) => {
                                  if (sourceLocked) return;
                                  event.preventDefault();
                                  rememberSourcePositions();
                                  pointerSourceId.current = source.id;
                                  pointerStartIndex.current = index;
                                  pointerInsertionIndex.current = index;
                                  listenForSourcePointer(event.pointerId, event.pointerType);
                                  setDraggedSourceId(source.id);
                                  const previewPosition = sourceDragPreviewPosition(
                                    event.clientX,
                                    event.clientY,
                                    event.pointerType,
                                  );
                                  setSourceDragPreview({
                                    id: source.id,
                                    pointerType: event.pointerType,
                                    ...previewPosition,
                                  });
                                }}
                              >
                                <GripVertical />
                              </button>
                            )}
                            <button
                              ref={(button) => {
                                if (button) sourcePreviewTriggerRefs.current.set(source.id, button);
                                else sourcePreviewTriggerRefs.current.delete(source.id);
                              }}
                              className="source-order-preview-trigger"
                              type="button"
                              aria-label={`${title} 미리보기`}
                              aria-pressed={sourcePreviewId === source.id}
                              disabled={sourceLocked}
                              onClick={() => openSourcePreview(source.id)}
                            >
                              <i className="source-order-icon">
                                {videoSource ? (
                                  <Play />
                                ) : link?.provider === 'SOCIAL' ? (
                                  <Users />
                                ) : link && link.provider !== 'DOCUMENT' ? (
                                  <Globe2 />
                                ) : (
                                  <FileText />
                                )}
                              </i>
                              <span className="source-order-copy">
                                <small>
                                  <span>{isProfile ? '소개' : index + 1}</span>
                                  <span>{sourceLabel}</span>
                                </small>
                                <b>{title}</b>
                                <em>
                                  {link
                                    ? link.url
                                    : `${formatBytes(file?.size ?? 0)} · ${
                                        file?.status === 'uploading'
                                          ? file.progress === undefined
                                            ? '업로드 중'
                                            : `업로드 중 ${file.progress}%`
                                          : file?.status === 'uploaded'
                                            ? '업로드 완료'
                                            : '업로드 실패'
                                      }${
                                        file?.durationSeconds
                                          ? ` · 재생 시간 ${formatMediaDuration(file.durationSeconds)}`
                                          : ''
                                      }`}
                                </em>
                                {file?.status === 'uploading' && (
                                  <span
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
                                  </span>
                                )}
                              </span>
                              <span className="source-order-preview-action" aria-hidden="true">
                                <Eye />
                                미리보기
                              </span>
                            </button>
                            <span className="source-order-state">
                              {isProfile ? (
                                <small>강사 소개용</small>
                              ) : link ? (
                                <Check aria-label={`${title} 링크 추가 완료`} className="success" />
                              ) : file?.status === 'uploaded' ? (
                                <Check
                                  aria-label={`${file.name} 업로드 완료`}
                                  className="success"
                                />
                              ) : file?.status === 'error' ? (
                                <button
                                  className="material-retry"
                                  type="button"
                                  disabled={sourceLocked}
                                  onClick={() => void retryMaterial(file)}
                                >
                                  <RefreshCw />
                                  <span>다시 업로드</span>
                                </button>
                              ) : file ? (
                                <LoaderCircle
                                  aria-label={`${file.name} 업로드 중`}
                                  className="spin"
                                />
                              ) : null}
                            </span>
                            <button
                              className="source-order-remove"
                              type="button"
                              aria-label={`${title} 삭제`}
                              disabled={sourceLocked}
                              onClick={() =>
                                source.kind === 'link'
                                  ? removeSourceLink(source.id)
                                  : removeMaterial(source.id)
                              }
                            >
                              <X />
                            </button>
                            {!isProfile && (
                              <span className="source-order-move">
                                <button
                                  type="button"
                                  disabled={sourceLocked || index === 0}
                                  aria-label={`${title} 차시 위로 이동`}
                                  onClick={() => moveSourceBy(source.id, -1)}
                                >
                                  <ChevronUp />
                                  위로
                                </button>
                                <button
                                  type="button"
                                  disabled={sourceLocked || index === groupSources.length - 1}
                                  aria-label={`${title} 차시 아래로 이동`}
                                  onClick={() => moveSourceBy(source.id, 1)}
                                >
                                  <ChevronDown />
                                  아래로
                                </button>
                              </span>
                            )}
                          </li>
                        </Fragment>
                      );
                    })}
                  </ol>
                  <p className="sr-only" role="status" aria-live="polite">
                    {sourceOrderAnnouncement}
                  </p>
                </section>
              )}
              {sourceDragPreview && previewSource && (
                <div
                  ref={sourceDragPreviewRef}
                  className={`source-drag-preview ${
                    sourceDragPreview.pointerType === 'touch' ? 'is-touch' : ''
                  }`}
                  style={
                    {
                      '--source-drag-x': `${sourceDragPreview.x}px`,
                      '--source-drag-y': `${sourceDragPreview.y}px`,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                >
                  <GripVertical />
                  <span>
                    <small>차시 이동 중</small>
                    <b>{previewSourceTitle}</b>
                  </span>
                </div>
              )}
            </div>
            {sourcePreviewItem && sourcePreviewIndex >= 0 && (
              <SourcePreviewPanel
                item={sourcePreviewItem}
                index={sourcePreviewIndex}
                count={previewableSources.length}
                onClose={closeSourcePreview}
                onPrevious={() => showAdjacentSourcePreview(-1)}
                onNext={() => showAdjacentSourcePreview(1)}
              />
            )}
            {meta.informationMode === 'analyzing' && (
              <AnalysisProgress
                sourceLabel={`${lessonSourceCount}개 수업 자료`}
                onCancel={cancelAnalysis}
              />
            )}

            {meta.informationMode === 'analysis-error' && (
              <div className="analysis-error" role="alert">
                <i>
                  <CircleAlert />
                </i>
                <h2>자료를 확인하지 못했어요</h2>
                <p>링크 주소나 네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
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
                </div>
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="preview-workspace">
            <div className="preview-toolbar">
              <span>
                <Sparkles />
                AI가 만든 공개 페이지를 확인하고 있어요
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
                  썸네일, 클래스 정보와 참가비를 이 화면에서 바로 바꿀 수 있어요.
                </span>
                <button type="button" aria-label="도움말 닫기" onClick={dismissPreviewHint}>
                  <X />
                </button>
              </div>
            )}
            <div className="class-preview-frame">
              <article className="class-public-preview">
                <section className="preview-public-hero" aria-label="클래스 핵심 정보">
                  <div className="preview-hero-media">
                    <div className="preview-cover editable">
                      <ClassThumbnail
                        src={thumbnailPreviewUrl || draft.thumbnail}
                        position={draft.thumbnailPosition}
                        title={draft.title || typeOption.label}
                        alt="클래스 썸네일 미리보기"
                      />
                      {meta.thumbnailOrigin === 'ai' && (
                        <span className="ai-thumbnail-badge">
                          <Sparkles /> AI가 만든 썸네일
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
                        {thumbnailUploadStatus === 'uploading'
                          ? '업로드 중'
                          : '다른 이미지로 바꾸기'}
                        <small>권장 16:9 · 1280×720 이상 · 최대 5MB</small>
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
                      placeholder="제목을 입력해 주세요"
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
                      placeholder="소개를 입력해 주세요"
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
                      <h2>내용</h2>
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
                            aria-label="내용 편집"
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
                        <div className="preview-description-copy">
                          {draft.description ? (
                            <StructuredDescription value={draft.description} />
                          ) : (
                            <p className="empty-copy">내용을 입력해 주세요.</p>
                          )}
                          <button
                            className="preview-copy-trigger"
                            type="button"
                            aria-label="내용 수정"
                            onClick={() => startInlineEdit('description')}
                          />
                          <span className="edit-affordance">
                            <Pencil />
                            클릭하여 수정
                          </span>
                        </div>
                      )}
                    </section>

                    {(draft.instructorName || draft.instructorLinks.length > 0) && (
                      <InstructorProfileEditor
                        active={editField === 'instructorName'}
                        name={draft.instructorName}
                        bio={draft.instructorBio}
                        image={draft.instructorImage}
                        linkCount={draft.instructorLinks.length}
                        onStart={() => startInlineEdit('instructorName')}
                        onNameChange={(instructorName) =>
                          setDraft((current) => ({ ...current, instructorName }))
                        }
                        onBioChange={(instructorBio) =>
                          setDraft((current) => ({ ...current, instructorBio }))
                        }
                        onDone={() => finishInlineEdit('instructorName')}
                        onCancel={() => cancelInlineEdit('instructorName')}
                      />
                    )}

                    {lessonSources.length > 0 && (
                      <section
                        className="preview-curriculum-editor"
                        aria-labelledby="preview-curriculum-title"
                      >
                        <header className="preview-curriculum-heading">
                          <span>
                            <h2 id="preview-curriculum-title">차시 구성</h2>
                            <p id="preview-curriculum-help">
                              자료를 미리 보고 원하는 순서로 바꿀 수 있어요.
                            </p>
                          </span>
                          <span className="preview-curriculum-heading-actions">
                            <small>{lessonSourceCount}개 차시</small>
                            <button type="button" onClick={() => goToStep(2)}>
                              <Pencil />
                              자료 수정
                            </button>
                          </span>
                        </header>
                        <ol ref={sourceOrderListRef} className="preview-curriculum-list">
                          {lessonSources.map((source, index) => {
                            const link = source.kind === 'link' ? source.value : undefined;
                            const file = source.kind === 'material' ? source.value : undefined;
                            const lesson = sourceCurriculumDraft.lessons[index];
                            const title =
                              lesson?.title ||
                              (link
                                ? link.title || sourceLinkHost(link.url)
                                : (file?.name ?? `차시 ${index + 1}`));
                            const videoSource = link
                              ? isSupportedVideoProvider(link.provider)
                              : file?.contentType === 'video';
                            const sourceLabel = link
                              ? contentProviderLabel[link.provider]
                              : file?.contentType === 'video'
                                ? '영상 파일'
                                : '문서 파일';
                            const sourceDetail = link
                              ? link.durationSeconds
                                ? `재생 시간 ${formatMediaDuration(link.durationSeconds)}`
                                : sourceLinkHost(link.url)
                              : `${formatBytes(file?.size ?? 0)}${
                                  file?.durationSeconds
                                    ? ` · 재생 시간 ${formatMediaDuration(file.durationSeconds)}`
                                    : ''
                                }`;
                            return (
                              <li
                                key={source.id}
                                ref={(item) => {
                                  if (item) sourceOrderItemRefs.current.set(source.id, item);
                                  else sourceOrderItemRefs.current.delete(source.id);
                                }}
                                className={`preview-curriculum-item ${
                                  draggedSourceId === source.id ? 'is-dragging' : ''
                                } ${
                                  recentlyMovedSourceId === source.id ? 'is-recently-moved' : ''
                                } ${sourcePreviewId === source.id ? 'is-preview-selected' : ''}`}
                                data-source-id={source.id}
                                data-source-group="lesson"
                              >
                                <button
                                  className="preview-curriculum-handle"
                                  type="button"
                                  aria-label={`${title} 차시 순서 이동. 위아래 방향키를 사용할 수 있어요.`}
                                  aria-describedby="preview-curriculum-help"
                                  onKeyDown={(event) => {
                                    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')
                                      return;
                                    event.preventDefault();
                                    moveSourceBy(source.id, event.key === 'ArrowUp' ? -1 : 1);
                                  }}
                                  onPointerDown={(event) => {
                                    event.preventDefault();
                                    rememberSourcePositions();
                                    pointerSourceId.current = source.id;
                                    pointerStartIndex.current = index;
                                    pointerInsertionIndex.current = index;
                                    listenForSourcePointer(event.pointerId, event.pointerType);
                                    setDraggedSourceId(source.id);
                                    const previewPosition = sourceDragPreviewPosition(
                                      event.clientX,
                                      event.clientY,
                                      event.pointerType,
                                    );
                                    setSourceDragPreview({
                                      id: source.id,
                                      pointerType: event.pointerType,
                                      ...previewPosition,
                                    });
                                  }}
                                >
                                  <GripVertical />
                                </button>
                                <button
                                  ref={(button) => {
                                    if (button)
                                      sourcePreviewTriggerRefs.current.set(source.id, button);
                                    else sourcePreviewTriggerRefs.current.delete(source.id);
                                  }}
                                  className="preview-curriculum-preview"
                                  type="button"
                                  aria-label={`${title} 자료 미리보기`}
                                  aria-pressed={sourcePreviewId === source.id}
                                  onClick={() => openSourcePreview(source.id)}
                                >
                                  <i>{index + 1}</i>
                                  <span>
                                    <small>
                                      {videoSource ? <Play /> : <FileText />}
                                      {sourceLabel}
                                    </small>
                                    <b>{title}</b>
                                    <em>{sourceDetail}</em>
                                  </span>
                                  <span className="preview-curriculum-preview-action">
                                    <Eye />
                                    미리보기
                                  </span>
                                </button>
                                <span className="preview-curriculum-move">
                                  <button
                                    type="button"
                                    aria-label={`${title} 차시 위로 이동`}
                                    disabled={index === 0}
                                    onClick={() => moveSourceBy(source.id, -1)}
                                  >
                                    <ChevronUp />
                                    <span>위로</span>
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`${title} 차시 아래로 이동`}
                                    disabled={index === lessonSources.length - 1}
                                    onClick={() => moveSourceBy(source.id, 1)}
                                  >
                                    <ChevronDown />
                                    <span>아래로</span>
                                  </button>
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                        {profileSources.length > 0 && (
                          <p className="preview-curriculum-profile-note">
                            <Users /> 강사 소개 링크 {profileSources.length}개는 프로필 정보로
                            반영돼요.
                          </p>
                        )}
                        <p className="sr-only" role="status" aria-live="polite">
                          {sourceOrderAnnouncement}
                        </p>
                      </section>
                    )}
                  </div>
                </div>
              </article>
            </div>
            <p className="creator-publish-note">
              <ExternalLink />
              {willPublish
                ? '입력 내용과 첫 차시는 자동 저장됩니다. 게시하면 공유 링크가 활성화돼요.'
                : '게시하려면 링크를 하나 이상 추가해 주세요.'}
            </p>
            {sourceDragPreview && previewSource && (
              <div
                ref={sourceDragPreviewRef}
                className={`source-drag-preview ${
                  sourceDragPreview.pointerType === 'touch' ? 'is-touch' : ''
                }`}
                style={
                  {
                    '--source-drag-x': `${sourceDragPreview.x}px`,
                    '--source-drag-y': `${sourceDragPreview.y}px`,
                  } as CSSProperties
                }
                aria-hidden="true"
              >
                <GripVertical />
                <span>
                  <small>차시 이동 중</small>
                  <b>{previewSourceTitle}</b>
                </span>
              </div>
            )}
            {sourcePreviewItem && sourcePreviewIndex >= 0 && (
              <SourcePreviewPanel
                item={sourcePreviewItem}
                index={sourcePreviewIndex}
                count={previewableSources.length}
                onClose={closeSourcePreview}
                onPrevious={() => showAdjacentSourcePreview(-1)}
                onNext={() => showAdjacentSourcePreview(1)}
              />
            )}
          </section>
        )}

        {step === 4 && (
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

        {(step === 1 || step === 3) && (
          <footer className={`creator-actions ${step === 1 ? 'single' : ''}`}>
            <div className="creator-action-group">
              {step === 3 && (
                <button type="button" className="creator-back" onClick={() => goToStep(2)}>
                  <ArrowLeft />
                  이전
                </button>
              )}
              <button
                className="creator-next"
                type="submit"
                disabled={(step === 1 && !meta.deliverySelected) || submitting}
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="spin" />
                    {willPublish ? '클래스를 게시하고 있어요' : '기본 정보를 저장하고 있어요'}
                  </>
                ) : (
                  <>
                    {step === 1 ? '다음' : willPublish ? '클래스 게시' : '자료 추가하기'}
                    <ArrowRight />
                  </>
                )}
              </button>
            </div>
          </footer>
        )}
      </form>

      {removedSource && (
        <div className="source-undo-toast" role="status" aria-live="polite">
          <span>
            <Check />
            &ldquo;
            {removedSource.source.kind === 'link'
              ? removedSource.source.value.title || sourceLinkHost(removedSource.source.value.url)
              : removedSource.source.value.name}
            &rdquo; 자료를 제거했어요.
          </span>
          <button type="button" onClick={undoSourceRemoval}>
            실행 취소
          </button>
        </div>
      )}

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

function AnalysisProgress({
  sourceLabel,
  onCancel,
}: {
  sourceLabel: string;
  onCancel: () => void;
}) {
  const tasks = [
    '모든 링크의 내용을 함께 확인하고 있어요',
    '겹치는 내용과 핵심 흐름을 정리하고 있어요',
    '소개, 내용과 썸네일을 만들고 있어요',
  ];
  return (
    <div className="analysis-progress" role="status" aria-live="polite">
      <div className="analysis-orbit">
        <Sparkles />
        <i />
      </div>
      <span className="analysis-source">{sourceLabel} 분석 중</span>
      <h2>클래스 정보를 준비하고 있어요</h2>
      <p>완료되면 미리보기에서 제목과 차시를 수정할 수 있어요.</p>
      <ol>
        {tasks.map((task, index) => (
          <li key={task}>
            <span>{index + 1}</span>
            {task}
          </li>
        ))}
      </ol>
      <button className="analysis-cancel" type="button" onClick={onCancel}>
        분석 취소하고 자료로 돌아가기
      </button>
    </div>
  );
}

type DescriptionBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullets' | 'numbers'; items: string[] };

function structuredDescriptionBlocks(value: string) {
  const lines = value.split('\n');
  const blocks: DescriptionBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (/^#{1,3}\s+/.test(line)) {
      blocks.push({ type: 'heading', text: line.replace(/^#{1,3}\s+/, '') });
      index += 1;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
        index += 1;
      }
      blocks.push({ type: 'bullets', items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }
      blocks.push({ type: 'numbers', items });
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next || /^#{1,3}\s+|^[-*]\s+|^\d+\.\s+/.test(next)) break;
      paragraph.push(next);
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }
  return blocks;
}

function StructuredDescription({ value }: { value: string }) {
  return (
    <div className="structured-description">
      {structuredDescriptionBlocks(value).map((block, index) => {
        if (block.type === 'heading') return <h3 key={index}>{block.text}</h3>;
        if (block.type === 'paragraph') return <p key={index}>{block.text}</p>;
        const List = block.type === 'bullets' ? 'ul' : 'ol';
        return (
          <List key={index}>
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

function InstructorProfileEditor({
  active,
  name,
  bio,
  image,
  linkCount,
  onStart,
  onNameChange,
  onBioChange,
  onDone,
  onCancel,
}: {
  active: boolean;
  name: string;
  bio: string;
  image: string;
  linkCount: number;
  onStart: () => void;
  onNameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="preview-instructor-profile" data-preview-field="instructorName">
      <h2>강사 소개</h2>
      {active ? (
        <div className="instructor-profile-form">
          <label>
            <span>이름</span>
            <input
              autoFocus
              value={name}
              aria-label="강사 이름 편집"
              onChange={(event) => onNameChange(event.target.value)}
            />
          </label>
          <label>
            <span>소개</span>
            <textarea
              value={bio}
              aria-label="강사 소개 편집"
              onChange={(event) => onBioChange(event.target.value)}
            />
          </label>
          <div>
            <button type="button" onClick={onCancel}>
              취소
            </button>
            <button type="button" onClick={onDone}>
              <Check /> 완료
            </button>
          </div>
        </div>
      ) : (
        <div className="instructor-profile-card editable">
          {image ? (
            <img src={image} alt="" />
          ) : (
            <i aria-hidden="true">{name.trim().slice(0, 1) || '강'}</i>
          )}
          <span>
            <b>{name || '강사 이름을 확인해 주세요'}</b>
            <p>{bio || '등록한 프로필 링크를 바탕으로 강사 소개를 준비했어요.'}</p>
            <small>
              <Sparkles /> 프로필 링크 {linkCount}개로 AI 자동 작성
            </small>
          </span>
          <button
            className="preview-copy-trigger"
            type="button"
            aria-label="강사 소개 수정"
            onClick={onStart}
          />
          <span className="edit-affordance" aria-hidden="true">
            <Pencil /> 클릭하여 수정
          </span>
        </div>
      )}
    </section>
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
  const label = field === 'title' ? '제목' : '소개';
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
