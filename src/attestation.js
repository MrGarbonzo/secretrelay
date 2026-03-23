import axios from 'axios';

export async function getAttestation(requestHash) {
  const endpoint = process.env.ATTESTATION_ENDPOINT || 'http://localhost:8080/attestation';

  try {
    const res = await axios.post(endpoint, { data: requestHash }, { timeout: 5000 });
    return res.data;
  } catch (err) {
    console.warn(`[attestation] endpoint unreachable (${err.code || err.message}), returning mock`);
    return {
      enclave_id: 'dev-mock',
      request_hash: requestHash,
      timestamp: Date.now(),
      sig: 'dev',
    };
  }
}
