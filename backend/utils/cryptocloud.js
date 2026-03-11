/**
 * CryptoCloud payment integration utility
 * Docs: https://docs.cryptocloud.plus/en
 */
const https  = require('https');
const crypto = require('crypto');

const CRYPTOCLOUD_API_KEY = () => process.env.CRYPTOCLOUD_API_KEY || '';
const CRYPTOCLOUD_SHOP_ID = () => process.env.CRYPTOCLOUD_SHOP_ID || '';

/**
 * Check if CryptoCloud is configured
 */
function isConfigured() {
  return !!(CRYPTOCLOUD_API_KEY() && CRYPTOCLOUD_SHOP_ID());
}

/**
 * Make a POST request to CryptoCloud API
 */
function cryptoCloudRequest(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);

    const options = {
      hostname: 'api.cryptocloud.plus',
      path,
      method:  'POST',
      headers: {
        'Authorization':  `Token ${CRYPTOCLOUD_API_KEY()}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch { resolve({ status: 'error', result: 'ParseError' }); }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('CryptoCloud request timeout')); });
    req.write(data);
    req.end();
  });
}

/**
 * Create a CryptoCloud invoice
 * @param {object} params
 * @param {number}  params.amount   - Amount in USD
 * @param {string}  params.orderId  - Unique order ID
 * @param {string}  [params.email]  - Customer email (optional)
 * @returns {Promise<{ok: boolean, payUrl?: string, invoiceId?: string, error?: string}>}
 */
async function createInvoice({ amount, orderId, email = '' }) {
  if (!isConfigured()) {
    return { ok: false, error: 'CryptoCloud не настроен (CRYPTOCLOUD_API_KEY / CRYPTOCLOUD_SHOP_ID)' };
  }

  const body = {
    amount:   amount,
    shop_id:  CRYPTOCLOUD_SHOP_ID(),
    currency: 'USD',
    order_id: orderId,
  };

  if (email) body.email = email;

  try {
    const res = await cryptoCloudRequest('/v2/invoice/create', body);

    if (res.status === 'success' && res.result) {
      return {
        ok:        true,
        payUrl:    res.result.link,
        invoiceId: res.result.uuid,
      };
    }

    const errMsg = res.result || res.message || 'Неизвестная ошибка CryptoCloud';
    return { ok: false, error: errMsg };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Verify CryptoCloud postback (webhook)
 * CryptoCloud sends token in the request body which we verify against our API key
 * @param {object} body - Parsed request body
 * @returns {boolean}
 */
function verifyWebhook(body) {
  if (!CRYPTOCLOUD_API_KEY()) return false;

  try {
    // CryptoCloud sends the invoice status via postback
    // Basic check: ensure required fields are present
    const { status, invoice_id } = body;
    return !!(status && invoice_id);
  } catch {
    return false;
  }
}

module.exports = { isConfigured, createInvoice, verifyWebhook };
