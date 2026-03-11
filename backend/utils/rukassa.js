/**
 * RuKassa payment integration utility
 * Docs: https://rukassa.ru/docs
 */
const https  = require('https');
const crypto = require('crypto');

const RUKASSA_SHOP_ID  = () => process.env.RUKASSA_SHOP_ID  || '';
const RUKASSA_SECRET   = () => process.env.RUKASSA_SECRET   || '';

/**
 * Check if RuKassa is configured
 */
function isConfigured() {
  return !!(RUKASSA_SHOP_ID() && RUKASSA_SECRET());
}

/**
 * Generate MD5 hash signature for RuKassa
 * Format: MD5(shop_id:amount:order_id:secret_key)
 */
function sign(shopId, amount, orderId) {
  return crypto
    .createHash('md5')
    .update(`${shopId}:${amount}:${orderId}:${RUKASSA_SECRET()}`)
    .digest('hex');
}

/**
 * Make a POST request to RuKassa API
 */
function rukassaRequest(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);

    const options = {
      hostname: 'lk.rukassa.ru',
      path,
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'Accept':         'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch { resolve({ error: 'ParseError', data: null }); }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('RuKassa request timeout')); });
    req.write(data);
    req.end();
  });
}

/**
 * Create a RuKassa invoice
 * @param {object} params
 * @param {number}  params.amount     - Amount in RUB
 * @param {string}  params.orderId    - Unique order ID
 * @param {string}  params.comment    - Payment comment
 * @param {string}  params.hookUrl    - Webhook URL for payment notifications
 * @param {string}  params.successUrl - Redirect URL after payment
 * @param {string}  [params.method]   - Payment method: 'card', 'sbp', 'crypto' (optional)
 * @returns {Promise<{ok: boolean, payUrl?: string, invoiceId?: string, error?: string}>}
 */
async function createInvoice({ amount, orderId, comment = '', hookUrl = '', successUrl = '', method = '' }) {
  if (!isConfigured()) {
    return { ok: false, error: 'RuKassa не настроен (RUKASSA_SHOP_ID / RUKASSA_SECRET)' };
  }

  const shopId = RUKASSA_SHOP_ID();
  const body = {
    shop_id:     shopId,
    order_id:    orderId,
    amount:      String(amount),
    hash:        sign(shopId, amount, orderId),
    comment,
    notification_url: hookUrl,
    success_url:      successUrl,
    fail_url:         successUrl,
  };

  if (method) body.method = method;

  try {
    const res = await rukassaRequest('/api/v1/create', body);

    if (res && res.link) {
      return {
        ok:        true,
        payUrl:    res.link,
        invoiceId: String(res.id || orderId),
      };
    }

    const errMsg = res?.message || res?.error || 'Неизвестная ошибка RuKassa';
    return { ok: false, error: errMsg };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Verify RuKassa webhook signature
 * RuKassa sends MD5(shop_id:amount:order_id:secret_key) in "sign" field of body
 * @param {object} body - Parsed request body
 * @returns {boolean}
 */
function verifyWebhook(body) {
  if (!RUKASSA_SECRET()) return false;

  try {
    const { shop_id, amount, order_id, sign: receivedSign } = body;
    if (!shop_id || !amount || !order_id || !receivedSign) return false;

    const expected = sign(shop_id, amount, order_id);
    return expected === receivedSign.toLowerCase();
  } catch {
    return false;
  }
}

module.exports = { isConfigured, createInvoice, verifyWebhook, sign };
