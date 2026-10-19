const handler = require('../lib/api/payment-webhook');
module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
