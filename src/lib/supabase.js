const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SESSION_KEY = 'swl_supabase_session_v1';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
export const getSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
};
const saveSession = (session) => {
  if (session) {
    if (!session.expires_at && session.expires_in) session.expires_at = Math.floor(Date.now() / 1000) + Number(session.expires_in);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  else localStorage.removeItem(SESSION_KEY);
};
const headers = (token) => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}`, 'Content-Type': 'application/json' });
async function authRequest(path, body, token) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, { method: 'POST', headers: headers(token), body: JSON.stringify(body || {}) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.msg || result.message || result.error_description || result.error || 'Authentication request failed.');
  return result;
}
export async function signUp(email, password) {
  const result = await authRequest('signup', { email, password });
  if (result.access_token) saveSession(result);
  return result;
}
export async function signIn(email, password) {
  const result = await authRequest('token?grant_type=password', { email, password });
  saveSession(result);
  return result;
}
export async function signOut() {
  const session = getSession();
  try { if (session?.access_token && isSupabaseConfigured) await authRequest('logout', {}, session.access_token); }
  finally { saveSession(null); }
}
export async function getValidSession() {
  const session = getSession();
  if (!session?.access_token || !session?.refresh_token) return session;
  if (session.expires_at && session.expires_at * 1000 > Date.now() + 60000) return session;
  if (!isSupabaseConfigured) return session;
  try {
    const refreshed = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    saveSession(refreshed);
    return refreshed;
  } catch { saveSession(null); return null; }
}
export async function getCurrentUser(session = getSession()) {
  if (!isSupabaseConfigured || !session?.access_token) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: headers(session.access_token) });
  if (!response.ok) return null;
  return response.json();
}
export async function getProfileRole(session = getSession()) {
  if (!isSupabaseConfigured || !session?.access_token || !session?.user?.id) return 'user';
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(session.user.id)}&select=role&limit=1`, { headers: headers(session.access_token) });
  if (!response.ok) return 'user';
  const rows = await response.json();
  return rows?.[0]?.role || 'user';
}
export async function trackEvent(eventType, path, cardTemplate = null, messageId = null) {
  if (!isSupabaseConfigured) return;
  const allowed = ['page_view', 'card_view', 'share_click', 'message_view'];
  if (!allowed.includes(eventType)) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/site_events`, {
      method: 'POST',
      headers: { ...headers(getSession()?.access_token), Prefer: 'return=minimal' },
      body: JSON.stringify({ event_type: eventType, page_path: String(path || '/').slice(0, 300), card_template: cardTemplate ? String(cardTemplate).slice(0, 60) : null, message_id: messageId ? String(messageId).slice(0, 80) : null })
    });
  } catch { /* Analytics must never interrupt the card experience. */ }
}
export async function getAdminAnalytics(session) {
  if (!isSupabaseConfigured || !session?.access_token) throw new Error('Please sign in with an admin account.');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_site_analytics`, {
    method: 'POST', headers: headers(session.access_token), body: '{}'
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || result.details || 'Admin analytics could not be loaded. Check admin role and SQL setup.');
  return result;
}

async function restRequest(path, { method = 'GET', session = getSession(), body, prefer } = {}) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured yet.');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { ...headers(session?.access_token), ...(prefer ? { Prefer: prefer } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || result.details || result.hint || 'Database request failed. Check Supabase SQL and permissions.');
  return result;
}

export async function createShareLink(session, record) {
  if (!session?.access_token || !session?.user?.id) return false;
  await restRequest('share_links', { method: 'POST', session, prefer: 'return=minimal', body: {
    owner_id: session.user.id,
    share_id: record.share_id,
    title: record.title || 'My sorry card',
    card_template: record.card_template || 'storybook',
    page_path: record.page_path || '/',
    share_url: record.share_url || '',
    recipient_name: record.recipient_name || null,
    sender_name: record.sender_name || null
  }});
  return true;
}

export async function saveUserCard(session, card) {
  if (!session?.access_token || !session?.user?.id) throw new Error('Login to save your card.');
  return restRequest('user_cards', { method: 'POST', session, prefer: 'return=representation', body: {
    owner_id: session.user.id,
    title: card.title || 'My sorry card',
    card_template: card.card_template || 'storybook',
    sender_name: card.sender_name || null,
    recipient_name: card.recipient_name || null,
    page_path: card.page_path || '/'
  }});
}

export async function getUserDashboard(session) {
  if (!session?.access_token) throw new Error('Please log in to open your user panel.');
  return restRequest('rpc/user_dashboard_data', { method: 'POST', session, body: {} });
}

export async function updateUserCard(session, id, updates) {
  return restRequest(`user_cards?id=eq.${encodeURIComponent(id)}&select=*`, { method: 'PATCH', session, prefer: 'return=representation', body: { title: updates.title, ...(updates.sender_name !== undefined ? { sender_name: updates.sender_name } : {}), ...(updates.recipient_name !== undefined ? { recipient_name: updates.recipient_name } : {}) } });
}

export async function deleteUserCard(session, id) {
  await restRequest(`user_cards?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', session, prefer: 'return=minimal' });
}

export async function recordShareResponse(shareId, responseValue) {
  if (!isSupabaseConfigured || !shareId || !['accepted', 'not_yet'].includes(responseValue)) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_share_response`, {
      method: 'POST', headers: headers(getSession()?.access_token),
      body: JSON.stringify({ p_share_id: String(shareId).slice(0, 80), p_response: responseValue })
    });
  } catch { /* Recipient response must never interrupt the experience. */ }
}
