import { useCallback, useEffect, useState } from 'react';
import { deleteUserCard, getUserDashboard, getValidSession, isSupabaseConfigured, signOut, updateUserCard } from '../lib/supabase';

const count = value => Number(value || 0).toLocaleString();
const date = value => value ? new Date(value).toLocaleString() : '—';

export default function UserPanel({ onSessionChange }) {
  const [session, setSession] = useState(null);
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setState({ loading: true, error: '', data: null });
    try {
      if (!isSupabaseConfigured) throw new Error('Supabase setup pending hai. docs/SUPABASE_SETUP_HI.md follow karein.');
      const current = await getValidSession();
      if (!current?.access_token) throw new Error('User Panel dekhne ke liye pehle login karein.');
      setSession(current);
      const data = await getUserDashboard(current);
      setState({ loading: false, error: '', data });
    } catch (error) { setState({ loading: false, error: error.message || 'User Panel load nahi ho paaya.', data: null }); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const cards = Array.isArray(state.data?.cards) ? state.data.cards : [];
  const links = Array.isArray(state.data?.links) ? state.data.links : [];
  const pages = Array.isArray(state.data?.pages) ? state.data.pages : [];
  const handleEdit = async card => {
    const title = window.prompt('Card ka naya naam likhein:', card.title || 'My sorry card');
    if (!title?.trim()) return;
    const senderName = window.prompt('Sender ka naam:', card.sender_name || '') ?? card.sender_name ?? '';
    const recipientName = window.prompt('Recipient ka naam:', card.recipient_name || '') ?? card.recipient_name ?? '';
    setBusyId(String(card.id)); setNotice('');
    try { await updateUserCard(session, card.id, { title: title.trim().slice(0, 100), sender_name: senderName.slice(0, 50), recipient_name: recipientName.slice(0, 50) }); setNotice('Card title update ho gaya.'); await load(); }
    catch (error) { setNotice(error.message); }
    finally { setBusyId(''); }
  };
  const handleDelete = async card => {
    if (!window.confirm(`“${card.title}” ko My Cards se delete karna hai?`)) return;
    setBusyId(String(card.id)); setNotice('');
    try { await deleteUserCard(session, card.id); setNotice('Card delete ho gaya.'); await load(); }
    catch (error) { setNotice(error.message); }
    finally { setBusyId(''); }
  };
  const openCard = card => { const url = new URL('/', window.location.origin); url.searchParams.set('fromName', card.sender_name || 'Your name'); url.searchParams.set('toName', card.recipient_name || 'Their name'); url.searchParams.set('card', card.card_template || 'storybook'); window.location.href = url.toString(); };
  const copyLink = async url => { try { if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url); else window.prompt('Copy your share link:', url); setNotice('Share link copy ho gaya.'); } catch { window.prompt('Copy your share link:', url); } };
  const logout = async () => { await signOut(); onSessionChange?.(null); window.location.href = '/'; };
  return <main className="app legal-app admin-page"><header className="topbar"><a className="brand" href="/"><img src="/logo.svg" alt="" className="brand-logo"/><span>Sorry with Love</span></a><nav className="user-panel-nav"><a href="/">Create new card</a><button className="soft-btn" onClick={logout}>Sign out</button></nav></header><section className="admin-content user-dashboard"><div className="eyebrow">YOUR PRIVATE SPACE</div><h1>My User Panel 💗</h1><p className="article-intro">Apne cards, share kiye gaye links, page visits aur recipient ke response ko yahan dekhein.</p>
    {state.loading ? <p>Dashboard load ho raha hai…</p> : state.error ? <div className="admin-error"><strong>User Panel abhi available nahi hai</strong><p>{state.error}</p><a className="primary-btn" href="/?auth=1">Login / Register</a><button className="soft-btn" onClick={load}>Try again</button></div> : <>
      <div className="stats-grid user-stats"><article><span>My saved cards</span><strong>{count(state.data?.total_cards)}</strong></article><article><span>My shared links</span><strong>{count(state.data?.total_links)}</strong></article><article><span>Views on my links</span><strong>{count(state.data?.total_link_views)}</strong></article><article><span>“Man gayi / man gaya” clicks</span><strong>{count(state.data?.accepted_responses)}</strong></article><article><span>“Abhi nahi” clicks</span><strong>{count(state.data?.not_yet_responses)}</strong></article></div>
      <section className="admin-table-section"><div className="user-section-heading"><h2>My Cards</h2><a className="primary-btn" href="/#stories">+ Create a card</a></div><p>Saved cards ko rename/delete kar sakte hain. Create flow mein login hone par final screen se card save karein.</p>{cards.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Card name</th><th>Style</th><th>To</th><th>Created</th><th>Open</th><th>Actions</th></tr></thead><tbody>{cards.map(card => <tr key={card.id}><td>{card.title}</td><td>{card.card_template}</td><td>{card.recipient_name || '—'}</td><td>{date(card.created_at)}</td><td><button className="table-action" onClick={() => openCard(card)}>Open</button></td><td><button className="table-action" disabled={busyId === String(card.id)} onClick={() => handleEdit(card)}>Edit</button> <button className="table-action danger" disabled={busyId === String(card.id)} onClick={() => handleDelete(card)}>Delete</button></td></tr>)}</tbody></table></div> : <p>Abhi koi saved card nahi hai. Website par card banayein aur final screen se “Save to My Cards” dabayein.</p>}</section>
      <section className="admin-table-section"><h2>My Shared Links — views & responses</h2><p>Har share link ke views aur recipient ke “Yes” / “Not yet” button clicks yahan dikhte hain. Recipient ki choice ko respect karein; response ko pressure banane ke liye use na karein.</p>{links.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Link / Card</th><th>Page</th><th>Views</th><th>Man gayi/gaya</th><th>Abhi nahi</th><th>Last response</th><th>Last viewed</th><th>Copy link</th></tr></thead><tbody>{links.map(link => <tr key={link.share_id}><td>{link.title || link.card_template}</td><td>{link.page_path}</td><td>{count(link.views)}</td><td>{count(link.accepted_responses)}</td><td>{count(link.not_yet_responses)}</td><td>{link.latest_response === 'accepted' ? 'Haan, maan gaye 💖' : link.latest_response === 'not_yet' ? 'Abhi nahi' : 'No response yet'}</td><td>{date(link.last_viewed)}</td><td><button className="table-action" onClick={() => void copyLink(link.url)}>Copy</button></td></tr>)}</tbody></table></div> : <p>Login hone ke baad naya share link banayein. Tab se aapke account ke link views yahan record honge.</p>}</section>
      <section className="admin-table-section"><h2>Page-wise visits</h2><p>Aapke share links se record hue pages ka breakdown.</p>{pages.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Page</th><th>Views</th></tr></thead><tbody>{pages.map(row => <tr key={row.page_path}><td>{row.page_path}</td><td>{count(row.views)}</td></tr>)}</tbody></table></div> : <p>Abhi page-wise visits nahi hain. Apna share link bhejne ke baad recipient ke opens yahan aayenge.</p>}</section>
      {notice && <p className="auth-success" role="status">{notice}</p>}<button className="soft-btn" onClick={load}>Refresh statistics ↻</button>
    </>}
    <p className="article-note">Tracking Supabase setup aur deployment ke baad shuru hoti hai. Shared-link IDs random hote hain; names/message text analytics report mein store nahi kiye jaate.</p></section></main>;
}
