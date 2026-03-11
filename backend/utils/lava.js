/**
 * Lava payment integration utility
 * Docs: https://dev.lava.ru
 */
const https  = require('https');
const crypto = require('crypto');

const LAVA_SECRET_KEY = () => process.env.LAVA_SECRET_KEY || '';
const LAVA_SHOP_ID    = () => process.env.LAVA_SHOP_ID    || '';

/**
 * Check if Lava is configured
 */
function isConfigured() {
  return !!(LAVA_SECRET_KEY() && LAVA_SHOP_ID());
}

/**
 * Generate SHA-256 HMAC signature for Lava request
 */
function sign(body) {
  return crypto
    .createHmac('sha256', LAVA_SECRET_KEY())
    .update(JSON.stringify(body))
    .digest('hex');
}

/**
 * Make a POST request to Lava API
 */
function lavaRequest(path, body) {
  return new Promise((resolve, reject) => {
    const data      = JSON.stringify(body);
    const signature = sign(body);

    const options = {
      hostname: 'api.lava.ru',
      path,
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'Signature':     signature,
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch { resolve({ status_code: 0, error: 'ParseError', data: null }); }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Lava request timeout')); });
    req.write(data);
    req.end();
  });
}

/**
 * Create a Lava invoice
 * @param {object} params
 * @param {number}  params.amount     - Amount in RUB
 * @param {string}  params.orderId    - Unique order ID
 * @param {string}  params.comment    - Payment comment
 * @param {string}  params.hookUrl    - Webhook URL for payment notifications
 * @param {string}  params.successUrl - Redirect URL after payment
 * @returns {Promise<{ok: boolean, payUrl?: string, invoiceId?: string, error?: string}>}
 */
async function createInvoice({ amount, orderId, comment = '', hookUrl = '', successUrl = '' }) {
  if (!isConfigured()) {
    return { ok: false, error: 'Lava не настроен (LAVA_SECRET_KEY / LAVA_SHOP_ID)' };
  }

  const body = {
    sum:        amount,
    orderId,
    shopId:     LAVA_SHOP_ID(),
    comment,
    hookUrl,
    successUrl,
    failUrl:    successUrl,
    expireMin:  60, // invoice expires in 60 minutes
  };

  try {
    const res = await lavaRequest('/business/invoice/create', body);

    // Lava returns status_code 200 on success
    if (res.status_code === 200 && res.data) {
      return {
        ok:        true,
        payUrl:    res.data.url,
        invoiceId: res.data.id,
      };
    }

    const errMsg = res.error || (res.data && res.data.message) || `Код: ${res.status_code}`;
    return { ok: false, error: errMsg };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Verify Lava webhook signature
 * Lava sends SHA-256 HMAC of JSON body in the "Signature" header
 * @param {object} body       - Parsed request body
 * @param {string} signature  - Value from "Signature" header
 * @returns {boolean}
 */
function verifyWebhook(body, signature) {
  if (!LAVA_SECRET_KEY()) return false;
  if (!signature)         return false;

  try {
    const expected = sign(body);
    return crypto.timingSafeEqual(
      Buffer.from(expected,  'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}

/**
 * Get invoice status from Lava
 * @param {string} invoiceId - Lava invoice ID
 * @returns {Promise<{ok: boolean, status?: string, error?: string}>}
 */
async function getInvoiceStatus(invoiceId) {
  if (!isConfigured()) return { ok: false, error: 'Lava не настроен' };

  const body = { invoiceId, shopId: LAVA_SHOP_ID() };
  try {
    const res = await lavaRequest('/business/invoice/status', body);
    if (res.status_code === 200 && res.data) {
      return { ok: true, status: res.data.status };
    }
    return { ok: false, error: res.error || `Код: ${res.status_code}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { isConfigured, createInvoice, verifyWebhook, getInvoiceStatus, sign };
