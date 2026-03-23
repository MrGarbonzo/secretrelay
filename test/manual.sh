#!/usr/bin/env bash
# Manual test script for SealProxy
# Start the server first: npm start

BASE="http://localhost:3000"

echo "=== Health check ==="
curl -s "$BASE/health" | jq .
echo

echo "=== Proxy request (no payment — expect 402) ==="
curl -s -w "\nHTTP %{http_code}\n" "$BASE/proxy" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpbin.org/post",
    "method": "POST",
    "headers": { "X-Test": "sealproxy" },
    "body": { "hello": "world" }
  }'
echo

echo "=== Proxy request with attestation (no payment — expect 402) ==="
curl -s -w "\nHTTP %{http_code}\n" "$BASE/proxy?attest=true" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpbin.org/post",
    "method": "POST",
    "headers": { "X-Test": "sealproxy" },
    "body": { "hello": "world" }
  }'
echo

echo "=== Invalid request (bad method — expect 400) ==="
curl -s -w "\nHTTP %{http_code}\n" "$BASE/proxy" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpbin.org/post",
    "method": "INVALID"
  }'
echo

echo "=== Invalid request (http not https — expect 400) ==="
curl -s -w "\nHTTP %{http_code}\n" "$BASE/proxy" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://httpbin.org/post",
    "method": "POST"
  }'
echo
