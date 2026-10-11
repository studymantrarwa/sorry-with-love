import { useEffect, useState } from 'react';
import './App.css';
import { story as originalStory } from './data/story';
import celebration from './assets/images/celebration.png';
import { seoPages } from './data/seoPages.js';

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

const articles = [
  {
    slug: 'how-to-apologize-sincerely',
    title: 'How to Apologize Sincerely: A Practical Guide',
    description: 'Learn how to give a sincere apology that takes responsibility, listens, and respects the other person’s feelings.',
    updated: 'October 2026',
    intro: 'A meaningful apology is not about finding perfect words. It is about acknowledging what happened, understanding its impact, and showing that you are willing to do better.',
    sections: [
      ['Name what happened clearly', 'Avoid vague phrases such as “sorry for everything.” Say what you did or said, without changing the subject or making excuses. Being specific shows that you have thought about the situation.'],
      ['Take responsibility without adding a “but”', 'Explain your intention only when it helps clarify the situation. Do not use it to cancel out the impact. “I was upset, but that does not make what I said okay” is more accountable than blaming the other person.'],
      ['Acknowledge the impact', 'Give the other person room to explain how they felt. You do not need to agree with every detail to listen respectfully. Try to understand before you defend yourself.'],
      ['Offer a realistic way to make things right', 'Ask what would help, or suggest a concrete change you can follow through on. Avoid promises you cannot keep. Consistent actions matter more than a dramatic message.'],
      ['Give them time', 'An apology does not create an obligation to forgive immediately. If the person asks for space, respect that boundary and do not keep sending messages to force a response.']
    ],
    takeaway: 'A good apology combines clear responsibility, empathy, repair, and changed behaviour. Use a card or written message to open a conversation, not to replace listening.'
  },
  {
    slug: 'sorry-message-for-girlfriend',
    title: 'How to Write a Heartfelt Sorry Message for Your Girlfriend',
    description: 'A thoughtful structure for writing a personal apology message to your girlfriend without pressure or empty promises.',
    updated: 'October 2026',
    intro: 'A heartfelt message feels personal because it reflects the real situation and the person receiving it. A copied line can be a starting point, but your own honesty is what gives it meaning.',
    sections: [
      ['Start with a direct apology', 'Use simple words such as “I am sorry for what I said yesterday.” Naming the issue helps the message feel genuine instead of generic.'],
      ['Show that you understand her perspective', 'Mention the impact you recognise, without claiming to know exactly how she feels. For example, you might say that you understand your words were hurtful and that she deserved a calmer conversation.'],
      ['Keep the focus on her feelings, not your fear', 'Avoid making her responsible for reassuring you or forgiving you quickly. A message should not use guilt, threats, or emotional pressure to get a reply.'],
      ['Say what you will change', 'Choose one action you can actually practise, such as listening without interrupting or taking a pause before responding in anger.'],
      ['End with room for her choice', 'Let her decide when she is ready to talk. A respectful closing might be: “I care about you, and I will give you the time you need.”']
    ],
    takeaway: 'Make the message specific to what happened between you. A romantic card can make the delivery memorable, but sincerity and changed behaviour are what build trust.'
  },
  {
    slug: 'what-not-to-say-in-an-apology',
    title: 'What Not to Say When You Apologize',
    description: 'Common apology mistakes to avoid, including excuses, blame, pressure to forgive, and promises without action.',
    updated: 'October 2026',
    intro: 'Even when you mean well, certain phrases can make an apology sound defensive. The goal is not to win an argument; it is to recognise harm and communicate respectfully.',
    sections: [
      ['“I am sorry you feel that way”', 'This can sound as though the other person’s feelings are the problem. Instead, acknowledge the action you are responsible for and ask what you need to understand.'],
      ['“I did it because you…”', 'Blaming the other person shifts responsibility. You can discuss the wider disagreement later while still owning your own behaviour.'],
      ['“I said sorry, so move on”', 'An apology does not set a deadline for someone else’s feelings. Give the person time to decide what they need.'],
      ['Repeated messages after they ask for space', 'Sending more apologies over and over can become pressure. Respect a request for no contact or a pause, and wait unless there is a genuine practical matter that must be addressed.'],
      ['Promises you cannot keep', 'Saying “I will never make a mistake again” is unrealistic. Name a specific change and follow through consistently.']
    ],
    takeaway: 'Use calm, specific language. Avoid excuses and pressure, and let your future actions support the words you say today.'
  },
  {
    slug: 'rebuild-trust-after-an-argument',
    title: 'How to Rebuild Trust After an Argument',
    description: 'Small, realistic steps for rebuilding trust after conflict through listening, accountability, boundaries, and consistency.',
    updated: 'October 2026',
    intro: 'Trust usually returns through repeated experiences, not one perfect conversation. After an argument, focus on understanding what happened and making future interactions safer and more respectful.',
    sections: [
      ['Talk when both people are ready', 'If emotions are still high, agree on a reasonable time to return to the conversation. A pause should help both people settle, not become a way to punish or control.'],
      ['Listen for the underlying concern', 'Ask open questions and reflect what you heard. Do not prepare your rebuttal while the other person is explaining their experience.'],
      ['Agree on a practical change', 'Choose a specific behaviour to work on, such as avoiding insults, taking a short break during heated conversations, or checking assumptions before reacting.'],
      ['Be consistent over time', 'Follow through on small commitments. If you slip, acknowledge it honestly and return to the plan instead of pretending nothing happened.'],
      ['Respect boundaries and outcomes', 'The other person may need space or may decide the relationship should change. Trust cannot be demanded, and respecting a boundary is part of responsible communication.']
    ],
    takeaway: 'A sincere apology can begin repair, but trust is rebuilt by consistent actions, honest conversations, and respect for each person’s choices.'
  },
  {
    slug: 'apology-message-examples',
    title: 'Apology Message Examples You Can Personalise',
    description: 'Short apology message examples for hurtful words, missed commitments, and misunderstandings, with tips for making them personal.',
    updated: 'October 2026',
    intro: 'Templates can help when you are unsure how to begin. Use these examples as a structure, then replace the general wording with the specific action and impact in your situation.',
    sections: [
      ['After saying something hurtful', '“I am sorry for the words I used earlier. They were hurtful, and I should have spoken more respectfully. I understand if you need time. I will work on pausing before I respond when I am upset.”'],
      ['After missing a commitment', '“I am sorry I did not follow through on what I promised. I understand that it affected your plans and your trust in me. I should have told you sooner. Here is what I can do now, and I will communicate earlier next time.”'],
      ['After a misunderstanding', '“I am sorry I jumped to a conclusion instead of asking you what you meant. I can see how that made the conversation harder. I would like to listen and understand your point of view when you are ready.”'],
      ['When you need to apologise but do not know everything yet', '“I know something I did hurt you, and I am sorry. I want to understand the impact instead of making assumptions. If you are comfortable talking about it, I will listen without interrupting.”'],
      ['Make every example your own', 'Mention what actually happened, avoid promises that you cannot guarantee, and remove any sentence that puts pressure on the recipient to forgive you or reply immediately.']
    ],
    takeaway: 'The strongest apology message is truthful and specific. Do not send a template that says more than you genuinely mean or promises a change you are not prepared to make.'
  },
  {
    slug: 'sorry-message-for-boyfriend',
    title: 'How to Write a Sincere Sorry Message for Your Boyfriend',
    description: 'A practical guide to apologising to your boyfriend with honesty, accountability, and respect for his feelings.',
    updated: 'October 2026',
    intro: 'When you have hurt your boyfriend, the best message is not necessarily the longest or most romantic one. It is the one that honestly names what happened, recognises its effect, and makes room for a real conversation.',
    sections: [
      ['Be clear about what you are sorry for', 'Mention the words, action, or missed commitment that you regret. A general “sorry for everything” can feel distant because it does not show what you understand. Keep the message focused on your part rather than reopening every disagreement.'],
      ['Recognise how it may have affected him', 'You might say, “I can see how my joke embarrassed you,” or “I understand that cancelling at the last minute disrupted your plans.” Avoid telling him how he should feel; ask and listen if you are unsure.'],
      ['Do not use romance to skip accountability', 'A cute nickname, love quote, or animated card can make a message warmer, but it cannot replace responsibility. Avoid adding “but you also…” to cancel out your apology. Discuss both perspectives separately and calmly.'],
      ['Offer one real change', 'Choose something you can follow through on, such as speaking respectfully during arguments, communicating sooner when plans change, or asking instead of assuming. A realistic commitment is more trustworthy than promising you will never make a mistake again.'],
      ['Give him room to respond in his own time', 'Send one thoughtful message and allow him to decide when he is ready to talk. Repeated messages, guilt, or demands for immediate forgiveness can make repair harder. If he asks for space, respect it.']
    ],
    takeaway: 'A useful message could begin: “I am sorry for ____. I understand it affected you by ____. I should have ____. Next time I will ____. You do not have to reply immediately; I am ready to listen when you want to talk.” Fill in the blanks truthfully.'
  },
  {
    slug: 'sorry-message-for-wife',
    title: 'Sorry Message for Your Wife: Apologise with Care and Accountability',
    description: 'Learn to apologise to your wife with respect, practical repair, and actions that support trust in a marriage.',
    updated: 'October 2026',
    intro: 'In a marriage, an apology is most meaningful when it treats your partner as an equal and recognises the effect of your behaviour on your shared life. The aim is not to end a disagreement quickly; it is to understand what happened and take responsibility for your part.',
    sections: [
      ['Choose a calm and respectful moment', 'If either of you is overwhelmed, ask when you can return to the conversation rather than forcing it immediately. A pause should be a mutual way to settle, not silent punishment or a way to avoid the subject indefinitely.'],
      ['Name the specific behaviour', 'Instead of “sorry if you were upset,” try “I am sorry I dismissed your concern while you were explaining it.” Specific language shows that you are taking your own actions seriously without claiming that one sentence fixes everything.'],
      ['Listen without turning the apology into a debate', 'Let your wife describe the impact before defending your intention. You can explain your perspective later, but it should not be used to erase the hurt or shift responsibility onto her.'],
      ['Repair the practical impact', 'If your actions created extra work, disrupted a plan, or broke an agreement, offer a concrete way to help put it right. Ask what would be useful rather than assuming that a gift or romantic gesture is what she needs.'],
      ['Show change in ordinary moments', 'Trust grows when respectful behaviour continues after the conversation. Follow through on the change you promised, share responsibilities fairly, and revisit the issue if the same pattern returns.']
    ],
    takeaway: 'You could write: “I am sorry I ____. I understand that it affected you by ____. You deserved more care and respect from me. I want to hear how this felt for you, and I will work on ____.” Make the words specific to your situation and back them up with action.'
  },
  {
    slug: 'sorry-message-for-husband',
    title: 'How to Say Sorry to Your Husband in a Meaningful Way',
    description: 'Thoughtful apology guidance for your husband, with examples that balance affection, honesty, and personal responsibility.',
    updated: 'October 2026',
    intro: 'A sincere apology to your husband should sound like you, not like a script designed to make a difficult conversation disappear. Focus on the behaviour you regret, what you have understood, and what you can realistically do differently.',
    sections: [
      ['Start without minimising the issue', 'Say what you did or said plainly. Avoid describing the issue as “nothing” or suggesting he is too sensitive. Even when you remember an event differently, you can acknowledge the impact of your own words or choices.'],
      ['Acknowledge the feeling or consequence', 'For example, if you made a decision without discussing it, recognise that it may have left him feeling excluded. If you are unsure what the impact was, ask him and listen rather than guessing.'],
      ['Separate your explanation from your excuse', 'Context can matter, but it does not remove responsibility. You might explain that you were stressed while still recognising that speaking harshly was not okay. Avoid using a stressful day as a reason the other person should simply move on.'],
      ['Agree on a practical next step', 'Offer a change that can be observed: discuss major plans together, avoid insults in conflict, or tell each other when a conversation needs a short break. If repair involves a practical task, take responsibility for your share.'],
      ['Let the apology breathe', 'Your husband may need time to think. Do not make forgiveness a test of love or ask him to reassure you immediately. Return to the conversation respectfully when you have both had time, if he is willing.']
    ],
    takeaway: 'A personal message might say: “I am sorry for ____. I can see why that was hurtful or frustrating. I should have ____. I plan to ____ differently, and I want to understand your perspective when you are ready.” Honest follow-through matters more than perfect wording.'
  },
  {
    slug: 'sorry-message-for-best-friend',
    title: 'Sorry Message for Your Best Friend: How to Repair a Friendship',
    description: 'Ways to apologise to your best friend after a misunderstanding, broken confidence, or hurtful comment while respecting boundaries.',
    updated: 'October 2026',
    intro: 'A close friendship can hold years of memories, but closeness does not make hurt feelings disappear automatically. A thoughtful apology recognises the friendship without using its history as a reason your friend must forgive you.',
    sections: [
      ['Be honest about the moment that hurt them', 'Mention what happened, whether it was a careless joke, a broken promise, sharing something private, or not showing up when you said you would. Avoid vague apologies that make your friend work out what you mean.'],
      ['Do not defend a joke just because you meant it lightly', 'Intent and impact can differ. You can explain what you meant after listening, but do not insist that your friend has no reason to be hurt because you were joking. Take their reaction seriously.'],
      ['Protect their confidence and privacy', 'If you shared something they told you privately, acknowledge that breach directly. Do not repeat the private details in another message or involve mutual friends to pressure them. Explain what you will do to protect their trust going forward.'],
      ['Offer repair without demanding the old closeness back', 'Ask whether there is a practical way to make things right. Your friend may need time or different boundaries. Avoid saying “after all we have been through, you should forgive me”; shared history is not a debt.'],
      ['Show that you learned something', 'Keep future promises, avoid repeating the same joke or behaviour, and be reliable in small ways. If you disagree about part of what happened, discuss it respectfully without withdrawing the apology for your own actions.']
    ],
    takeaway: 'Try: “I am sorry I ____. I understand why that hurt and I should have handled it differently. I value our friendship, but I do not expect you to be okay immediately. I will ____ to make sure I respect your trust.” Personalise every blank and respect your friend’s response.'
  }

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
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const article = articles.find(item => path === `/blog/${item.slug}`);
  const seoPage = seoPages.find(item => path === `/${item.slug}`);
  useEffect(() => {
    const pageTitle = seoPage ? `${seoPage.title} | Sorry with Love` : article ? `${article.title} | Sorry with Love` : path === '/blog' ? 'Apology Advice & Relationship Communication | Sorry with Love' : ({ '/about': 'About Sorry with Love', '/contact': 'Contact Sorry with Love', '/privacy': 'Privacy Policy | Sorry with Love', '/terms': 'Terms of Use | Sorry with Love', '/disclaimer': 'Disclaimer | Sorry with Love', '/sorry-my-girl': 'Sorry, My Girl | Sorry with Love' }[path] || null);
    if (pageTitle) document.title = pageTitle;
    const descriptions = {
      '/blog': 'Original apology message guides for a boyfriend, girlfriend, wife, husband, best friend, and better conversations.',
      '/about': 'Learn about Sorry with Love, a creative website for personalised apology cards and thoughtful communication.',
      '/contact': 'Contact Sorry with Love with questions, feedback, or suggestions about the website.',
      '/privacy': 'Read how Sorry with Love handles share links, technical data, cookies, and advertising disclosures.',
      '/terms': 'Read the terms for using Sorry with Love apology cards and sharing personalised messages.',
      '/disclaimer': 'Read the Sorry with Love disclaimer about apology templates and relationship outcomes.',
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
      </section>
      <div className="embedded-frame-wrap">
        <iframe title="Sorry, My Girl animated apology page" src="https://sorry-my-girl.vercel.app" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen" />
      </div>
      <p className="embed-fallback">If the page does not appear, the original site may block embedding. <a href="https://sorry-my-girl.vercel.app" target="_blank" rel="noopener noreferrer">Open Sorry, My Girl in a new tab</a>.</p>
      <footer className="footer">Sorry with Love · Made with hope and a whole lot of heart ♥</footer>
    </main>;
  }

  const renderArticleCards = () => <div className="article-grid">{articles.map(item => <article className="article-card" key={item.slug}><div className="article-label">PRACTICAL APOLOGY GUIDE</div><h3><a href={`/blog/${item.slug}`}>{item.title}</a></h3><p>{item.description}</p><a className="article-read" href={`/blog/${item.slug}`}>Read the guide <span>→</span></a></article>)}</div>;
  const renderSeoTopicCards = () => <div className="article-grid">{seoPages.map(item => <article className="article-card" key={item.slug}><div className="article-label">SORRY MESSAGE & CARD GUIDE</div><h3><a href={`/${item.slug}`}>{item.title}</a></h3><p>{item.description}</p><a className="article-read" href={`/${item.slug}`}>Explore this guide <span>→</span></a></article>)}</div>;
  if (seoPage) return <main className="app legal-app"><header className="topbar"><a className="brand" href="/"><img src="/logo.svg" alt="" className="brand-logo"/><span>Sorry with Love</span></a><a className="back-btn" href="/blog">← All guides</a></header><article className="article-page"><div className="eyebrow">SORRY WITH LOVE · APOLOGY GUIDE</div><h1>{seoPage.title}</h1><p className="article-intro">{seoPage.intro}</p>{seoPage.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}<section><h2>Create a personalised sorry card</h2><p>When a card fits the situation, you can use Sorry with Love to choose a story style, add names, preview the message, and share it thoughtfully. A card is an opening for communication, not a guarantee of forgiveness.</p><a className="primary-btn legal-home" href="/#stories">Create a sorry card ♡</a></section><p className="article-note">Use these examples as a starting point. Personalise them honestly, respect boundaries, and avoid pressuring anyone to forgive or reply.</p><a className="article-read" href="/blog">Browse all apology guides →</a></article><footer className="footer">Sorry with Love · Made with hope and a whole lot of heart ♥<nav className="footer-links"><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/blog">Blog & Guides</a></nav></footer></main>;
  if (path === '/blog') return <main className="app legal-app"><header className="topbar"><a className="brand" href="/"><img src="/logo.svg" alt="" className="brand-logo"/><span>Sorry with Love</span></a><a className="back-btn" href="/">← Home</a></header><section className="blog-page-heading"><div className="eyebrow">THE SORRY WITH LOVE JOURNAL</div><h1>Apology advice for honest conversations</h1><p>Original, practical guides for apology messages to partners, spouses, and friends, plus advice on listening well and rebuilding trust without pressure.</p></section><section className="blog-listing">{renderArticleCards()}</section><section className="blog-page-heading"><div className="eyebrow">MORE WAYS TO SAY SORRY</div><h2>Sorry messages, apology cards and situation guides</h2><p>Explore practical topic pages for different relationships and situations. Each guide offers examples to personalise, not promises of a particular outcome.</p></section><section className="blog-listing">{renderSeoTopicCards()}</section><footer className="footer">Sorry with Love · Made with hope and a whole lot of heart ♥<nav className="footer-links"><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer></main>;
  if (article) return <main className="app legal-app"><header className="topbar"><a className="brand" href="/"><img src="/logo.svg" alt="" className="brand-logo"/><span>Sorry with Love</span></a><a className="back-btn" href="/blog">← All articles</a></header><article className="article-page"><div className="eyebrow">SORRY WITH LOVE · PRACTICAL GUIDE · {article.updated}</div><h1>{article.title}</h1><p className="article-intro">{article.intro}</p>{article.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}<div className="article-takeaway"><h2>Remember</h2><p>{article.takeaway}</p></div><p className="article-note">These guides offer general communication suggestions, not professional counselling or a guarantee of any relationship outcome.</p><a className="primary-btn legal-home" href="/blog">Read more guides</a></article><footer className="footer">Sorry with Love · Made with hope and a whole lot of heart ♥<nav className="footer-links"><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer></main>;

  const legalPages = {
    '/about': { title: 'About Sorry with Love', body: <>Sorry with Love is a creative experience that helps people express an apology with kindness. Choose a story card, add the sender and receiver names, and move through a gentle personalised message. We encourage honest communication, patience, and respect for the other person’s feelings. Forgiveness cannot be guaranteed; give each other time and space.</> },
    '/privacy': { title: 'Privacy Policy', body: <><p>Sorry with Love lets you personalise a story in your browser. If you choose to share a story, sender and recipient names may be included in the shareable URL. Anyone with that URL may be able to see those names, and the URL may appear in browser history or hosting request logs. Do not include information you do not want to share.</p><p>Hosting providers may process technical data such as IP address, request details, and security logs. If you contact us, we will use the information you provide to respond to your enquiry.</p><p>If Google AdSense or other advertising services are enabled, third parties may use cookies, web beacons, IP addresses, or similar technologies to serve and measure ads. Third-party vendors, including Google, may use cookies to serve ads based on a user’s visits to this and other websites. Learn more at <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">How Google uses information from sites or apps</a>.</p><p>You can control cookies through your browser settings. This policy may be updated as the site changes.</p><p><strong>Contact:</strong> Use the Contact Us page to find the site's current contact method. The site owner should publish a monitored contact email before enabling advertising.</p></> },
    '/terms': { title: 'Terms of Use', body: <><p>Use Sorry with Love lawfully and respectfully. You are responsible for the names and text you enter and for how you share the generated experience.</p><p>This creative messaging tool does not guarantee that a recipient will forgive or respond. Do not use it to harass, pressure, threaten, or repeatedly contact someone who has asked for no contact.</p><p>The site is provided as-is. Features may change, and uninterrupted availability is not guaranteed.</p></> },
    '/contact': { title: 'Contact Us', body: <><p>Questions, feedback, or suggestions about Sorry with Love are welcome. The site owner should add a monitored support email address here before launch so visitors can contact the person responsible for the website.</p><p><strong>Contact email:</strong> Not configured yet.</p></> },
    '/disclaimer': { title: 'Disclaimer', body: <>Sorry with Love is an independent creative website. It is not a counselling service and does not guarantee any relationship outcome. Messages are templates to help people communicate sincerely. Please personalise them honestly, accept the other person’s decision, and respect their boundaries.</> }
  };
  if (legalPages[path]) return <main className="app legal-app"><header className="topbar"><a className="brand" href="/"><img src="/logo.svg" alt="" className="brand-logo"/><span>Sorry with Love</span></a><a className="back-btn" href="/">← Home</a></header><article className="legal-panel"><div className="eyebrow">SORRY WITH LOVE · INFORMATION</div><h1>{legalPages[path].title}</h1><div className="legal-copy">{legalPages[path].body}</div><a className="primary-btn legal-home" href="/">Back to the love stories ♡</a></article><footer className="footer">Sorry with Love · Made with hope and a whole lot of heart ♥</footer></main>;

  const next = () => { if (page < steps.length) setPage(p => p + 1); else setAccepted(true); };
  const message = (steps[Math.min(page, steps.length - 1)]?.text || '').replaceAll('{receiver}', receiver.trim() || 'you');
  return <main className={`app theme-${template.theme}`}>
    {!started ? <>
      <header className="site-nav"><a className="brand" href="#home"><img src="/logo.svg" alt="Sorry with Love logo" className="brand-logo"/><span>Sorry <i>with Love</i></span></a><nav className="main-nav" aria-label="Main navigation"><a href="#home">Home</a><a href="#stories">Love Cards</a><a href="#how-it-works">How it works</a><a href="/blog">Blog</a><a href="/about">About</a></nav><a className="nav-cta" href="#stories">Create a sorry <span>♡</span></a></header>
      <section className="hero hero-premium" id="home"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> A LITTLE LOVE CAN CHANGE EVERYTHING</div><h1>Some feelings deserve<br/>more than just <em>“sorry”.</em></h1><p>Turn your heartfelt apology into a beautiful little story. Add your names, choose a style, and send a moment that says what words sometimes can’t.</p><div className="hero-actions"><a className="primary-btn hero-cta" href="#stories">Create your love story <span>↗</span></a><a className="hero-text-link" href="#how-it-works">See how it works ↓</a></div><div className="hero-proof"><span className="proof-heart">♡</span><div><strong>Made for your special person</strong><small>Personal · Thoughtful · Easy to share</small></div></div></div><div className="hero-visual" aria-label="Romantic apology card illustration"><div className="visual-glow"/><div className="floating-heart heart-one">♥</div><div className="floating-heart heart-two">♡</div><div className="floating-spark spark-one">✦</div><div className="floating-spark spark-two">✧</div><div className="love-envelope"><div className="envelope-top"/><div className="envelope-letter"><span>To my favourite person</span><strong>I’m sorry.</strong><small>With all my love, always.</small><b>♥</b></div><div className="envelope-flap"/><div className="envelope-seal">♡</div></div><div className="visual-caption"><span>✦</span> A little note from the heart</div></div></section>
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
      <section className="blog-preview" id="blog-guides"><div className="blog-heading"><div><div className="section-kicker">AFTER THE LOVE CARDS</div><h2>Words that help you make things right</h2><p>Original, practical guides to sincere apologies, better conversations, and rebuilding trust.</p></div><a className="article-read all-articles" href="/blog">View all guides <span>→</span></a></div>{renderArticleCards()}</section>
      <div className="ad-slot"><span>ADVERTISEMENT</span><div>Advertisement space · Ads appear here after AdSense setup and approval</div></div>
      <footer className="footer">Sorry with Love · Made with hope and a whole lot of heart <span>♥</span><nav className="footer-links" aria-label="Information"><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/disclaimer">Disclaimer</a><a href="/blog">Blog & Guides</a></nav></footer>
    </> : <div className="experience-wrap">
      <header className="experience-header"><button className="back-btn" onClick={reset}>← Back</button><span>{template.icon} {template.title}</span><button className="restart-btn" onClick={reset}>Start over</button></header>
      <div className="experience-card">
        {!accepted ? <>
          <div className="experience-art" aria-hidden="true">{isNight ? <><span className="moon">☾</span><span className="star star-a">✦</span><span className="star star-b">✧</span><span className="teddy">🧸</span><span className="heart-float">💕</span></> : selected === 'floral' ? <><span className="flower">🌷</span><span className="flower flower-two">🌸</span><span className="heart-float">💗</span></> : selected === 'minimal' ? <span className="letter-art">💌</span> : <><span className="heart-float">💗</span><span className="teddy">🧸</span><span className="sparkle">✨</span></>}</div>
          <div className="sender-line">A little message from <strong>{sender.trim() || 'Someone who cares'}</strong></div>
          {page < steps.length ? <><div className="story-progress"><span style={{width: `${((page + 1) / (steps.length + 1)) * 100}%`}}/></div><p className="story-counter">A NOTE FROM THE HEART · {page + 1} / {steps.length + 1}</p><h1 className="story-text">{message}</h1><button className="primary-btn" onClick={next}>{isNight && page === 0 ? 'Let me talk…' : 'Next little note'} <span>→</span></button></> : <><p className="story-counter">ONE LAST QUESTION</p><h1 className="story-text">Can you forgive me, {receiver.trim() || 'my favourite person'}? 🥺</h1><p className="story-support">I’ll do my best to listen, learn, and make things right.</p><div className="answer-buttons"><button className="primary-btn" onClick={() => setAccepted(true)}>Yes, let’s be okay 💖</button><button className="soft-btn" onClick={() => setNoCount(c => c + 1)}>{noCount ? 'Think about it? 🥹' : 'Not yet'}</button></div>{noCount > 0 && <p className="gentle-note">That’s okay. Take your time — your feelings matter. 💗</p>}</>}
        </> : <><div className="final-image"><img src={celebration} alt="A joyful celebration"/></div><div className="eyebrow">A MESSAGE JUST FOR YOU</div><h1 className="final-title">For {receiver.trim() || 'you'}, with love. 💖</h1><p className="final-message">I’m sorry, and I hope we can take a small step forward together.</p><div className="signature">With love,<br/><strong>{sender.trim() || 'Someone who cares'}</strong></div><div className="final-actions"><button className="primary-btn" onClick={shareStory}>Share this card ↗</button><button className="soft-btn" onClick={reset}>Replay this little story ↻</button></div><p className="final-kindness">A sincere sorry is a beginning. Give each other time, listen with care, and let forgiveness happen freely. 💗</p></>}
      </div>
      <div className="ad-slot experience-ad"><span>ADVERTISEMENT</span><div>Ad space</div></div><p className="privacy-note">Names may be included in the share link. Only share it with people you trust.</p>
    </div>}
  </main>;
}
export default App;
