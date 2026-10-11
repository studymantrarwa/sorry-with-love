import { useEffect, useState } from 'react';
import { getAdminAnalytics, getProfileRole, getValidSession, isSupabaseConfigured } from '../lib/supabase';

export default function AdminAnalytics() {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!isSupabaseConfigured) throw new Error('Supabase setup complete nahi hai. docs/SUPABASE_SETUP_HI.md follow karein.');
        const session = await getValidSession();
        if (!session?.access_token) throw new Error('Analytics dekhne ke liye pehle login karein.');
        const role = await getProfileRole(session);
        if (role !== 'admin') throw new Error('Is dashboard ke liye admin permission chahiye. Project owner ko SQL setup guide ke admin step follow karne honge.');
        const data = await getAdminAnalytics(session);
        if (alive) setState({ loading: false, error: '', data });
      } catch (e) { if (alive) setState({ loading: false, error: e.message || 'Analytics load nahi ho paaya.', data: null }); }
    })();
    return () => { alive = false; };
  }, []);
  const pages = Array.isArray(state.data?.pages) ? state.data.pages : [];
  const recent = Array.isArray(state.data?.recent_events) ? state.data.recent_events : [];
  const messages = Array.isArray(state.data?.messages) ? state.data.messages : [];
  return <main className="app legal-app admin-page"><header className="topbar"><a className="brand" href="/"><img src="/logo.svg" alt="" className="brand-logo"/><span>Sorry with Love</span></a><a className="back-btn" href="/">← Home</a></header><section className="admin-content"><div className="eyebrow">PRIVATE OWNER DASHBOARD</div><h1>Website analytics</h1><p className="article-intro">Page visits, shared apology-card views, and the pages visitors open. Names and message contents are not stored in this analytics report.</p>
    {state.loading ? <p>Analytics load ho raha hai…</p> : state.error ? <div className="admin-error"><strong>Dashboard available nahi hai</strong><p>{state.error}</p><a className="primary-btn" href="/?auth=1">Login / Register</a></div> : <>
      <div className="stats-grid"><article><span>Total page views</span><strong>{Number(state.data?.total_page_views || 0).toLocaleString()}</strong></article><article><span>Sorry card views</span><strong>{Number(state.data?.total_card_views || 0).toLocaleString()}</strong></article><article><span>Share button clicks</span><strong>{Number(state.data?.total_share_clicks || 0).toLocaleString()}</strong></article><article><span>Individual shared-message views</span><strong>{Number(state.data?.total_message_views || 0).toLocaleString()}</strong></article></div>
      <section className="admin-table-section"><h2>Most viewed pages</h2>{pages.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Page</th><th>Page views</th><th>Card views</th><th>Share clicks</th></tr></thead><tbody>{pages.map(row => <tr key={row.page_path}><td><a href={row.page_path}>{row.page_path}</a></td><td>{Number(row.page_views || 0).toLocaleString()}</td><td>{Number(row.card_views || 0).toLocaleString()}</td><td>{Number(row.share_clicks || 0).toLocaleString()}</td></tr>)}</tbody></table></div> : <p>Abhi koi tracked visits nahi hain. Supabase connect hone ke baad new visits record honge.</p>}</section>
      <section className="admin-table-section"><h2>Shared messages — views per link</h2><p>Each new share link has a private random ID. This report does not store sender/receiver names or message text.</p>{messages.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Message ID</th><th>Card style</th><th>Page</th><th>Views</th><th>Last viewed (UTC)</th></tr></thead><tbody>{messages.map(row => <tr key={row.message_id}><td>{row.message_id}</td><td>{row.card_template}</td><td>{row.page_path}</td><td>{Number(row.views || 0).toLocaleString()}</td><td>{row.last_viewed ? new Date(row.last_viewed).toLocaleString() : '—'}</td></tr>)}</tbody></table></div> : <p>No shared-message views recorded yet. Share a card and open its link to begin tracking.</p>}</section>
      <section className="admin-table-section"><h2>Recent activity</h2>{recent.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Time (UTC)</th><th>Event</th><th>Page</th><th>Card style</th></tr></thead><tbody>{recent.map((row, i) => <tr key={`${row.created_at}-${i}`}><td>{new Date(row.created_at).toLocaleString()}</td><td>{row.event_type}</td><td>{row.page_path}</td><td>{row.card_template || '—'}</td></tr>)}</tbody></table></div> : <p>No recent activity yet.</p>}</section>
    </>}
    <p className="article-note">Counts begin after database setup and deployment. This lightweight analytics feature is not a substitute for Google Analytics or Search Console.</p></section></main>;
}
