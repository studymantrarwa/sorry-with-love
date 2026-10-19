// k6 staged public-page load test. Run ONLY against a staging deployment you own.
// Install k6 separately, then: BASE_URL=https://staging.example.com TARGET_VUS=20000 k6 run scripts/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
const errorRate = new Rate('http_errors');
const base = (__ENV.BASE_URL || '').replace(/\/$/, '');
const target = Math.max(1, Number(__ENV.TARGET_VUS || 100));
if (!base) throw new Error('Set BASE_URL to your staging deployment. Do not run against production without approval.');
export const options = {
  scenarios: { public_browse: { executor: 'ramping-vus', startVUs: 0, stages: [
    { duration: '2m', target: Math.min(100, target) },
    { duration: '3m', target: Math.min(500, target) },
    { duration: '3m', target: Math.min(1000, target) },
    { duration: '5m', target },
    { duration: '2m', target: 0 },
  ], gracefulRampDown: '30s' } },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<1500'], http_errors: ['rate<0.01'] },
};
const paths = ['/', '/kundli-form', '/pdf-kundli', '/tarot', '/ram-prashnavali', '/rashi', '/numerology', '/panchang-muhurat', '/robots.txt', '/sitemap.xml'];
export default function () {
  const path = paths[Math.floor(Math.random() * paths.length)];
  const res = http.get(`${base}${path}`, { tags: { page: path }, timeout: '15s' });
  const ok = check(res, { 'HTTP 200': r => r.status === 200 });
  errorRate.add(!ok);
  sleep(1);
}
