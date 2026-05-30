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

function testNonCriticalLowContrastRequiresRemediationBeforeRelease() {
  const packet = assessDashboardRelease({
    dashboardId: 'enterprise-admin-low-contrast-secondary',
    institutionId: 'institution-redacted',
    assessedAt: '2026-05-27T13:05:00Z',
    widgets: [
      {
        id: 'secondary-storage-trend',
        type: 'metric',
        title: 'Storage trend',
        foreground: '#94a3b8',
        background: '#f8fafc',
        critical: false,
        keyboardReachable: true,
        screenReaderLabel: 'Storage trend across departments',
        headingLevel: 2
      }
    ],
    alerts: [],
    exports: [],
    motion: {
      animatedCharts: [],
      reducedMotionFallback: true
    }
  });

  assert.equal(packet.status, 'remediate_before_public_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'internal_only');
  assert.equal(packet.releaseLanes.scheduledExport, 'blocked');
  assert.deepEqual(codes(packet), ['LOW_CONTRAST_NONCRITICAL_METRIC']);
  assert.equal(packet.wcagSignals.perceivable, false);
  assert.ok(packet.actions.includes('improve_contrast:secondary-storage-trend'));
}

function testPrivateDataInTableSummaryBlocksRelease() {
  const packet = assessDashboardRelease({
    dashboardId: 'enterprise-admin-private-summary',
    institutionId: 'institution-redacted',
    assessedAt: '2026-05-27T13:10:00Z',
    widgets: [
      {
        id: 'private-summary-table',
        type: 'table',
        title: 'Project review',
        foreground: '#111827',
        background: '#ffffff',
        critical: true,
        keyboardReachable: true,
        screenReaderLabel: 'Project review table',
        tableSummary: 'Rows include restricted project alpha and private lab owner alice@example.edu.',
        headingLevel: 2
      }
    ],
    alerts: [],
    exports: [],
    motion: {
      animatedCharts: [],
      reducedMotionFallback: true
    }
  });

  assert.equal(packet.status, 'hold_accessibility_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'blocked');
  assert.ok(codes(packet).includes('PRIVATE_DATA_IN_ACCESSIBILITY_TEXT'));
  assert.equal(packet.wcagSignals.understandable, false);
  assert.ok(packet.actions.includes('redact_accessibility_text:private-summary-table'));
}

function testInvalidContrastEvidenceBlocksRelease() {
  const packet = assessDashboardRelease({
    dashboardId: 'enterprise-admin-invalid-contrast-evidence',
    institutionId: 'institution-redacted',
    assessedAt: '2026-05-27T13:15:00Z',
    widgets: [
      {
        id: 'contract-risk-score',
        type: 'metric',
        title: 'Contract risk score',
        foreground: 'var(--metric-danger)',
        background: '#ffffff',
        critical: true,
        keyboardReachable: true,
        screenReaderLabel: 'Contract risk score across departments',
        headingLevel: 2
      }
    ],
    alerts: [],
    exports: [],
    motion: {
      animatedCharts: [],
      reducedMotionFallback: true
    }
  });

  assert.equal(packet.status, 'hold_accessibility_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'blocked');
  assert.deepEqual(codes(packet), ['INVALID_CONTRAST_EVIDENCE']);
  assert.equal(packet.wcagSignals.perceivable, false);
  assert.ok(packet.actions.includes('provide_valid_contrast_evidence:contract-risk-score'));
}

function testMissingCriticalContrastEvidenceBlocksRelease() {
  const packet = assessDashboardRelease({
    dashboardId: 'enterprise-admin-missing-contrast-evidence',
    institutionId: 'institution-redacted',
    assessedAt: '2026-05-27T13:17:00Z',
    widgets: [
      {
        id: 'contract-risk-without-colors',
        type: 'metric',
        title: 'Contract risk score',
        critical: true,
        keyboardReachable: true,
        screenReaderLabel: 'Contract risk score across departments',
        headingLevel: 2
      }
    ],
    alerts: [],
    exports: [],
    motion: {
      animatedCharts: [],
      reducedMotionFallback: true
    }
  });

  assert.equal(packet.status, 'hold_accessibility_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'blocked');
  assert.deepEqual(codes(packet), ['INVALID_CONTRAST_EVIDENCE']);
  assert.equal(packet.wcagSignals.perceivable, false);
  assert.ok(packet.actions.includes('provide_valid_contrast_evidence:contract-risk-without-colors'));
}

function testShorthandHexContrastEvidenceRemainsValid() {
  const packet = assessDashboardRelease({
    dashboardId: 'enterprise-admin-shorthand-contrast',
    institutionId: 'institution-redacted',
    assessedAt: '2026-05-27T13:20:00Z',
    widgets: [
      {
        id: 'repository-sync-status',
        type: 'metric',
        title: 'Repository sync status',
        foreground: '#000',
        background: '#fff',
        critical: true,
        keyboardReachable: true,
        screenReaderLabel: 'Repository sync status across departments',
        headingLevel: 2
      }
    ],
    alerts: [],
    exports: [],
    motion: {
      animatedCharts: [],
      reducedMotionFallback: true
    }
  });

  assert.equal(packet.status, 'release_with_accessibility_monitoring');
  assert.deepEqual(packet.findings, []);
  assert.equal(packet.wcagSignals.perceivable, true);
}

function testMissingVisibleFocusIndicatorBlocksKeyboardRelease() {
  const packet = assessDashboardRelease({
    dashboardId: 'enterprise-admin-hidden-focus',
    institutionId: 'institution-redacted',
    assessedAt: '2026-05-27T13:25:00Z',
    widgets: [
      {
        id: 'project-risk-filter',
        type: 'filter',
        title: 'Project risk filter',
        foreground: '#111827',
        background: '#ffffff',
        critical: true,
        keyboardReachable: true,
        focusVisible: false,
        screenReaderLabel: 'Filter projects by risk status',
        headingLevel: 2
      }
    ],
    alerts: [],
    exports: [],
    motion: {
      animatedCharts: [],
      reducedMotionFallback: true
    }
  });

  assert.equal(packet.status, 'hold_accessibility_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'blocked');
  assert.deepEqual(codes(packet), ['MISSING_VISIBLE_FOCUS_INDICATOR']);
  assert.equal(packet.wcagSignals.operable, false);
  assert.ok(packet.actions.includes('add_visible_focus_indicator:project-risk-filter'));
}

const tests = [
  testCriticalAccessibilityIssuesBlockDashboardRelease,
  testCleanDashboardReleasesWithWcagSignals,
  testWarningsAllowInternalOnlyPreview,
  testNonCriticalLowContrastRequiresRemediationBeforeRelease,
  testPrivateDataInTableSummaryBlocksRelease,
  testInvalidContrastEvidenceBlocksRelease,
  testMissingCriticalContrastEvidenceBlocksRelease,
  testShorthandHexContrastEvidenceRemainsValid,
  testMissingVisibleFocusIndicatorBlocksKeyboardRelease
];

for (const test of tests) {
  test();
}

console.log(`enterprise-dashboard-accessibility-guard tests passed (${tests.length})`);
