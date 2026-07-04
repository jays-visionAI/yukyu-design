/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FORGEDB_URL?: string;
  readonly VITE_FORGEDB_PROJECT_ID?: string;
  readonly VITE_FORGEDB_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}