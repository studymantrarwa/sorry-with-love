import { useEffect, useState } from 'react';
import './App.css';
import { story as originalStory } from './data/story';
import celebration from './assets/images/celebration.png';
import { seoPages } from './data/seoPages.js';
import { articles } from './data/blogArticles.js';
import { homeContent } from './data/homeContent.js';
import AuthModal from './components/AuthModal.jsx';
import AdminAnalytics from './components/AdminAnalytics.jsx';
import { createShareLink, getSession, recordShareResponse, saveUserCard, trackEvent } from './lib/supabase.js';
import UserPanel from './components/UserPanel.jsx';
import { initializeGoogleAnalytics, trackGooglePageView } from './lib/googleAnalytics.js';

const templates = [
  { id: 'storybook', title: 'Sweet Story', subtitle: 'Photo story + heartfelt apology', icon: '💗', theme: 'pink', description: 'A warm, romantic photo-by-photo apology.' },
  { id: 'midnight', title: 'Midnight Teddy', subtitle: 'Dark sky + cute teddy vibes', icon: '🧸', theme: 'night', description: 'A dreamy night-sky experience inspired by the video.' },
  { id: 'floral', title: 'Sorry, My Person', subtitle: 'Flowers, sparkles & soft colors', icon: '🌷', theme: 'floral', description: 'Gentle flowers and a thoughtful message.' },
  { id: 'minimal', title: 'Little Note', subtitle: 'Simple, elegant & personal', icon: '💌', theme: 'minimal', description: 'A clean digital letter with a sweet ending.' },
];
const steps = [
  { image: originalStory[0].image, text: 'Hey {receiver}… I have been thinking about what happened, and I want to say this with care. 💌' },
  { image: originalStory[1].image, text: 'I am sorry for my part in what happened. You deserved honesty and respect from me. ❤️' },
  { image: originalStory[2].image, text: 'I may not have intended to hurt you, but I understand that my intention does not erase the impact. 🫶' },
  { image: originalStory[3].image, text: 'I want to listen, understand what I missed, and make a real change—not just say the right words. 🌷' },
  { image: originalStory[4].image, text: 'You matter to me, {receiver}. There is no pressure to forgive or reply now. I am ready to listen when you are. 💗' },
];


