import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://rifjsvbbhsnpifgooenl.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';

const THEME_COLUMNS = new Set([
  'catalog_id',
  'primary_color',
  'secondary_color',
  'background_color',
  'text_color',
  'heading_font',
  'body_font',
  'border_radius',
  'card_style',
  'button_style',
  'layout_style',
  'custom_css',
  'created_at',
  'updated_at',
  'preset_id',
  'hero_style',
  'show_business_name',
  'show_logo',
  'show_prices',
  'header_alignment',
  'visual_theme_id',
  'background_mode',
  'background_gradient',
  'logo_shape',
  'menu_item_style',
]);

function sanitizeThemeRow(row: unknown) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  return Object.fromEntries(
    Object.entries(row as Record<string, unknown>).filter(([key]) => THEME_COLUMNS.has(key)),
  );
}

async function qatalinkFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  if (url.includes('/rest/v1/catalog_theme_settings') && typeof init?.body === 'string') {
    try {
      const parsed = JSON.parse(init.body);
      const cleaned = Array.isArray(parsed)
        ? parsed.map(sanitizeThemeRow)
        : sanitizeThemeRow(parsed);
      return fetch(input, { ...init, body: JSON.stringify(cleaned) });
    } catch {
      // If it is not JSON, let Supabase handle the original request normally.
    }
  }

  return fetch(input, init);
}

export function createSupabaseBrowserClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { fetch: qatalinkFetch },
  });
}
