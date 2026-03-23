import crypto from 'crypto';
import { ethers } from 'ethers';
import axios from 'axios';

const SECRETVM_API = 'https://secretai.scrtlabs.com';

/**
 * Build SecretVM agent authentication headers.
 * Signature = signMessage(sha256("{method}{path}{body}{timestamp}"))
 */
export function buildHeaders(privateKey, method, path, body = '') {
  const timestamp = String(Date.now());
  const payload = `${method}${path}${body}${timestamp}`;
  const requestHash = crypto.createHash('sha256').update(payload).digest('hex');

  const wallet = new ethers.Wallet(privateKey);
  // encode_defunct(hexstr=hash) signs raw bytes, not the UTF-8 hex string
  const signature = wallet.signMessageSync(ethers.getBytes('0x' + requestHash));

  return {
    'x-agent-address': wallet.address,
    'x-agent-signature': signature,
    'x-agent-timestamp': timestamp,
  };
}

/**
 * Get VM status from SecretVM agent API.
 */
export async function getVmStatus(privateKey, vmId) {
  const method = 'GET';
  const path = `/api/agent/vm/${vmId}`;
  const headers = buildHeaders(privateKey, method, path);

  const res = await axios.get(`${SECRETVM_API}${path}`, {
    headers,
    timeout: 10000,
  });
  return res.data;
}

/**
 * Check if the SecretVM agent API is reachable.
 */
export async function checkSecretVmConnection(privateKey) {
  if (!privateKey) return false;
  try {
    const method = 'GET';
    const path = '/api/agent/balance';
    const headers = buildHeaders(privateKey, method, path);
    await axios.get(`${SECRETVM_API}${path}`, { headers, timeout: 5000 });
    return true;
  } catch (err) {
    // 404 "Agent not found" means the API is reachable, auth works, agent just isn't registered
    if (err.response?.status === 404) return true;
    return false;
  }
}
