/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_USE_MOCK?: string;
  readonly VITE_API_WITH_CREDENTIALS?: string;
  readonly VITE_CLASS_ANALYSIS_ENDPOINT?: string;
  readonly VITE_YOUTUBE_METADATA_ENDPOINT?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
