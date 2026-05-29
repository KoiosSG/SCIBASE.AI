const crypto = require('crypto');

const SAFE_METADATA_KEYS = new Set(['accountRef', 'billingPeriod', 'invoiceRef', 'plan']);

const PRIVATE_PATTERNS = [
  {
    id: 'private-research-context',
    pattern: /(alzheimer|single-cell|patient cohort|clinical trial|embargoed|irb)/i
  },
  {
    id: 'restricted-dataset-reference',
    pattern: /(gse-private|dbgap|controlled-access|restricted dataset|participant)/i
  },
  {
    id: 'collaborator-identifier',
    pattern: /(@|orcid|collaborator|researcher handle)/i
  },
  {
    id: 'grant-sensitive-context',
    pattern: /(grant confidential|sponsor confidential|unannounced award)/i
  }
];

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function findingsForText(text) {
  return PRIVATE_PATTERNS.filter((item) => item.pattern.test(text)).map((item) => item.id);
}

function privacyText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return metadataValueText(value);
}

function hasPrivateContext(value) {
  return findingsForText(privacyText(value)).length > 0;
}

function lineItemPrivacyFindings(lineItem) {
  return findingsForText(
    stableStringify({
      id: lineItem.id,
      description: lineItem.description,
      projectRef: lineItem.projectRef,
      quantity: lineItem.quantity,
      usageCategory: lineItem.usageCategory,
      unit: lineItem.unit,
      amountCents: lineItem.amountCents
    })
  );
}

function categoryDescription(lineItem) {
  if (lineItem.usageCategory === 'ai-compute') {
    return 'AI compute usage for restricted research workspace';
  }

  if (lineItem.usageCategory === 'storage') {
    return 'Restricted dataset storage and processing';
  }

  if (lineItem.usageCategory === 'analytics-license') {
    return 'Analytics licensing service';
  }

  return 'Research platform service';
}

function sanitizeLineItem(lineItem, index) {
  const findings = lineItemPrivacyFindings(lineItem);
  const description = findings.length > 0 ? categoryDescription(lineItem) : lineItem.description;
  const id = hasPrivateContext(lineItem.id) ? `line-redacted-${index + 1}` : lineItem.id;
  const usageCategory = hasPrivateContext(lineItem.usageCategory)
    ? 'research-platform-service'
    : lineItem.usageCategory;
  const unit = hasPrivateContext(lineItem.unit) ? 'usage-unit' : lineItem.unit;

  return {
    id,
    usageCategory,
    quantity: sanitizeCustomerNumber(lineItem.quantity),
    unit,
    amountCents: sanitizeCustomerNumber(lineItem.amountCents),
    description,
    findings
  };
}

function receiptIdentifierFindings(receipt) {
  return findingsForText(stableStringify({
    id: receipt.id,
    invoiceId: receipt.invoiceId,
    customerId: receipt.customerId
  }));
}

function receiptEnvelopeFindings(receipt) {
  return findingsForText(stableStringify({
    currency: receipt.currency,
    totalCents: receipt.totalCents
  }));
}

function sanitizeIdentifier(value, fallback) {
  return hasPrivateContext(value) ? fallback : value;
}

function sanitizeCurrency(value) {
  return hasPrivateContext(value) ? 'XXX' : value;
}

function sanitizeCustomerNumber(value) {
  return hasPrivateContext(value) ? null : value;
}

function sanitizeMetadata(metadata = {}) {
  const safe = {};
  const removedKeys = [];
  const findings = [];

  for (const [key, value] of Object.entries(metadata)) {
    if (!SAFE_METADATA_KEYS.has(key)) {
      removedKeys.push(key);
      findings.push('unsafe-provider-metadata');
      continue;
    }

    const textFindings = findingsForText(metadataValueText(value));
    if (textFindings.length > 0) {
      removedKeys.push(key);
      findings.push(...textFindings);
      continue;
    }

    safe[key] = value;
  }

  return {
    safe,
    removedKeys: Array.from(new Set(removedKeys)).sort(),
    findings: Array.from(new Set(findings)).sort()
  };
}

function metadataValueText(value) {
  if (value && typeof value === 'object') {
    return stableStringify(value);
  }

  return String(value);
}

