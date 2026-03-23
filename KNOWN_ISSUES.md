# Known Issues

## IA004: Missing `registrations` array in ERC-8004 agent metadata

**Status:** Open — requires SecretVM platform fix, not a code change.

The [8004scan validator](https://www.8004scan.io/agents/base/35887) reports IA004:
the agent registration JSON is missing a `registrations` array that links back to
the on-chain identity.

The registration JSON is hosted by the SecretVM platform, not by this repo.
We cannot modify it from inside the VM.

**Fix:** The SecretVM dashboard (or scrtlabs team) needs to add the following
to the agent metadata JSON:

```json
"registrations": [
  {
    "agentId": 35887,
    "agentRegistry": "eip155:8453:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432"
  }
]
```
