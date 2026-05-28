const assert = require('assert');
const {
  evaluateReceiptPrivacy,
  buildSampleBatch
} = require('./index');

function byId(items, id) {
  return items.find((item) => item.id === id);
}

function testSafeReceiptIsDeliverableWithOnlyAllowedMetadata() {
  const result = evaluateReceiptPrivacy(buildSampleBatch());
  const receipt = byId(result.receipts, 'receipt-safe-lab-plan');

  assert.equal(receipt.decision, 'deliver-receipt');
  assert.equal(receipt.findings.length, 0);
  assert.deepEqual(receipt.providerMetadata, {
    accountRef: 'acct-lab-001',
    billingPeriod: '2026-05',
    invoiceRef: 'inv-safe-lab-plan',
    plan: 'lab-pro'
  });
}

function testPrivateResearchContextIsRedactedBeforeReceiptDelivery() {
  const result = evaluateReceiptPrivacy(buildSampleBatch());
  const receipt = byId(result.receipts, 'receipt-private-compute');

  assert.equal(receipt.decision, 'hold-for-finance-review');
  assert.equal(receipt.findings.includes('private-research-context'), true);
  assert.equal(receipt.findings.includes('restricted-dataset-reference'), true);
  assert.equal(receipt.redactedLineItems[0].description, 'AI compute usage for restricted research workspace');
  assert.equal(receipt.redactedLineItems[1].description, 'Restricted dataset storage and processing');
}

function testProviderMetadataAllowlistBlocksOverSpecificFields() {
  const result = evaluateReceiptPrivacy(buildSampleBatch());
  const receipt = byId(result.receipts, 'receipt-private-compute');

  assert.equal(receipt.findings.includes('unsafe-provider-metadata'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(receipt.providerMetadata, 'projectTitle'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(receipt.providerMetadata, 'collaboratorHandle'), false);

  const action = byId(result.remediationActions, 'remediate-receipt-private-compute');
  assert.equal(action.action, 'replace-private-billing-fields-before-delivery');
  assert.equal(action.priority, 'high');
}

function testNestedAllowedMetadataStillScansPrivateContext() {
  const batch = buildSampleBatch();
  batch.receipts = [
    {
      id: 'receipt-nested-metadata',
      invoiceId: 'inv-nested-metadata',
      customerId: 'customer-lab-003',
      currency: 'USD',
      totalCents: 45000,
      providerMetadata: {
        accountRef: {
          workspace: 'IRB Alzheimer single-cell workspace',
          billingId: 'acct-lab-003'
        },
        billingPeriod: '2026-05',
        invoiceRef: 'inv-nested-metadata',
        plan: 'lab-pro'
      },
      lineItems: [
        {
          id: 'line-safe-subscription',
          description: 'Lab Pro monthly subscription',
          usageCategory: 'subscription',
          quantity: 1,
          unit: 'month',
          amountCents: 45000
        }
      ]
    }
  ];

  const result = evaluateReceiptPrivacy(batch);
  const receipt = byId(result.receipts, 'receipt-nested-metadata');

  assert.equal(receipt.decision, 'hold-for-finance-review');
  assert.equal(receipt.findings.includes('private-research-context'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(receipt.providerMetadata, 'accountRef'), false);
}

function testCustomerCopyRemainsUsefulAfterRedaction() {
  const result = evaluateReceiptPrivacy(buildSampleBatch());
  const receipt = byId(result.receipts, 'receipt-private-compute');

  assert.equal(receipt.customerCopy.totalCents, 122500);
  assert.equal(receipt.customerCopy.currency, 'USD');
  assert.equal(receipt.customerCopy.lineItems.length, 2);
  assert.equal(receipt.customerCopy.lineItems[0].usageCategory, 'ai-compute');
  assert.equal(receipt.customerCopy.lineItems[1].usageCategory, 'storage');
}

function testAuditDigestIsDeterministicAndPrivateFree() {
  const first = evaluateReceiptPrivacy(buildSampleBatch());
  const second = evaluateReceiptPrivacy(buildSampleBatch());

  assert.equal(first.auditDigest, second.auditDigest);
  assert.ok(first.auditDigest.startsWith('sha256:'));
  assert.equal(first.summary.deliverableReceipts, 1);
  assert.equal(first.summary.heldReceipts, 1);
  assert.equal(JSON.stringify(first).includes('Alzheimer'), false);
  assert.equal(JSON.stringify(first).includes('GSE-private'), false);
}

const tests = [
  testSafeReceiptIsDeliverableWithOnlyAllowedMetadata,
  testPrivateResearchContextIsRedactedBeforeReceiptDelivery,
  testProviderMetadataAllowlistBlocksOverSpecificFields,
  testNestedAllowedMetadataStillScansPrivateContext,
  testCustomerCopyRemainsUsefulAfterRedaction,
  testAuditDigestIsDeterministicAndPrivateFree
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} billing receipt privacy guard tests passed`);
