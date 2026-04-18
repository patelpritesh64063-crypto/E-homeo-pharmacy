export type Env = {
  DB: D1Database;
  STORE_KV: KVNamespace;
  AI: Ai;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  FAST2SMS_API_KEY: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  ADMIN_API_KEY: string;
  FRONTEND_URL: string;
};

export type Variables = {
  admin: any;
};
