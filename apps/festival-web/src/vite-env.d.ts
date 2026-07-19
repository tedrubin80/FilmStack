/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  /** Apex domain shown for tenant subdomains (e.g. localhost or example.com) */
  readonly VITE_ROOT_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
