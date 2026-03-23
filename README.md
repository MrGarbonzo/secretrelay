# SecretRelay

SecretRelay is a pay-per-request private API proxy that runs inside a SecretVM Trusted Execution Environment (TEE). Agents submit an HTTP request payload and the enclave forwards it to the target, returning the response along with an optional attestation proving the request was handled inside a secure enclave. Payment is gated via the x402 protocol using USDC on Base.

## Privacy Guarantee

All client credentials, query content, target URLs, and response bodies are sealed inside the TEE enclave. The operator has no ability to log, inspect, or exfiltrate request or response content. When attestation is requested, the enclave returns a signed quote containing a SHA-256 hash of the request, proving the request was processed inside the enclave without modification or observation.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your PAYMENT_ADDRESS and desired NETWORK
npm start
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PAYMENT_ADDRESS` | Yes | USDC recipient wallet address on Base |
| `NETWORK` | No | `base` (mainnet) or `base-sepolia` (testnet, default) |
| `PORT` | No | Server port (default: 3000) |
| `HOST` | No | Bind address (default: 0.0.0.0) |
| `ATTESTATION_ENDPOINT` | No | SecretVM attestation URL (default: http://localhost:8080/attestation) |
| `ALLOWED_DOMAINS` | No | Comma-separated list of allowed outbound domains (empty = allow all) |

## Example Requests

### Basic proxy request (curl)

```bash
curl -X POST http://localhost:3000/proxy \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <x402-payment-header>" \
  -d '{
    "url": "https://httpbin.org/post",
    "method": "POST",
    "headers": { "Authorization": "Bearer secret-token" },
    "body": { "query": "sensitive data" }
  }'
```

### With attestation

```bash
curl -X POST "http://localhost:3000/proxy?attest=true" \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <x402-payment-header>" \
  -d '{
    "url": "https://api.example.com/data",
    "method": "GET"
  }'
```

Response includes an `attestation` field:

```json
{
  "status": 200,
  "headers": { "..." : "..." },
  "body": { "..." : "..." },
  "attestation": {
    "enclave_id": "abc123",
    "request_hash": "sha256hex...",
    "timestamp": 1711234567890,
    "sig": "enclave-signature..."
  }
}
```

### x402-aware agent call (pseudocode)

```js
import axios from 'axios';
import { withPayment } from '@x402/axios'; // or use AgentKit

const client = withPayment(axios.create(), walletClient); // handles 402 → pay → retry

const res = await client.post('https://secretrelay.example.com/proxy?attest=true', {
  url: 'https://api.openai.com/v1/chat/completions',
  method: 'POST',
  headers: { 'Authorization': 'Bearer sk-...' },
  body: { model: 'gpt-4', messages: [{ role: 'user', content: 'Hello' }] },
});

console.log(res.data.body);          // upstream response
console.log(res.data.attestation);   // enclave proof
```

## Pricing

| Component | Cost |
|---|---|
| Base price per request | $0.002 USDC |
| Body surcharge (per 10kb over 1kb) | +$0.001 USDC |
| Attestation add-on (`?attest=true`) | +$0.001 USDC |

Examples:
- Simple GET request: **$0.002**
- POST with 500-byte body: **$0.002**
- POST with 15kb body: **$0.004**
- GET with attestation: **$0.003**
- POST with 15kb body + attestation: **$0.005**

## SecretVM Agent Ecosystem

SecretRelay participates in the SecretVM agentic ecosystem via the [SecretVM Agent API](https://docs.scrt.network/secret-network-documentation/secretvm-confidential-virtual-machines/agentic-support/secretvm-rest-api-for-agents-x402). When configured with an agent private key, SecretRelay can authenticate with the SecretVM platform to report its own VM status and verify connectivity.

Set `SECRETVM_AGENT_PRIVATE_KEY` and `SECRETVM_VM_ID` in your `.env` to enable:

- `GET /health` includes `secretvmConnected: true/false`
- `GET /vm-status` returns this VM's status from the SecretVM dashboard

```bash
curl -s https://your-vm.vm.scrtlabs.com:3000/vm-status
```

## Deployment

SecretRelay must run inside a SecretVM (Intel SGX/TDX) for the privacy guarantee to hold. When running outside a TEE (e.g., local development), the attestation endpoint will be unreachable and a mock attestation object is returned instead. In this mode, SecretRelay functions as a standard proxy without enclave-backed privacy guarantees.
