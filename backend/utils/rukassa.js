/**
 * RuKassa payment integration utility
 * Docs: https://rukassa.ru/docs
 */
const https  = require('https');
const crypto = require('crypto');
const qs     = require('querystring');

const RUKASSA_SHOP_ID = () => process.env.RUKASSA_SHOP_ID || '';
const RUKASSA_TOKEN   = () => process.env.RUKASSA_TOKEN   || '';

function isConfigured() {
  return !!(RUKASSA_SHOP_ID() && RUKASSA_TOKEN());
}

// RuKassa принимает form-urlencoded — НЕ JSON
function rukassaRequest(path, params) {
  return new Promise((resolve, reject) => {
    const data = qs.stringify(params);
    const req  = https.request({
      hostname: 'lk.rukassa.io',
      path,
      method:   'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch { resolve({ error: 'ParseError', raw: buf }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('RuKassa timeout')); });
    req.write(data);
    req.end();
  });
}

async function createInvoice({ amount, orderId, comment = '', hookUrl = '', successUrl = '' }) {
  if (!isConfigured()) {
    return { ok: false, error: 'RuKassa не настроен (RUKASSA_SHOP_ID / RUKASSA_TOKEN)' };
  }

  const numericOrderId = Date.now();
  const parts    = String(orderId).split('_');
  const userCode = parts.length >= 2 ? parts[1] : String(numericOrderId);

  const params = {
    shop_id:          parseInt(RUKASSA_SHOP_ID()),
    token:            RUKASSA_TOKEN(),
    order_id:         numericOrderId,
    amount:           parseFloat(amount),
    currency:         'USD',
    user_code:        userCode,
    data:             JSON.stringify({ original_order_id: String(orderId), comment: comment || '' }),
    notification_url: hookUrl,
    success_url:      successUrl,
    fail_url:         successUrl,
  };

  console.log('[RuKassa] createInvoice request:', JSON.stringify({ ...params, token: '***' }));

  try {
    const res = await rukassaRequest('/api/v1/create', params);
    console.log('[RuKassa] response:', JSON.stringify(res));

    if (res && res.url)  return { ok: true, payUrl: res.url,  invoiceId: String(res.id || numericOrderId) };
    if (res && res.link) return { ok: true, payUrl: res.link, invoiceId: String(res.id || numericOrderId) };
    return { ok: false, error: res?.message || res?.error || JSON.stringify(res) };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

function verifyWebhook(body) {
  try {
    const { shop_id, amount, order_id, sign: s } = body;
    if (!shop_id || !amount || !order_id || !s) return false;
    const secret  = process.env.RUKASSA_SECRET || RUKASSA_TOKEN();
    const expected = crypto.createHash('md5')
      .update(`${shop_id}:${amount}:${order_id}:${secret}`)
      .digest('hex');
    return expected === s.toLowerCase();
  } catch { return false; }
}

module.exports = { isConfigured, createInvoice, verifyWebhook };
