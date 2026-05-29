# Requirements Map

## Tiered Subscription Billing

- Keeps safe subscription receipts deliverable with a provider-metadata allowlist.
- Removes project titles, collaborator handles, and private research descriptors from receipt metadata.
- Scans nested provider metadata values so allowlisted keys cannot hide private workspace context.
- Redacts customer-facing line-item identifiers and units when they carry restricted dataset context.
- Preserves customer-useful totals, billing period, plan, and invoice references after redaction.

## AI Compute Billing

- Detects private compute line items that expose restricted research project context.
- Replaces specific project descriptions with usage-category-safe customer copy.
- Holds unsafe receipts before external delivery when compute or storage lines contain restricted details.

## Licensing APIs And Analytics

- Treats analytics licensing as a billable service category without exposing private corpus details.
- Produces deterministic audit packets for finance and compliance review.
- Keeps receipt evidence synthetic and independent of live customer or payment systems.

## Safety And Scope

- Synthetic data only.
- No credentials, payment processor calls, customer systems, private workspaces, institutional finance tools, or external APIs.
- This slice is distinct from pricing, tax, disputes, payment rails, webhook entitlement, invoice acceptance, procurement, subscription renewal, usage reconciliation, storage overage, and analytics licensing gates.
