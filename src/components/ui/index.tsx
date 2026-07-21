import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { ChevronLeft, ChevronRight, Search, UploadCloud, X } from 'lucide-react';
import type { StatusTone } from '../../utils/status';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`ui-button ui-button-${variant} ${className}`} {...props} />;
}

export function IconButton({ label, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button className={`ui-icon-button ${className}`} aria-label={label} title={label} {...props} />;
}

export function Badge({ tone = 'neutral', children }: { tone?: StatusTone; children: ReactNode }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={`ui-card ${className}`} {...props} />;
}

export function StatCard({ label, value, hint, tone = 'primary' }: { label: string; value: ReactNode; hint?: string; tone?: StatusTone }) {
  return <Card className={`ui-stat-card ui-stat-${tone}`}><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</Card>;
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string; size?: number }) {
  return src ? <img className="ui-avatar" src={src} alt={`${name} 프로필`} width={size} height={size} /> : <span className="ui-avatar" style={{ width: size, height: size }} aria-label={name}>{name.trim().slice(0, 1)}</span>;
}

type FieldProps = { label?: string; error?: string; hint?: string };

function Field({ label, error, hint, inputId, children }: FieldProps & { inputId: string; children: ReactNode }) {
  return <label className="ui-field" htmlFor={inputId}>{label && <span>{label}</span>}{children}{error ? <small className="ui-field-error">{error}</small> : hint ? <small>{hint}</small> : null}</label>;
}

export function Input({ label, error, hint, id, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return <Field label={label} error={error} hint={hint} inputId={inputId}><input id={inputId} className={`ui-input ${className}`} aria-invalid={!!error} {...props} /></Field>;
}

export function Textarea({ label, error, hint, id, className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return <Field label={label} error={error} hint={hint} inputId={inputId}><textarea id={inputId} className={`ui-input ui-textarea ${className}`} aria-invalid={!!error} {...props} /></Field>;
}

export function Select({ label, error, hint, id, className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return <Field label={label} error={error} hint={hint} inputId={inputId}><select id={inputId} className={`ui-input ui-select ${className}`} aria-invalid={!!error} {...props}>{children}</select></Field>;
}

export function DatePicker(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & FieldProps) {
  return <Input type="date" {...props} />;
}

export function SearchInput({ label = '검색', ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label?: string }) {
  return <label className="ui-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label={label} {...props} /></label>;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button type="button" className={`ui-toggle ${checked ? 'is-on' : ''}`} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><span /></button>;
}

export function SegmentedControl<T extends string>({ value, options, onChange, label }: { value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void; label: string }) {
  return <div className="ui-segmented" role="group" aria-label={label}>{options.map((option) => <button type="button" className={value === option.value ? 'is-active' : ''} aria-pressed={value === option.value} onClick={() => onChange(option.value)} key={option.value}>{option.label}</button>)}</div>;
}

export function Tabs<T extends string>({ value, tabs, onChange, label }: { value: T; tabs: readonly { value: T; label: string }[]; onChange: (value: T) => void; label: string }) {
  return <div className="ui-tabs" role="tablist" aria-label={label}>{tabs.map((tab) => <button type="button" role="tab" aria-selected={value === tab.value} className={value === tab.value ? 'is-active' : ''} onClick={() => onChange(tab.value)} key={tab.value}>{tab.label}</button>)}</div>;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, value));
  return <div className="ui-progress-wrap">{label && <span>{label}<b>{percent}%</b></span>}<div className="ui-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{ width: `${percent}%` }} /></div></div>;
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return <div className="ui-skeleton" aria-label="불러오는 중" aria-busy="true">{Array.from({ length: lines }, (_, index) => <i key={index} />)}</div>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return <div className="ui-empty">{icon && <span className="ui-empty-icon">{icon}</span>}<strong>{title}</strong>{description && <p>{description}</p>}{action}</div>;
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return <nav className="ui-pagination" aria-label="페이지 이동"><IconButton label="이전 페이지" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={18} /></IconButton>{Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => <button type="button" aria-current={page === item ? 'page' : undefined} className={page === item ? 'is-active' : ''} onClick={() => onChange(item)} key={item}>{item}</button>)}<IconButton label="다음 페이지" disabled={page >= totalPages} onClick={() => onChange(page + 1)}><ChevronRight size={18} /></IconButton></nav>;
}

export type TableColumn<T> = { key: string; header: string; render: (row: T) => ReactNode; sortable?: boolean };

