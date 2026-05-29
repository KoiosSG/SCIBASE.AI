# Acceptance Notes

This #20 slice focuses specifically on privacy-safe billing artifacts before invoices, receipts, and provider metadata leave SCIBASE.

It is not:

- a broad revenue infrastructure module
- a subscription entitlement or renewal guard
- a tax, procurement, or invoice-acceptance workflow
- a payment-rail failover or webhook entitlement verifier
- an analytics licensing export gate
- a revenue dispute, reconciliation, or credit-breakage ledger

Validation coverage:

- safe receipts are deliverable with only allowed provider metadata
- private research project context is removed from customer-facing receipt line items
- restricted dataset details are replaced with usage-category-safe wording
- receipt, invoice, and customer identifiers are redacted when they expose private context
- redacted receipt identifiers remain distinct for finance review correlation
- customer-facing line-item identifiers and units are redacted when they contain restricted dataset context
- unsafe provider metadata keys are removed before delivery
- allowlisted provider metadata keys are still scanned when values are structured or nested
- customer copies retain useful totals, currency, usage categories, quantities, and units
- audit digests are deterministic and private-context free
