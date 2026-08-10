/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_PORT: string;
  readonly VITE_BILLING_ENABLED: string;
  readonly VITE_ROOMS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