function evaluateReceipt(receipt, index) {
  const redactedLineItems = receipt.lineItems.map((lineItem, index) => sanitizeLineItem(lineItem, index));
  const lineFindings = redactedLineItems.flatMap((lineItem) => lineItem.findings);
  const identifierFindings = receiptIdentifierFindings(receipt);
  const envelopeFindings = receiptEnvelopeFindings(receipt);
  const metadata = sanitizeMetadata(receipt.providerMetadata);
  const findings = Array.from(new Set([...lineFindings, ...identifierFindings, ...envelopeFindings, ...metadata.findings])).sort();
  const decision = findings.length > 0 ? 'hold-for-finance-review' : 'deliver-receipt';
  const safeReceiptId = sanitizeIdentifier(receipt.id, `receipt-redacted-${index + 1}`);
  const safeInvoiceId = sanitizeIdentifier(receipt.invoiceId, `invoice-redacted-${index + 1}`);
  const safeCustomerId = sanitizeIdentifier(receipt.customerId, `customer-redacted-${index + 1}`);
  const safeCurrency = sanitizeCurrency(receipt.currency);
  const safeTotalCents = sanitizeCustomerNumber(receipt.totalCents);

  const customerCopy = {
    receiptId: safeReceiptId,
    customerId: safeCustomerId,
    currency: safeCurrency,
    totalCents: safeTotalCents,
    lineItems: redactedLineItems.map((lineItem) => ({
      id: lineItem.id,
      description: lineItem.description,
      usageCategory: lineItem.usageCategory,
      quantity: lineItem.quantity,
      unit: lineItem.unit,
      amountCents: lineItem.amountCents
    }))
  };

  return {
    id: safeReceiptId,
    invoiceId: safeInvoiceId,
    customerId: safeCustomerId,
    decision,
    findings,
    removedMetadataKeys: metadata.removedKeys,
    providerMetadata: metadata.safe,
    redactedLineItems: redactedLineItems.map((lineItem) => ({
      id: lineItem.id,
      description: lineItem.description,
      usageCategory: lineItem.usageCategory,
      findings: lineItem.findings
    })),
    customerCopy,
    auditDigest: digest({
      id: receipt.id,
      invoiceId: receipt.invoiceId,
      decision,
      findings,
      providerMetadata: metadata.safe,
      customerCopy
    })
  };
}

function remediationAction(receipt) {
  if (receipt.findings.includes('unsafe-provider-metadata')) {
    return 'replace-private-billing-fields-before-delivery';
  }

  if (receipt.findings.includes('restricted-dataset-reference')) {
    return 'replace-restricted-dataset-detail-with-usage-category';
  }

  return 'redact-private-research-context';
}

function evaluateReceiptPrivacy(batch) {
  const receipts = batch.receipts.map((receipt, index) => evaluateReceipt(receipt, index));
  const remediationActions = receipts
    .filter((receipt) => receipt.decision === 'hold-for-finance-review')
    .map((receipt) => ({
      id: `remediate-${receipt.id}`,
      receiptId: receipt.id,
      action: remediationAction(receipt),
      priority:
        receipt.findings.includes('restricted-dataset-reference') ||
        receipt.findings.includes('private-research-context') ||
        receipt.findings.includes('unsafe-provider-metadata')
          ? 'high'
          : 'normal',
      findings: receipt.findings
    }));

  const summary = {
    deliverableReceipts: receipts.filter((receipt) => receipt.decision === 'deliver-receipt').length,
    heldReceipts: receipts.filter((receipt) => receipt.decision === 'hold-for-finance-review').length,
    remediationActions: remediationActions.length,
    totalCentsReviewed: receipts.reduce((total, receipt) => {
      const amount = receipt.customerCopy.totalCents;
      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0)
  };

  return {
    batchId: batch.batchId,
    generatedAt: batch.generatedAt,
    receipts,
    remediationActions,
    summary,
    auditDigest: digest({
      batchId: batch.batchId,
      generatedAt: batch.generatedAt,
      receipts,
      remediationActions,
      summary
    })
  };
}

function buildSampleBatch() {
  return {
    batchId: 'billing-privacy-review-20',
    generatedAt: '2026-05-28T09:00:00Z',
    receipts: [
      {
        id: 'receipt-safe-lab-plan',
        invoiceId: 'inv-safe-lab-plan',
        customerId: 'customer-lab-001',
        currency: 'USD',
        totalCents: 29900,
        providerMetadata: {
          accountRef: 'acct-lab-001',
          billingPeriod: '2026-05',
          invoiceRef: 'inv-safe-lab-plan',
          plan: 'lab-pro'
        },
        lineItems: [
          {
            id: 'line-lab-plan',
            description: 'Lab Pro monthly subscription',
            usageCategory: 'subscription',
            quantity: 1,
            unit: 'month',
            amountCents: 29900
          }
        ]
      },
      {
        id: 'receipt-private-compute',
        invoiceId: 'inv-private-compute',
        customerId: 'customer-lab-002',
        currency: 'USD',
        totalCents: 122500,
        providerMetadata: {
          accountRef: 'acct-lab-002',
          billingPeriod: '2026-05',
          invoiceRef: 'inv-private-compute',
          plan: 'institution-compute',
          projectTitle: 'Alzheimer single-cell pilot',
          collaboratorHandle: '@lab-private-reviewer'
        },
        lineItems: [
          {
            id: 'line-private-compute',
            description: 'GPU inference for Alzheimer single-cell pilot',
            usageCategory: 'ai-compute',
            quantity: 250,
            unit: 'compute-hour',
            amountCents: 87500,
            projectRef: 'irb-workspace-44'
          },
          {
            id: 'line-private-dataset',
            description: 'Storage for GSE-private controlled-access dataset',
            usageCategory: 'storage',
            quantity: 700,
            unit: 'gb-month',
            amountCents: 35000,
            projectRef: 'restricted dataset locker'
          }
        ]
      }
    ]
  };
}

module.exports = {
  evaluateReceiptPrivacy,
  buildSampleBatch,
  digest
};
