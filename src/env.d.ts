/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// Custom env vars
interface ImportMetaEnv {
  readonly PUBLIC_NASA_API_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Minimal declaration for Markdown component to satisfy TS
declare module 'astro/components' {
  export const Markdown: any;
}
