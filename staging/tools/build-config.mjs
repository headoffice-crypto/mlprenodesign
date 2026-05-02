import { writeFileSync } from 'node:fs';

// ANTHROPIC_API_KEY is intentionally NOT shipped to the browser — it lives
// on the Supabase Edge Function `analyze-project` instead (set via
// `supabase secrets set ANTHROPIC_API_KEY=...`).
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
for (const k of required) {
  if (!process.env[k]) {
    console.error(`[build-config] missing env var: ${k}`);
    process.exit(1);
  }
}

const escape = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const out = `/* GENERATED at deploy time from Vercel env vars — do not edit by hand. */
const SUPABASE_URL = '${escape(process.env.SUPABASE_URL)}';
const SUPABASE_ANON_KEY = '${escape(process.env.SUPABASE_ANON_KEY)}';
const PUBLIC_APP_URL = '${escape(process.env.PUBLIC_APP_URL || '')}';
const CONTRACTOR = {
  name: 'MLP Reno & Design',
  email: 'headoffice@mlpexperience.com',
  phone: '(450) 500-8936',
  rbq: '5847-0378-01'
};
`;

writeFileSync('js/config.js', out);
console.log('[build-config] wrote js/config.js (', out.length, 'bytes)');
