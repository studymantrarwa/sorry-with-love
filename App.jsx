import { useState } from 'react';
import './App.css';
import { story as originalStory } from './data/story';
import celebration from './assets/images/celebration.png';

const templates = [
  { id: 'storybook', title: 'Sweet Story', subtitle: 'Photo story + heartfelt apology', icon: '💗', theme: 'pink', description: 'A warm, romantic photo-by-photo apology.' },
  { id: 'midnight', title: 'Midnight Teddy', subtitle: 'Dark sky + cute teddy vibes', icon: '🧸', theme: 'night', description: 'A dreamy night-sky experience inspired by the video.' },
  { id: 'floral', title: 'Sorry, My Person', subtitle: 'Flowers, sparkles & soft colors', icon: '🌷', theme: 'floral', description: 'Gentle flowers and a thoughtful message.' },
  { id: 'minimal', title: 'Little Note', subtitle: 'Simple, elegant & personal', icon: '💌', theme: 'minimal', description: 'A clean digital letter with a sweet ending.' },
];
const steps = [
  { image: originalStory[0].image, text: 'Hey {receiver}… I wanted to tell you something from my heart. 💌' },
  { image: originalStory[1].image, text: 'The good memories we share mean so much to me. ✨' },
  { image: originalStory[2].image, text: 'I know I may not always get everything right…' },
  { image: originalStory[3].image, text: 'But you matter to me, and I never want a silly mistake to hide that. 🥺' },
  { image: originalStory[4].image, text: 'I am truly sorry, {receiver}. Can we make things okay again? ❤️' },
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
  const template = templates.find(t => t.id === selected) || templates[0];
  const isNight = selected === 'midnight';
  const reset = () => { setStarted(false); setPage(0); setAccepted(false); setNoCount(0); };
  const shareStory = async () => {
    const text = `A little message made with love on Sorry with Love. ${sender.trim() || 'Someone who cares'} is sending a heartfelt sorry to ${receiver.trim() || 'you'}.`;
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set('fromName', sender.trim() || 'Someone who cares');
    shareUrl.searchParams.set('toName', receiver.trim() || 'you');
    shareUrl.searchParams.set('card', selected);
    shareUrl.searchParams.set('shared', '1');
    try {
      if (navigator.share) await navigator.share({ title: 'Sorry with Love', text, url: shareUrl.toString() });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(`${text} ${shareUrl.toString()}`); alert('Share message copied! Paste it into your chat.'); }
      else alert('Copy this page link from your browser and send it to your person.');
    } catch (e) { if (e?.name !== 'AbortError') alert('You can share this page using your browser menu.'); }
  };
  const legalPages = {
    '/about': { title: 'About Sorry with Love', body: <>Sorry with Love is a creative experience that helps people express an apology with kindness. Choose a story card, add the sender and receiver names, and move through a gentle personalised message. We encourage honest communication, patience, and respect for the other person’s feelings. Forgiveness cannot be guaranteed; give each other time and space.</> },
    '/privacy': { title: 'Privacy Policy', body: <><p>Sorry with Love is designed to run in your browser. Names entered into the story personalise the on-screen experience and are not intentionally sent to our servers by this demo.</p><p>If you contact us, information you submit may be used to respond. Hosting providers may process basic technical data such as IP address and request logs.</p><p>If Google AdSense or other advertising services are enabled, third parties may use cookies, web beacons, IP addresses, or similar technologies to serve and measure ads. Third-party vendors, including Google, may use cookies to serve ads based on a user’s visits to this and other websites. Learn more at <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">How Google uses information from sites or apps</a>.</p><p>You can control cookies through your browser settings. This policy may be updated as the site changes.</p><p><strong>Contact:</strong> Replace this with your real support email before publishing.</p></> },
    '/terms': { title: 'Terms of Use', body: <><p>Use Sorry with Love lawfully and respectfully. You are responsible for the names and text you enter and for how you share the generated experience.</p><p>This creative messaging tool does not guarantee that a recipient will forgive or respond. Do not use it to harass, pressure, threaten, or repeatedly contact someone who has asked for no contact.</p><p>The site is provided as-is. Features may change, and uninterrupted availability is not guaranteed.</p></> },
    '/contact': { title: 'Contact Us', body: <><p>Questions, feedback, or suggestions for Sorry with Love are welcome.</p><p>Before publishing, replace the placeholder email below with an address you actively check.</p><p><strong>Email:</strong> your-email@example.com</p></> },
    '/disclaimer': { title: 'Disclaimer', body: <>Sorry with Love is an independent creative website. It is not a counselling service and does not guarantee any relationship outcome. Messages are templates to help people communicate sincerely. Please personalise them honestly, accept the other person’s decision, and respect their boundaries.</> }
  };
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (legalPages[path]) return <main className="app legal-app"><header className="topbar"><a className="brand" href="/"><img src="/logo.svg" alt="" className="brand-logo"/><span>Sorry with Love</span></a><a className="back-btn" href="/">← Home</a></header><article className="legal-panel"><div className="eyebrow">SORRY WITH LOVE · INFORMATION</div><h1>{legalPages[path].title}</h1><div className="legal-copy">{legalPages[path].body}</div><a className="primary-btn legal-home" href="/">Back to the love stories ♡</a></article><footer className="footer">Sorry with Love · Made with hope and a whole lot of heart ♥</footer></main>;

  const next = () => { if (page < steps.length) setPage(p => p + 1); else setAccepted(true); };
  const message = (steps[Math.min(page, steps.length - 1)]?.text || '').replaceAll('{receiver}', receiver.trim() || 'you');
  return <main className={`app theme-${template.theme}`}>
    {!started ? <>
      <header className="site-nav"><a className="brand" href="#home"><img src="/logo.svg" alt="Sorry with Love logo" className="brand-logo"/><span>Sorry <i>with Love</i></span></a><nav className="main-nav" aria-label="Main navigation"><a href="#home">Home</a><a href="#stories">Love Cards</a><a href="#how-it-works">How it works</a><a href="/about">About</a></nav><a className="nav-cta" href="#stories">Create a sorry <span>♡</span></a></header>
      <section className="hero hero-premium" id="home"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> A LITTLE LOVE CAN CHANGE EVERYTHING</div><h1>Some feelings deserve<br/>more than just <em>“sorry”.</em></h1><p>Turn your heartfelt apology into a beautiful little story. Add your names, choose a style, and send a moment that says what words sometimes can’t.</p><div className="hero-actions"><a className="primary-btn hero-cta" href="#stories">Create your love story <span>↗</span></a><a className="hero-text-link" href="#how-it-works">See how it works ↓</a></div><div className="hero-proof"><span className="proof-heart">♡</span><div><strong>Made for your special person</strong><small>Personal · Thoughtful · Easy to share</small></div></div></div><div className="hero-visual" aria-label="Romantic apology card illustration"><div className="visual-glow"/><div className="floating-heart heart-one">♥</div><div className="floating-heart heart-two">♡</div><div className="floating-spark spark-one">✦</div><div className="floating-spark spark-two">✧</div><div className="love-envelope"><div className="envelope-top"/><div className="envelope-letter"><span>To my favourite person</span><strong>I’m sorry.</strong><small>With all my love, always.</small><b>♥</b></div><div className="envelope-flap"/><div className="envelope-seal">♡</div></div><div className="visual-caption"><span>✦</span> A little note from the heart</div></div></section>
      <section className="trust-strip"><div><span>💌</span><strong>Personalised</strong><small>Your names, your message</small></div><div><span>💗</span><strong>Made with care</strong><small>Four unique love-card styles</small></div><div><span>↗</span><strong>Easy to share</strong><small>Send it to someone special</small></div></section>
      <section className="setup panel" id="stories">
        <div className="section-heading"><span className="step-number">01</span><div><div className="section-kicker">FIND YOUR WAY TO SAY IT</div><h2>Choose your love story</h2><p>Pick the feeling that matches your person. You can preview it before sharing.</p></div></div>
        <div className="template-grid">{templates.map(t => <article key={t.id} className={`template-card ${selected === t.id ? 'selected' : ''} preview-${t.theme}`}><button type="button" className="template-pick" onClick={() => setSelected(t.id)} aria-pressed={selected === t.id} aria-label={`Select ${t.title}`}><span className="template-art">{t.icon}<span className="tiny-spark">✦</span></span><span className="template-title">{t.title}</span><span className="template-subtitle">{t.subtitle}</span><span className="select-indicator">{selected === t.id ? '✓ Selected' : 'Tap to select'}</span></button><button type="button" className="card-start-btn" onClick={() => { setSelected(t.id); document.getElementById('how-it-works')?.scrollIntoView({behavior:'smooth', block:'start'}); }}>Choose & personalise <span>→</span></button></article>)}</div>
        <div className="section-heading names-heading" id="how-it-works"><span className="step-number">02</span><div><div className="section-kicker">MAKE IT YOURS</div><h2>Add the two names that matter</h2><p>Your name opens the story; their name gets the final love note.</p></div></div>
        <div className="name-fields"><label>From (sender)<input maxLength="50" value={sender} onChange={e => setSender(e.target.value)} placeholder="Your name"/></label><label>To (receiver)<input maxLength="50" value={receiver} onChange={e => setReceiver(e.target.value)} placeholder="Their name"/></label></div>
        <button className="primary-btn full" onClick={() => { setStarted(true); setPage(0); setAccepted(false); }}>Create our little love story <span>♡</span></button>
      </section>
      <section className="how-strip"><div className="how-title"><span className="eyebrow">THREE LITTLE STEPS</span><h2>From your heart<br/>to their screen.</h2></div><div className="how-step"><span>01</span><strong>Pick a card</strong><p>Choose a look that feels like your story.</p></div><div className="how-step"><span>02</span><strong>Add both names</strong><p>Make every message feel personal.</p></div><div className="how-step"><span>03</span><strong>Share with love</strong><p>Send your story when you’re ready.</p></div></section>
      <div className="ad-slot"><span>ADVERTISEMENT</span><div>Advertisement space · Ads appear here after AdSense setup and approval</div></div>
      <footer className="footer">Sorry with Love · Made with hope and a whole lot of heart <span>♥</span><nav className="footer-links" aria-label="Information"><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/disclaimer">Disclaimer</a></nav></footer>
    </> : <div className="experience-wrap">
      <header className="experience-header"><button className="back-btn" onClick={reset}>← Back</button><span>{template.icon} {template.title}</span><button className="restart-btn" onClick={reset}>Start over</button></header>
      <div className="experience-card">
        {!accepted ? <>
          <div className="experience-art" aria-hidden="true">{isNight ? <><span className="moon">☾</span><span className="star star-a">✦</span><span className="star star-b">✧</span><span className="teddy">🧸</span><span className="heart-float">💕</span></> : selected === 'floral' ? <><span className="flower">🌷</span><span className="flower flower-two">🌸</span><span className="heart-float">💗</span></> : selected === 'minimal' ? <span className="letter-art">💌</span> : <><span className="heart-float">💗</span><span className="teddy">🧸</span><span className="sparkle">✨</span></>}</div>
          <div className="sender-line">A little message from <strong>{sender.trim() || 'Someone who cares'}</strong></div>
          {page < steps.length ? <><div className="story-progress"><span style={{width: `${((page + 1) / (steps.length + 1)) * 100}%`}}/></div><p className="story-counter">A NOTE FROM THE HEART · {page + 1} / {steps.length + 1}</p><h1 className="story-text">{message}</h1><button className="primary-btn" onClick={next}>{isNight && page === 0 ? 'Let me talk…' : 'Next little note'} <span>→</span></button></> : <><p className="story-counter">ONE LAST QUESTION</p><h1 className="story-text">Can you forgive me, {receiver.trim() || 'my favourite person'}? 🥺</h1><p className="story-support">I’ll do my best to listen, learn, and make things right.</p><div className="answer-buttons"><button className="primary-btn" onClick={() => setAccepted(true)}>Yes, let’s be okay 💖</button><button className="soft-btn" onClick={() => setNoCount(c => c + 1)}>{noCount ? 'Think about it? 🥹' : 'Not yet'}</button></div>{noCount > 0 && <p className="gentle-note">That’s okay. Take your time — your feelings matter. 💗</p>}</>}
        </> : <><div className="final-image"><img src={celebration} alt="A joyful celebration"/></div><div className="eyebrow">A MESSAGE JUST FOR YOU</div><h1 className="final-title">For {receiver.trim() || 'you'}, with love. 💖</h1><p className="final-message">I’m sorry, and I hope we can take a small step forward together.</p><div className="signature">With love,<br/><strong>{sender.trim() || 'Someone who cares'}</strong></div><div className="final-actions"><button className="primary-btn" onClick={shareStory}>Share this card ↗</button><button className="soft-btn" onClick={reset}>Replay this little story ↻</button></div><p className="final-kindness">A sincere sorry is a beginning. Give each other time, listen with care, and let forgiveness happen freely. 💗</p></>}
      </div>
      <div className="ad-slot experience-ad"><span>ADVERTISEMENT</span><div>Ad space</div></div><p className="privacy-note">This experience runs in your browser. Names are not sent to a server by this demo.</p>
    </div>}
  </main>;
}
export default App;