export function Table<T>({ columns, rows, rowKey, loading = false, emptyText = '표시할 항목이 없어요', sortKey, sortDirection = 'asc', onSort }: { columns: readonly TableColumn<T>[]; rows: readonly T[]; rowKey: (row: T) => string; loading?: boolean; emptyText?: string; sortKey?: string; sortDirection?: 'asc' | 'desc'; onSort?: (key: string) => void }) {
  return <div className="ui-table-wrap"><table className="ui-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.sortable ? <button type="button" onClick={() => onSort?.(column.key)}>{column.header}{sortKey === column.key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}</button> : column.header}</th>)}</tr></thead><tbody>{!loading && rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}</tr>)}</tbody></table>{loading ? <Skeleton lines={4} /> : rows.length === 0 ? <EmptyState title={emptyText} /> : null}</div>;
}

export function Modal({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (!dialog) return; if (open && !dialog.open) dialog.showModal(); if (!open && dialog.open) dialog.close(); }, [open]);
  return <dialog className="ui-dialog" ref={ref} onClose={onClose}><header><h2>{title}</h2><IconButton label="닫기" onClick={onClose}><X size={20} /></IconButton></header><div className="ui-dialog-body">{children}</div>{footer && <footer>{footer}</footer>}</dialog>;
}

export function Drawer(props: Parameters<typeof Modal>[0]) {
  const { open, title, onClose, children, footer } = props;
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (!dialog) return; if (open && !dialog.open) dialog.showModal(); if (!open && dialog.open) dialog.close(); }, [open]);
  return <dialog className="ui-dialog ui-drawer" ref={ref} onClose={onClose}><header><h2>{title}</h2><IconButton label="닫기" onClick={onClose}><X size={20} /></IconButton></header><div className="ui-dialog-body">{children}</div>{footer && <footer>{footer}</footer>}</dialog>;
}

export function Toast({ message, tone = 'success', onClose }: { message: string; tone?: 'success' | 'danger'; onClose?: () => void }) {
  return <div className={`ui-toast ui-toast-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>{message}{onClose && <IconButton label="알림 닫기" onClick={onClose}><X size={16} /></IconButton>}</div>;
}

export function DonutChart({ value, label, tone = 'var(--color-primary)' }: { value: number; label: string; tone?: string }) {
  const percent = Math.max(0, Math.min(100, value));
  return <div className="ui-donut" style={{ background: `conic-gradient(${tone} ${percent}%, var(--color-border) 0)` }} role="img" aria-label={`${label} ${percent}%`}><span><b>{percent}%</b><small>{label}</small></span></div>;
}

export function BarChart({ data, label }: { data: readonly { label: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const axisSteps = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  return (
    <div className="ui-bar-chart-wrap" role="img" aria-label={label}>
      <div className="ui-bar-chart-body">
        <div className="ui-bar-chart-axis">
          {axisSteps.map((step, index) => (
            <span key={step} style={{ top: `${(index / (axisSteps.length - 1)) * 100}%` }}>
              {Math.round(step)}
            </span>
          ))}
        </div>
        <div className="ui-bar-chart-main">
          <div className="ui-bar-chart">{data.map((item) => <span key={item.label}><i style={{ height: `${(item.value / max) * 100}%` }} /></span>)}</div>
          <div className="ui-bar-chart-labels">{data.map((item) => <small key={item.label}>{item.label}</small>)}</div>
        </div>
      </div>
    </div>
  );
}

export function FileDropzone({ onFile, accept = 'image/png,image/jpeg,image/webp', maxSize = 5 * 1024 * 1024 }: { onFile: (file: File) => void; accept?: string; maxSize?: number }) {
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const id = useId();
  const handleFile = (file?: File) => { if (!file) return; if (file.size > maxSize) { setError(`파일은 ${Math.round(maxSize / 1024 / 1024)}MB 이하여야 해요.`); return; } if (accept && !accept.split(',').includes(file.type)) { setError('지원하지 않는 파일 형식이에요.'); return; } setError(''); onFile(file); };
  return <div className={`ui-dropzone ${dragging ? 'is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); handleFile(event.dataTransfer.files[0]); }}><label htmlFor={id}><UploadCloud size={24} /><strong>파일을 선택하거나 여기에 놓으세요</strong><small>JPG, PNG, WEBP · 최대 {Math.round(maxSize / 1024 / 1024)}MB</small><input id={id} type="file" accept={accept} onChange={(event) => handleFile(event.target.files?.[0])} /></label>{error && <p role="alert">{error}</p>}</div>;
}

export function Stepper({ current, steps }: { current: number; steps: readonly string[] }) {
  return <ol className="ui-stepper" aria-label="진행 단계">{steps.map((step, index) => <li className={index < current ? 'is-done' : index === current ? 'is-current' : ''} aria-current={index === current ? 'step' : undefined} key={step}><span>{index + 1}</span><b>{step}</b></li>)}</ol>;
}
