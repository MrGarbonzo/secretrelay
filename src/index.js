import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { calculatePrice } from './pricing.js';
import { validateProxyRequest } from './validation.js';
import { forwardRequest } from './proxy.js';
import { getAttestation } from './attestation.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

// x402 payment setup
const network = process.env.NETWORK || 'base-sepolia';
const chainId = network === 'base' ? 'eip155:8453' : 'eip155:84532';

const facilitator = new HTTPFacilitatorClient({
  url: 'https://facilitator.x402.org',
});
const resourceServer = new x402ResourceServer(facilitator)
  .register(chainId, new ExactEvmScheme());

// Initialize facilitator sync in background — non-fatal if unreachable
let facilitatorReady = false;
resourceServer.initialize()
  .then(() => { facilitatorReady = true; console.log('[x402] facilitator synced'); })
  .catch((err) => { console.warn(`[x402] facilitator sync failed: ${err.message} — payment gating degraded`); });

const routes = {
  'POST /proxy': {
    accepts: {
      scheme: 'exact',
      price: '$0.002',
      network: chainId,
      payTo: process.env.PAYMENT_ADDRESS,
    },
    description: 'SealProxy private API forwarding',
  },
};

const x402 = paymentMiddleware(
  routes,
  resourceServer,
  undefined, // paywallConfig
  undefined, // paywall
  false,     // syncFacilitatorOnStart — we handle init above
);

// Wrap x402 middleware: catch errors when facilitator is unavailable
app.use('/proxy', (req, res, next) => {
  if (!facilitatorReady) {
    // Facilitator not synced — block all requests with 402
    return res.status(402).json({
      error: 'payment_required',
      detail: 'Payment gateway initializing — try again shortly',
    });
  }
  Promise.resolve(x402(req, res, next)).catch((err) => {
    console.warn(`[x402] middleware error: ${err.message}`);
    res.status(402).json({
      error: 'payment_required',
      detail: 'Payment verification failed',
    });
  });
});

app.post('/proxy', async (req, res) => {
  const reqId = crypto.randomUUID();
  const start = Date.now();

  // Validate
  const validation = validateProxyRequest(req.body);
  if (!validation.valid) {
    console.log(`[${reqId}] invalid_request detail="${validation.detail}"`);
    return res.status(400).json({ error: 'invalid_request', detail: validation.detail });
  }

  const price = calculatePrice(req);

  try {
    const result = await forwardRequest(req.body);
    const latency = Date.now() - start;
    console.log(`[${reqId}] price=${price} upstream_status=${result.status} latency=${latency}ms`);

    const response = {
      status: result.status,
      headers: result.headers,
      body: result.body,
    };

    if (req.query.attest === 'true') {
      response.attestation = await getAttestation(result.requestHash);
    }

    return res.json(response);
  } catch (err) {
    const latency = Date.now() - start;
    if (err.structured) {
      const { code, status } = err.structured;
      console.log(`[${reqId}] price=${price} error=${code} latency=${latency}ms`);
      const httpStatus = code === 'upstream_timeout' ? 504 : 502;
      return res.status(httpStatus).json({ error: code, status });
    }
    console.log(`[${reqId}] price=${price} error=enclave_error latency=${latency}ms`);
    return res.status(500).json({ error: 'enclave_error', detail: 'Internal proxy failure' });
  }
});

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, facilitatorReady }));

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`SealProxy listening on ${HOST}:${PORT}`);
});
