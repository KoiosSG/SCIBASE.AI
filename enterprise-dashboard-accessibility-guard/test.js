const assert = require('assert');

const { assessDashboardRelease } = require('./index');
const { blockedDashboard, cleanDashboard, warningDashboard } = require('./sample-data');

function codes(packet) {
  return packet.findings.map((finding) => finding.code).sort();
}

function testCriticalAccessibilityIssuesBlockDashboardRelease() {
  const packet = assessDashboardRelease(blockedDashboard);
  const findingCodes = codes(packet);

  assert.equal(packet.status, 'hold_accessibility_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'blocked');
  assert.equal(packet.releaseLanes.scheduledExport, 'blocked');
  assert.equal(packet.releaseLanes.webhookNotice, 'blocked');
  assert.ok(findingCodes.includes('LOW_CONTRAST_CRITICAL_METRIC'));
  assert.ok(findingCodes.includes('MISSING_SCREEN_READER_LABEL'));
  assert.ok(findingCodes.includes('KEYBOARD_TRAP'));
  assert.ok(findingCodes.includes('PRIVATE_DATA_IN_ACCESSIBILITY_TEXT'));
  assert.ok(findingCodes.includes('MISSING_TABLE_SUMMARY'));
  assert.ok(packet.actions.includes('block_release:enterprise-admin-overview'));
  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);
}

function testCleanDashboardReleasesWithWcagSignals() {
  const packet = assessDashboardRelease(cleanDashboard);

  assert.equal(packet.status, 'release_with_accessibility_monitoring');
  assert.equal(packet.releaseLanes.adminDashboard, 'allowed');
  assert.equal(packet.releaseLanes.scheduledExport, 'allowed');
  assert.equal(packet.releaseLanes.webhookNotice, 'allowed');
  assert.deepEqual(packet.findings, []);
  assert.equal(packet.wcagSignals.perceivable, true);
  assert.equal(packet.wcagSignals.operable, true);
  assert.equal(packet.wcagSignals.understandable, true);
  assert.equal(packet.wcagSignals.robust, true);
}

function testWarningsAllowInternalOnlyPreview() {
  const packet = assessDashboardRelease(warningDashboard);

  assert.equal(packet.status, 'remediate_before_public_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'internal_only');
  assert.equal(packet.releaseLanes.scheduledExport, 'blocked');
  assert.equal(packet.releaseLanes.webhookNotice, 'internal_only');
  assert.deepEqual(codes(packet), ['MISSING_REDUCED_MOTION_FALLBACK']);
  assert.ok(packet.actions.includes('add_reduced_motion_fallback:research-output-trend'));
}

const tests = [
  testCriticalAccessibilityIssuesBlockDashboardRelease,
  testCleanDashboardReleasesWithWcagSignals,
  testWarningsAllowInternalOnlyPreview
];

for (const test of tests) {
  test();
}

console.log(`enterprise-dashboard-accessibility-guard tests passed (${tests.length})`);