function App() {
  const initialParams = new URLSearchParams(window.location.search);
  const [sender, setSender] = useState(initialParams.get('fromName') || 'Your name');
  const [receiver, setReceiver] = useState(initialParams.get('toName') || 'Their name');
  const [selected, setSelected] = useState(templates.some(t => t.id === initialParams.get('card')) ? initialParams.get('card') : 'storybook');
  const [started, setStarted] = useState(initialParams.get('shared') === '1');
  const [page, setPage] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [noCount, setNoCount] = useState(0);
  const [authOpen, setAuthOpen] = useState(initialParams.get('auth') === '1');
  const [session, setSession] = useState(() => getSession());
  const [saveNotice, setSaveNotice] = useState('');
  const [responseChoice, setResponseChoice] = useState('');
  const shareId = initialParams.get('shareId') || '';
  const isSharedMessage = initialParams.get('shared') === '1';
  const template = templates.find(t => t.id === selected) || templates[0];
  const isNight = selected === 'midnight';
  const reset = () => { setStarted(false); setPage(0); setAccepted(false); setNoCount(0); };
  const shareStory = async () => {
    void trackEvent('share_click', window.location.pathname, selected);
    const text = `A little message made with love on Sorry with Love. ${sender.trim() || 'Someone who cares'} is sending a heartfelt sorry to ${receiver.trim() || 'you'}.`;
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set('fromName', sender.trim() || 'Someone who cares');
    shareUrl.searchParams.set('toName', receiver.trim() || 'you');
    shareUrl.searchParams.set('card', selected);
    shareUrl.searchParams.set('shared', '1');
    const outgoingShareId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `swl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    shareUrl.searchParams.set('shareId', outgoingShareId);
    try {
      if (navigator.share) await navigator.share({ title: 'Sorry with Love', text, url: shareUrl.toString() });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(`${text} ${shareUrl.toString()}`); alert('Share message copied! Paste it into your chat.'); }
      else alert('Copy this page link from your browser and send it to your person.');
      if (session?.access_token) { try { await createShareLink(session, { share_id: outgoingShareId, title: `${receiver.trim() || 'My person'} — ${template.title}`, card_template: selected, page_path: path, share_url: shareUrl.toString(), sender_name: sender.trim(), recipient_name: receiver.trim() }); } catch (error) { console.warn('Could not save share link to user panel:', error); } }
    } catch (e) { if (e?.name !== 'AbortError') alert('You can share this page using your browser menu.'); }
  };
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const article = articles.find(item => path === `/blog/${item.slug}`);
  const seoPage = seoPages.find(item => path === `/${item.slug}`);
  useEffect(() => {
    if (path.startsWith('/admin') || path.startsWith('/account')) { let robots = document.querySelector('meta[name="robots"]'); if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); } robots.content = 'noindex,nofollow'; return; }
    void trackEvent('page_view', path);
    initializeGoogleAnalytics();
    trackGooglePageView(path);
    if (path === '/sorry-my-girl') { void trackEvent('card_view', path, 'sorry-my-girl'); if (shareId) void trackEvent('message_view', path, 'sorry-my-girl', shareId); }
  }, [path, shareId]);
  useEffect(() => {
    const handleConsentChange = (event) => {
      if (event.detail?.value === 'accepted') { initializeGoogleAnalytics(); trackGooglePageView(path); }
    };
    window.addEventListener('swl:analytics-consent-updated', handleConsentChange);
    return () => window.removeEventListener('swl:analytics-consent-updated', handleConsentChange);
  }, [path]);
  useEffect(() => {
    if (started && path !== '/admin/analytics') {
      void trackEvent('card_view', path, selected);
      if (isSharedMessage && shareId) void trackEvent('message_view', path, selected, shareId);
    }
  }, [started, path, selected, isSharedMessage, shareId]);
  useEffect(() => {
    const pageTitle = seoPage ? `${seoPage.title} | Sorry with Love` : article ? `${article.title} | Sorry with Love` : path === '/blog' ? 'Apology Advice & Relationship Communication | Sorry with Love' : ({ '/about': 'About Sorry with Love', '/contact': 'Contact Us | Sorry with Love', '/privacy': 'Privacy Policy | Sorry with Love', '/terms': 'Terms of Use | Sorry with Love', '/disclaimer': 'Disclaimer | Sorry with Love', '/cookies': 'Cookie Policy | Sorry with Love', '/sorry-my-girl': 'Sorry, My Girl | Sorry with Love' }[path] || null);
    if (pageTitle) document.title = pageTitle;
    const descriptions = {
      '/blog': 'Original apology message guides for a boyfriend, girlfriend, wife, husband, best friend, and better conversations.',
      '/about': 'Learn about Sorry with Love, a creative website for personalised apology cards and thoughtful communication.',
      '/contact': 'Contact Sorry with Love with questions, feedback, or suggestions about the website.',
      '/privacy': 'Read how Sorry with Love handles share links, technical data, cookies, and advertising disclosures.',
      '/terms': 'Read the terms for using Sorry with Love apology cards and sharing personalised messages.',
      '/disclaimer': 'Read the Sorry with Love disclaimer about apology templates and relationship outcomes.',
      '/cookies': 'Learn how Sorry with Love uses optional Google Analytics and browser storage, and how to change your privacy choices.',
      '/sorry-my-girl': 'Open the Sorry, My Girl animated apology experience within Sorry with Love.'
    };
    const descriptionText = seoPage?.description || article?.description || descriptions[path];
    if (descriptionText) {
      let description = document.querySelector('meta[name="description"]');
      if (!description) { description = document.createElement('meta'); description.name = 'description'; document.head.appendChild(description); }
      description.content = descriptionText;
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
      canonical.href = `${window.location.origin}${path}`;
      let ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.content = canonical.href;
    }
  }, [article, path, seoPage]);
  if (path === '/admin/analytics') return <AdminAnalytics />;
  if (path === '/account' || path === '/account/dashboard') return <UserPanel onSessionChange={setSession} />;
  if (path === '/sorry-my-girl') {
    return <main className="app embedded-page">
      <header className="site-nav embedded-nav">
        <a className="brand" href="/"><img src="/logo.svg" alt="Sorry with Love logo" className="brand-logo"/><span>Sorry <i>with Love</i></span></a>
        <a className="back-btn" href="/">← Back to all cards</a>
      </header>
      <section className="embedded-intro">
        <div className="eyebrow">A SPECIAL LITTLE APOLOGY</div>
        <h1>Sorry, My Girl <span>💗</span></h1>
        <p>Your special card is shown here without leaving Sorry with Love.</p>
        <button className="primary-btn" type="button" onClick={async () => {
          void trackEvent('share_click', '/sorry-my-girl', 'sorry-my-girl');
          const shareUrl = new URL('/sorry-my-girl', window.location.origin);
          const outgoingShareId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `swl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          shareUrl.searchParams.set('shareId', outgoingShareId);
          shareUrl.searchParams.set('shared', '1');
          const url = shareUrl.toString();
          try {
            if (navigator.share) await navigator.share({ title: 'Sorry, My Girl | Sorry with Love', text: 'A little apology made with love 💗', url }); else if (navigator.clipboard) { await navigator.clipboard.writeText(url); alert('Sorry, My Girl link copied!'); } else window.prompt('Copy this link', url);
            if (session?.access_token) { try { await createShareLink(session, { share_id: outgoingShareId, title: 'Sorry, My Girl', card_template: 'sorry-my-girl', page_path: '/sorry-my-girl', share_url: url }); } catch (error) { console.warn('Could not save Sorry, My Girl link:', error); } }
          } catch (e) { if (e?.name !== 'AbortError') alert('You can copy the page link from your browser.'); }
        }}>Share Sorry, My Girl ↗</button>
      </section>
      <div className="embedded-frame-wrap">
        <iframe title="Sorry, My Girl animated apology page" src="https://sorry-my-girl.vercel.app" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen" />
      </div>
      {shareId && <section className="recipient-response"><h2>Did the apology help? 💗</h2>{responseChoice ? <p>Thank you for sharing how you feel. Your response has been recorded.</p> : <><p>Please choose honestly — there is no pressure to forgive right away.</p><div className="answer-buttons"><button className="primary-btn" onClick={() => { setResponseChoice('accepted'); void recordShareResponse(shareId, 'accepted'); }}>Haan, maan gayi / maan gaya 💖</button><button className="soft-btn" onClick={() => { setResponseChoice('not_yet'); void recordShareResponse(shareId, 'not_yet'); }}>Abhi nahi, mujhe waqt chahiye</button></div></>}</section>}
      <p className="embed-fallback">If the page does not appear, the original site may block embedding. <a href="https://sorry-my-girl.vercel.app" target="_blank" rel="noopener noreferrer">Open Sorry, My Girl in a new tab</a>.</p>
      <footer className="footer">Sorry with Love · Made with hope and a whole lot of heart ♥</footer>
    </main>;
  }

  const renderArticleCards = () => <div className="article-grid">{articles.map(item => { const words = [item.title, item.intro, ...item.sections.flatMap(section => section)].join(" ").trim().split(/\s+/).length; const minutes = Math.max(5, Math.ceil(words / 200)); return <article className="article-card" key={item.slug}><div className="article-label">PRACTICAL APOLOGY GUIDE · {minutes} MIN READ</div><h3><a href={`/blog/${item.slug}`}>{item.title}</a></h3><p>{item.description}</p><a className="article-read" href={`/blog/${item.slug}`}>Read the full guide <span>→</span></a></article>; })}</div>;
  const renderSeoTopicCards = () => <div className="article-grid">{seoPages.map(item => <article className="article-card" key={item.slug}><div className="article-label">SORRY MESSAGE & CARD GUIDE</div><h3><a href={`/${item.slug}`}>{item.title}</a></h3><p>{item.description}</p><a className="article-read" href={`/${item.slug}`}>Explore this guide <span>→</span></a></article>)}</div>;
  if (seoPage) return <main className="app legal-app"><header className="topbar"><a className="brand" href="/"><img src="/logo.svg" alt="" className="brand-logo"/><span>Sorry with Love</span></a><a className="back-btn" href="/blog">← All guides</a></header><article className="article-page"><div className="eyebrow">SORRY WITH LOVE · APOLOGY GUIDE</div><h1>{seoPage.title}</h1><p className="article-intro">{seoPage.intro}</p>{seoPage.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}<section><h2>Create a personalised sorry card</h2><p>When a card fits the situation, you can use Sorry with Love to choose a story style, add names, preview the message, and share it thoughtfully. A card is an opening for communication, not a guarantee of forgiveness.</p><a className="primary-btn legal-home" href="/#stories">Create a sorry card ♡</a></section><p className="article-note">Use these examples as a starting point. Personalise them honestly, respect boundaries, and avoid pressuring anyone to forgive or reply.</p><a className="article-read" href="/blog">Browse all apology guides →</a></article><footer className="footer">Sorry with Love · Made with hope and a whole lot of heart ♥<nav className="footer-links"><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/cookies">Cookies</a><a href="/terms">Terms</a><a href="/blog">Blog & Guides</a></nav></footer></main>;
  if (path === '/blog') return <main className="app legal-app"><header className="topbar"><a className="brand" href="/"><img src="/logo.svg" alt="" className="brand-logo"/><span>Sorry with Love</span></a><a className="back-btn" href="/">← Home</a></header><section className="blog-page-heading"><div className="eyebrow">THE SORRY WITH LOVE JOURNAL</div><h1>Apology advice for honest conversations</h1><p>Original, practical guides for apology messages to partners, spouses, and friends, plus advice on listening well and rebuilding trust without pressure.</p></section><section className="blog-listing">{renderArticleCards()}</section><section className="blog-page-heading"><div className="eyebrow">MORE WAYS TO SAY SORRY</div><h2>Sorry messages, apology cards and situation guides</h2><p>Explore practical topic pages for different relationships and situations. Each guide offers examples to personalise, not promises of a particular outcome.</p></section><section className="blog-listing">{renderSeoTopicCards()}</section><footer className="footer">Sorry with Love · Made with hope and a whole lot of heart ♥<nav className="footer-links"><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/cookies">Cookies</a><a href="/terms">Terms</a></nav></footer></main>;
  if (article) return <main className="app legal-app"><header className="topbar"><a className="brand" href="/"><img src="/logo.svg" alt="" className="brand-logo"/><span>Sorry with Love</span></a><a className="back-btn" href="/blog">← All articles</a></header><article className="article-page"><div className="eyebrow">SORRY WITH LOVE · PRACTICAL GUIDE · {article.updated} · {Math.ceil([article.title, article.intro, ...article.sections.flatMap(section => section)].join(' ').trim().split(/\s+/).length / 200)} MIN READ</div><h1>{article.title}</h1><p className="article-intro">{article.intro}</p>{article.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}<section className="article-related"><h2>Keep learning with Sorry with Love</h2><p>Use these guides as a starting point, then choose the one that fits your situation. A template is not a substitute for honest conversation, practical repair, or respecting a boundary.</p><ul>{articles.filter(item => item.slug !== article.slug).slice(0, 3).map(item => <li key={item.slug}><a href={`/blog/${item.slug}`}>{item.title}</a></li>)}</ul><a href="/#stories">Create a personalised sorry card →</a></section><div className="article-takeaway"><h2>Remember</h2><p>{article.takeaway}</p></div><p className="article-note">These guides offer general communication suggestions, not professional counselling or a guarantee of any relationship outcome.</p><a className="primary-btn legal-home" href="/blog">Read more guides</a></article><footer className="footer">Sorry with Love · Made with hope and a whole lot of heart ♥<nav className="footer-links"><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/cookies">Cookies</a><a href="/terms">Terms</a></nav></footer></main>;

  const legalPages = {
    '/about': { title: 'About Sorry with Love', body: <>Sorry with Love is a creative experience that helps people express an apology with kindness. Choose a story card, add the sender and receiver names, and move through a gentle personalised message. We encourage honest communication, patience, and respect for the other person’s feelings. Forgiveness cannot be guaranteed; give each other time and space.</> },
    '/privacy': { title: 'Privacy Policy', body: <><p>Last updated: 19 October 2026.</p><p>Sorry with Love lets you personalise a story in your browser. If you choose to share a story, sender and recipient names may be included in the shareable URL. Anyone with that URL may be able to see those names, and the URL may appear in browser history or hosting request logs. Do not include information you do not want to share.</p><p>If the site owner configures Supabase analytics, we record page path, event type (page view, card view, share click, or shared-message view), card style, a random share-link ID, recipient button response (accepted/not yet), and timestamps to report usage. The analytics event records do not include names or message text. If a signed-in user saves a card or share link, the account database stores the names and share URL needed to show that user their saved card/link; these records are protected by account-level access policies. Hosting providers may process technical data such as IP address, request details, and security logs. If you contact us, we will use the information you provide to respond to your enquiry.</p><p><strong>Google Analytics:</strong> If you choose “Allow analytics” in the privacy-choice banner, the site loads Google Analytics 4 (GA4) to understand page visits and general site usage. Analytics is not loaded before this choice. We send page paths without query strings because share links may contain names. We do not intentionally send sender names, recipient names, apology text, email addresses, or other directly identifying details to Google Analytics. You can change your choice using the “Privacy choices” button at the bottom of the page. Google may process technical information such as device/browser details and online identifiers according to its own terms and privacy documentation. Read <a href="https://support.google.com/analytics/answer/6004245?hl=en" target="_blank" rel="noreferrer">Google Analytics data safeguards</a>.</p><p>If Google AdSense or other advertising services are enabled, third parties may use cookies, web beacons, IP addresses, or similar technologies to serve and measure ads. Third-party vendors, including Google, may use cookies to serve ads based on a user’s visits to this and other websites. Learn more at <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">How Google uses information from sites or apps</a>.</p><p>You can control cookies through your browser settings. This policy may be updated as the site changes.</p><p><strong>Contact:</strong> Use the Contact Us page to find the site's current contact method. The site owner should publish a monitored contact email before enabling advertising.</p></> },
    '/cookies': { title: 'Cookie Policy', body: <><p>Last updated: 19 October 2026.</p><p>Cookies and browser storage are small technologies that can help a website remember choices and understand usage. Sorry with Love uses browser storage for selected site functions and to remember your optional analytics choice.</p><h2>Optional Google Analytics</h2><p>Google Analytics 4 is only loaded after you choose “Allow analytics” in the privacy-choice banner. If you reject optional analytics, the GA tag is not loaded by this website. The site may still use essential storage needed for a feature you request, such as a privacy-choice setting or account session.</p><h2>Change your choice</h2><p>Use the “Privacy choices” button at the bottom of the page to review or change your analytics choice. You can also clear this site's local storage and cookies in your browser. Clearing storage may reset saved preferences.</p><h2>Third-party services</h2><p>If advertising services such as Google AdSense are enabled in the future, they may use their own cookies or similar technologies subject to the relevant settings and disclosures. This policy should be updated whenever the site's actual technology or data practices change.</p><p>For more details about analytics data, read our <a href="/privacy">Privacy Policy</a> or the <a href="https://support.google.com/analytics/answer/6004245?hl=en" target="_blank" rel="noreferrer">Google Analytics data safeguards</a>.</p></> },
    '/terms': { title: 'Terms of Use', body: <><p>Use Sorry with Love lawfully and respectfully. You are responsible for the names and text you enter and for how you share the generated experience.</p><p>This creative messaging tool does not guarantee that a recipient will forgive or respond. Do not use it to harass, pressure, threaten, or repeatedly contact someone who has asked for no contact.</p><p>The site is provided as-is. Features may change, and uninterrupted availability is not guaranteed.</p></> },
    '/contact': { title: 'Contact Us', body: <><p>Questions, feedback, accessibility issues, or suggestions about Sorry with Love should be directed to the website owner through the verified support email published here. The site owner must replace the configuration notice below with a real, monitored email address before this page is considered ready for visitors or advertising review.</p><p><strong>Contact email:</strong> Support email not configured. Please check back after the site owner publishes a verified contact address.</p></> },
    '/disclaimer': { title: 'Disclaimer', body: <>Sorry with Love is an independent creative website. It is not a counselling service and does not guarantee any relationship outcome. Messages are templates to help people communicate sincerely. Please personalise them honestly, accept the other person’s decision, and respect their boundaries.</> }
  };
  if (legalPages[path]) return <main className="app legal-app"><header className="topbar"><a className="brand" href="/"><img src="/logo.svg" alt="" className="brand-logo"/><span>Sorry with Love</span></a><a className="back-btn" href="/">← Home</a></header><article className="legal-panel"><div className="eyebrow">SORRY WITH LOVE · INFORMATION</div><h1>{legalPages[path].title}</h1><div className="legal-copy">{legalPages[path].body}</div><a className="primary-btn legal-home" href="/">Back to the love stories ♡</a></article><footer className="footer">Sorry with Love · Made with hope and a whole lot of heart ♥</footer></main>;

  const next = () => { if (page < steps.length) setPage(p => p + 1); else setAccepted(true); };
  const message = (steps[Math.min(page, steps.length - 1)]?.text || '').replaceAll('{receiver}', receiver.trim() || 'you');
  return <main className={`app theme-${template.theme}`}>
    {!started ? <>
      <header className="site-nav"><a className="brand" href="#home"><img src="/logo.svg" alt="Sorry with Love logo" className="brand-logo"/><span>Sorry <i>with Love</i></span></a><nav className="main-nav" aria-label="Main navigation"><a href="#home">Home</a><a href="#stories">Love Cards</a><a href="#how-it-works">How it works</a><a href="/blog">Blog</a><a href="/about">About</a></nav><button className="nav-cta nav-account" type="button" onClick={() => setAuthOpen(true)}>{session ? "My account" : "Login / Register"} <span>♡</span></button></header>
      <section className="hero hero-premium" id="home"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> A LITTLE LOVE CAN CHANGE EVERYTHING</div><h1>Sorry with Love: Create a <em>Heartfelt Apology Card</em></h1><p>Sorry with Love helps you create a personalised sorry card, share a thoughtful apology message, and learn how to take responsibility with care. Add your names, choose a story style, and make the message feel like you.</p><div className="hero-actions"><a className="primary-btn hero-cta" href="#stories">Create your love story <span>↗</span></a><a className="hero-text-link" href="#how-it-works">See how it works ↓</a></div><div className="hero-proof"><span className="proof-heart">♡</span><div><strong>Made for your special person</strong><small>Personal · Thoughtful · Easy to share</small></div></div></div><div className="hero-visual" aria-label="Romantic apology card illustration"><div className="visual-glow"/><div className="floating-heart heart-one">♥</div><div className="floating-heart heart-two">♡</div><div className="floating-spark spark-one">✦</div><div className="floating-spark spark-two">✧</div><div className="love-envelope"><div className="envelope-top"/><div className="envelope-letter"><span>To my favourite person</span><strong>I’m sorry.</strong><small>With all my love, always.</small><b>♥</b></div><div className="envelope-flap"/><div className="envelope-seal">♡</div></div><div className="visual-caption"><span>✦</span> A little note from the heart</div></div></section>
      <section className="trust-strip"><div><span>💌</span><strong>Personalised</strong><small>Your names, your message</small></div><div><span>💗</span><strong>Made with care</strong><small>Four unique love-card styles</small></div><div><span>↗</span><strong>Easy to share</strong><small>Send it to someone special</small></div></section>
      <section className="setup panel" id="stories">
        <div className="section-heading"><span className="step-number">01</span><div><div className="section-kicker">FIND YOUR WAY TO SAY IT</div><h2>Choose your love story</h2><p>Pick the feeling that matches your person. You can preview it before sharing.</p></div></div>
        <div className="template-grid">{templates.map(t => <article key={t.id} className={`template-card ${selected === t.id ? 'selected' : ''} preview-${t.theme}`}><button type="button" className="template-pick" onClick={() => setSelected(t.id)} aria-pressed={selected === t.id} aria-label={`Select ${t.title}`}><span className="template-art">{t.icon}<span className="tiny-spark">✦</span></span><span className="template-title">{t.title}</span><span className="template-subtitle">{t.subtitle}</span><span className="select-indicator">{selected === t.id ? '✓ Selected' : 'Tap to select'}</span></button><button type="button" className="card-start-btn" onClick={() => { setSelected(t.id); document.getElementById('how-it-works')?.scrollIntoView({behavior:'smooth', block:'start'}); }}>Choose & personalise <span>→</span></button></article>)}</div>
        <article className="template-card special-link-card preview-pink">
          <a className="template-pick special-link-pick" href="/sorry-my-girl" aria-label="Open Sorry, My Girl card">
            <span className="template-art">💝<span className="tiny-spark">✦</span></span>
            <span className="template-title">Sorry, My Girl</span>
            <span className="template-subtitle">A special animated apology page, opened inside our website.</span>
            <span className="select-indicator">Open this card ↗</span>
          </a>
          <a className="card-start-btn special-link-cta" href="/sorry-my-girl">Open card <span>→</span></a>
        </article>
        <div className="section-heading names-heading" id="how-it-works"><span className="step-number">02</span><div><div className="section-kicker">MAKE IT YOURS</div><h2>Add the two names that matter</h2><p>Your name opens the story; their name gets the final love note.</p></div></div>
        <div className="name-fields"><label>From (sender)<input maxLength="50" value={sender} onChange={e => setSender(e.target.value)} placeholder="Your name"/></label><label>To (receiver)<input maxLength="50" value={receiver} onChange={e => setReceiver(e.target.value)} placeholder="Their name"/></label></div>
        <button className="primary-btn full" onClick={() => { setStarted(true); setPage(0); setAccepted(false); }}>Create our little love story <span>♡</span></button>
      </section>
      <section className="how-strip"><div className="how-title"><span className="eyebrow">THREE LITTLE STEPS</span><h2>From your heart<br/>to their screen.</h2></div><div className="how-step"><span>01</span><strong>Pick a card</strong><p>Choose a look that feels like your story.</p></div><div className="how-step"><span>02</span><strong>Add both names</strong><p>Make every message feel personal.</p></div><div className="how-step"><span>03</span><strong>Share with love</strong><p>Send your story when you’re ready.</p></div></section>
      <section className="home-editorial" aria-labelledby="sorry-with-love-guide-title">
        <div className="editorial-intro"><div className="section-kicker">A THOUGHTFUL PLACE TO START AGAIN</div><h2 id="sorry-with-love-guide-title">Sorry with Love: apology cards and practical advice for making things right</h2><p>Creating a card is only one part of an apology. Explore this guide for clear, respectful ways to express regret, choose your words, and give the other person room to respond.</p></div>
        {homeContent.map((section, index) => <section className="editorial-section" key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph, paragraphIndex) => <p key={`${index}-${paragraphIndex}`}>{paragraph}</p>)}</section>)}
        <div className="editorial-next"><h2>Ready to make your message personal?</h2><p>Choose a Sorry with Love card style, add the names, and preview your story before you share it. For more examples, explore the apology guides.</p><div className="editorial-actions"><a className="primary-btn" href="#stories">Create a sorry card ♡</a><a className="article-read" href="/blog">Read all apology guides →</a></div></div>
      </section>
      <section className="blog-preview" id="blog-guides"><div className="blog-heading"><div><div className="section-kicker">AFTER THE LOVE CARDS</div><h2>Words that help you make things right</h2><p>Original, practical guides to sincere apologies, better conversations, and rebuilding trust.</p></div><a className="article-read all-articles" href="/blog">View all guides <span>→</span></a></div>{renderArticleCards()}</section>
      <div className="ad-slot"><span>ADVERTISEMENT</span><div>Advertisement space · Ads appear here after AdSense setup and approval</div></div>
      <footer className="footer">Sorry with Love · Made with hope and a whole lot of heart <span>♥</span><nav className="footer-links" aria-label="Information"><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/cookies">Cookies</a><a href="/terms">Terms</a><a href="/disclaimer">Disclaimer</a><a href="/blog">Blog & Guides</a></nav></footer>
    </> : <div className="experience-wrap">
      <header className="experience-header"><button className="back-btn" onClick={reset}>← Back</button><span>{template.icon} {template.title}</span><button className="restart-btn" onClick={reset}>Start over</button></header>
      <div className="experience-card">
        {!accepted ? <>
          <div className="experience-art" aria-hidden="true">{isNight ? <><span className="moon">☾</span><span className="star star-a">✦</span><span className="star star-b">✧</span><span className="teddy">🧸</span><span className="heart-float">💕</span></> : selected === 'floral' ? <><span className="flower">🌷</span><span className="flower flower-two">🌸</span><span className="heart-float">💗</span></> : selected === 'minimal' ? <span className="letter-art">💌</span> : <><span className="heart-float">💗</span><span className="teddy">🧸</span><span className="sparkle">✨</span></>}</div>
          <div className="sender-line">A little message from <strong>{sender.trim() || 'Someone who cares'}</strong></div>
          {page < steps.length ? <><div className="story-progress"><span style={{width: `${((page + 1) / (steps.length + 1)) * 100}%`}}/></div><p className="story-counter">A NOTE FROM THE HEART · {page + 1} / {steps.length + 1}</p><h1 className="story-text">{message}</h1><button className="primary-btn" onClick={next}>{isNight && page === 0 ? 'Let me talk…' : 'Next little note'} <span>→</span></button></> : <><p className="story-counter">ONE LAST QUESTION</p><h1 className="story-text">Would you be open to talking when you feel ready, {receiver.trim() || 'my favourite person'}?</h1><p className="story-support">You do not owe me an immediate answer or forgiveness. Your feelings and boundaries matter.</p><div className="answer-buttons"><button className="primary-btn" onClick={() => { if (isSharedMessage && shareId) void recordShareResponse(shareId, 'accepted'); setResponseChoice('accepted'); setAccepted(true); }}>I’m open to talking 💗</button><button className="soft-btn" disabled={noCount > 0} onClick={() => { if (isSharedMessage && shareId) void recordShareResponse(shareId, 'not_yet'); setResponseChoice('not_yet'); setNoCount(c => c + 1); }}>{noCount ? 'Your choice has been respected' : 'I need more time'}</button></div>{noCount > 0 && <p className="gentle-note">Thank you for being honest. Take all the time you need. There is no pressure to reply or forgive. 💗</p>}</>}
        </> : <><div className="final-image"><img src={celebration} alt="A joyful celebration"/></div><div className="eyebrow">A MESSAGE JUST FOR YOU</div><h1 className="final-title">For {receiver.trim() || 'you'}, with love. 💖</h1><p className="final-message">Thank you for reading my message. I am sorry for my part, and I will respect your feelings while I work on doing better.</p><div className="signature">With love,<br/><strong>{sender.trim() || 'Someone who cares'}</strong></div><div className="final-actions"><button className="primary-btn" onClick={shareStory}>Share this card ↗</button>{session?.access_token && <button className="soft-btn" onClick={async () => { try { await saveUserCard(session, { title: `${receiver.trim() || 'My person'} — ${template.title}`, card_template: selected, sender_name: sender.trim(), recipient_name: receiver.trim(), page_path: path }); setSaveNotice('Card My Cards mein save ho gaya.'); } catch (error) { setSaveNotice(error.message || 'Card save nahi ho paaya.'); } }}>Save to My Cards ♡</button>}<button className="soft-btn" onClick={reset}>Replay this little story ↻</button></div>{saveNotice && <p className="auth-success" role="status">{saveNotice} <a href="/account">Open User Panel</a></p>}<p className="final-kindness">A sincere sorry is a beginning. Give each other time, listen with care, and let forgiveness happen freely. 💗</p></>}
      </div>
      <div className="ad-slot experience-ad"><span>ADVERTISEMENT</span><div>Ad space</div></div><p className="privacy-note">Names may be included in the share link. Only share it with people you trust.</p>
    </div>}
    <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} session={session} setSession={setSession} />
  </main>;
}
export default App;
