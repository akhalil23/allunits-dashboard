import { supabase } from '@/integrations/supabase/client';

type JwtPayload = {
  sub?: unknown;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const [, payload = ''] = token.split('.');
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function hasUserSubject(token: string | null | undefined): token is string {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  return typeof payload?.sub === 'string' && payload.sub.length > 0;
}

export async function getValidAccessToken(options: { refresh?: boolean } = {}): Promise<string | null> {
  const { refresh = false } = options;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (hasUserSubject(session?.access_token)) {
    return session.access_token;
  }

  if (!refresh) return null;

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error || !hasUserSubject(refreshed.session?.access_token)) {
    return null;
  }

  return refreshed.session.access_token;
}