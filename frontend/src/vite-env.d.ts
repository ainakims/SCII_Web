/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_AUTH_USER: string;
  readonly VITE_WS_AUTH_PASS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}