const handlers = {
  "_lib": null,
  "advanced": require("../lib/api/advanced"),
  "admin": require("../lib/api/admin"),
  "admin-register": require("../lib/api/admin-register"),
  "admin-astrologer": require("../lib/api/admin-astrologer"),
  "astrologer-settings": require("../lib/api/astrologer-settings"),
  "astrologer/settings": require("../lib/api/astrologer-settings"),
  "astrologer/status": require("../lib/api/astrologer-settings"),
  "astrologer-panel": require("../lib/api/astrologer-panel"),
  "astrologer-register": require("../lib/api/astrologer-register"),
  "astrologer-profile": require("../lib/api/astrologer-profile"),
  "astrologer-requests": require("../lib/api/astrologer-requests"),
  "astrologer-users": require("../lib/api/astrologer-users"),
  "astrologers": require("../lib/api/astrologers"),
  "chat": require("../lib/api/chat"),
  "call-requests": require("../lib/api/call-requests"),
  "call-signaling": require("../lib/api/call-signaling"),
  "config": require("../lib/api/config"),
  "turn-credentials": require("../lib/api/turn-credentials"),
  "horoscope": require("../lib/api/horoscope"),
  "jyotish": require("../lib/api/jyotish"),
  "language": require("../lib/api/language"),
  "astrologer-apply": require("../lib/api/astrologer-apply"),
  "finance": require("../lib/api/finance"),
  "kundli": require("../lib/api/kundli"),
  "login": require("../lib/api/login"),
  "password-reset-request": require("../lib/api/password-reset-request"),
  "password-reset-confirm": require("../lib/api/password-reset-confirm"),
  "matching": require("../lib/api/matching"),
  "me": require("../lib/api/me"),
  "messages": require("../lib/api/messages"),
  "shared-kundli": require("../lib/api/shared-kundli"),
  "payments": require("../lib/api/payments"),
  "wallet": require("../lib/api/wallet"),
  "payment-gateway": require("../lib/api/payment-gateway"),
  "chat-room": require("../lib/api/chat-room"),
  "my-kundlis": require("../lib/api/my-kundlis"),
  "numerology": require("../lib/api/numerology"),
  "panchang": require("../lib/api/panchang"),
  "muhurat": require("../lib/api/muhurat"),
  "places": require("../lib/api/places"),
  "profile": require("../lib/api/profile"),
  "register": require("../lib/api/register"),
  "reviews": require("../lib/api/reviews"),
  "referral": require("../lib/api/referral"),
  "feedback": require("../lib/api/feedback"),
  "follow": require("../lib/api/follow"),
  "health": require("../lib/api/health"),
  "notifications": require("../lib/api/notifications"),
  "pooja": require("../lib/api/pooja"),
  "push": require("../lib/api/push")
};

module.exports = async (req, res) => {
  res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy',"default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; style-src 'self' 'unsafe-inline' https:; img-src 'self' https: data: blob:; font-src 'self' https: data:; connect-src 'self' https: wss: stun: turn: turns:; media-src 'self' https: blob:; frame-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self' https:; frame-ancestors 'none'; upgrade-insecure-requests");
  res.setHeader('X-Permitted-Cross-Domain-Policies','none');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Permissions-Policy','camera=(self), microphone=(self), geolocation=(self), payment=(self)');
  let route = String(req.query?.route || "").replace(/^\/+|\/+$/g, "");
  route = route.replace(/\.js$/i, "");

  if (!route || route === "index") {
    return res.status(200).json({
      ok: true,
      service: "Bhavishya Gyani Astrology API",
      version: "V9",
      message: "API gateway is running"
    });
  }

  const handler = handlers[route];
  if (!handler) {
    return res.status(404).json({ error: "API route not found", route });
  }

  return handler(req, res);
};
