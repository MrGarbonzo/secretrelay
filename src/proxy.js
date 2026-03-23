import axios from 'axios';
import crypto from 'crypto';

export async function forwardRequest(proxyReq) {
  const { url, method, headers = {}, body = null, timeout_ms = 10000 } = proxyReq;

  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ url, method, headers, body }))
    .digest('hex');

  try {
    const res = await axios({
      url,
      method: method.toUpperCase(),
      headers,
      data: body,
      timeout: timeout_ms,
      validateStatus: () => true, // don't throw on non-2xx
    });

    return {
      status: res.status,
      headers: res.headers,
      body: res.data,
      requestHash,
    };
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      const error = new Error('Upstream timeout');
      error.structured = { code: 'upstream_timeout', status: 504, message: 'Upstream request timed out' };
      throw error;
    }
    const error = new Error('Upstream error');
    error.structured = {
      code: 'upstream_error',
      status: err.response?.status || 502,
      message: err.message,
    };
    throw error;
  }
}
