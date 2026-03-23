const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']);

export function validateProxyRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, detail: 'Request body must be a JSON object' };
  }

  if (typeof body.url !== 'string' || !body.url.startsWith('https://')) {
    return { valid: false, detail: 'url must be a string starting with https://' };
  }

  if (!body.method || !VALID_METHODS.has(body.method.toUpperCase())) {
    return { valid: false, detail: `method must be one of: ${[...VALID_METHODS].join(', ')}` };
  }

  if (body.headers !== undefined && (typeof body.headers !== 'object' || Array.isArray(body.headers))) {
    return { valid: false, detail: 'headers must be a plain object' };
  }

  if (body.timeout_ms !== undefined) {
    if (!Number.isInteger(body.timeout_ms) || body.timeout_ms < 100 || body.timeout_ms > 30000) {
      return { valid: false, detail: 'timeout_ms must be an integer between 100 and 30000' };
    }
  }

  // Domain allowlist check
  const allowedDomains = process.env.ALLOWED_DOMAINS;
  if (allowedDomains) {
    const allowed = allowedDomains.split(',').map(d => d.trim()).filter(Boolean);
    if (allowed.length > 0) {
      let hostname;
      try {
        hostname = new URL(body.url).hostname;
      } catch {
        return { valid: false, detail: 'url is not a valid URL' };
      }
      if (!allowed.includes(hostname)) {
        return { valid: false, detail: `domain ${hostname} is not in the allowed list` };
      }
    }
  }

  return { valid: true };
}
