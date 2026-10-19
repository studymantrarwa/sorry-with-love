import { useEffect, useState } from 'react';
import { getAnalyticsConsent, setAnalyticsConsent } from '../lib/googleAnalytics.js';

export default function AnalyticsConsent() {
  const [choice, setChoice] = useState(() => getAnalyticsConsent());
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    const update = (event) => setChoice(event.detail?.value || getAnalyticsConsent());
    window.addEventListener('swl:analytics-consent-updated', update);
    return () => window.removeEventListener('swl:analytics-consent-updated', update);
  }, []);
  if ((choice === 'accepted' || choice === 'rejected') && !settingsOpen) return <button className="analytics-preferences" type="button" onClick={() => setSettingsOpen(true)}>Privacy choices</button>;
  return <aside className="analytics-consent" role="dialog" aria-label="Analytics and privacy choices" aria-live="polite">
    <div className="analytics-consent-copy"><strong>Privacy choices</strong><p>Sorry with Love would like to use Google Analytics to understand which pages are helpful. Optional analytics stays off unless you agree. Read our <a href="/privacy">Privacy Policy</a> and <a href="/cookies">Cookie Policy</a>.</p></div>
    <div className="analytics-consent-actions"><button type="button" className="consent-secondary" onClick={() => { setAnalyticsConsent('rejected'); setSettingsOpen(false); }}>Reject optional analytics</button><button type="button" className="consent-primary" onClick={() => { setAnalyticsConsent('accepted'); setSettingsOpen(false); }}>Allow analytics</button></div>
  </aside>;
}
