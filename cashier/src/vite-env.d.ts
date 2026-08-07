/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_PORT: string;
  readonly VITE_BILLING_ENABLED: string;
  readonly VITE_ROOMS: string;
  readonly VITE_SHARED_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
