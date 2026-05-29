# Billing Receipt Privacy Guard

This module adds a focused Revenue Infrastructure slice for SCIBASE issue #20. It validates customer-facing invoices, receipts, and payment-provider metadata before billing artifacts leave SCIBASE.

The guard detects private research project context, restricted dataset references, collaborator identifiers, grant-sensitive phrases, unsafe line-item fields, and unsafe provider metadata, including nested provider metadata values. Safe receipts remain deliverable, while unsafe receipts are held for finance review with redacted replacement line items and deterministic audit evidence.

## Run

```bash
npm test
npm run demo
npm run video
npm run check
```

## Outputs

- `reports/receipt-privacy-packet.json`
- `reports/receipt-privacy-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call payment processors, customer systems, private workspaces, institutional finance tools, or external APIs.
