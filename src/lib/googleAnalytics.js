const CONSENT_KEY = 'swl_analytics_consent_v1';
let initialized = false;
let measurementId = '';

export function getAnalyticsConsent() {
  try { return window.localStorage.getItem(CONSENT_KEY); } catch { return null; }
}

export function setAnalyticsConsent(value) {
  try { window.localStorage.setItem(CONSENT_KEY, value); } catch { /* storage may be unavailable */ }
  window.dispatchEvent(new CustomEvent('swl:analytics-consent-updated', { detail: { value } }));
}

export function initializeGoogleAnalytics(id = import.meta.env.VITE_GA_MEASUREMENT_ID) {
  if (initialized || !id || !/^G-[A-Z0-9]+$/i.test(id) || getAnalyticsConsent() !== 'accepted') return false;
  measurementId = id;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  // Disable automatic page views; the SPA sends clean pathname-only page views below.
  window.gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.dataset.swlGoogleAnalytics = 'true';
  document.head.appendChild(script);
  initialized = true;
  return true;
}

export function trackGooglePageView(pathname) {
  if (getAnalyticsConsent() !== 'accepted') return;
  initializeGoogleAnalytics();
  if (typeof window.gtag !== 'function' || !measurementId) return;
  // Do not send search parameters: shared-card URLs can contain names.
  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: `${window.location.origin}${pathname || '/'}`,
    page_path: pathname || '/',
  });
}

export function trackGoogleEvent(eventName, params = {}) {
  if (getAnalyticsConsent() !== 'accepted') return;
  initializeGoogleAnalytics();
  if (typeof window.gtag !== 'function' || !measurementId) return;
  window.gtag('event', eventName, params);
}
