const crypto = require('crypto');

function assessDashboardRelease(dashboard) {
  const findings = [
    ...assessVisualAndOperableComponents(dashboard),
    ...assessMotion(dashboard)
  ];
  const blockerCount = findings.filter((finding) => finding.severity === 'blocker').length;
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;

  const packet = {
    dashboardId: dashboard.dashboardId,
    institutionId: dashboard.institutionId,
    status: chooseStatus(blockerCount, warningCount),
    releaseLanes: chooseReleaseLanes(blockerCount, warningCount),
    findings,
    actions: buildActions(dashboard, findings),
    wcagSignals: buildWcagSignals(findings),
    assessedAt: dashboard.assessedAt
  };

  packet.auditDigest = digestPacket(packet);
  return packet;
}

function assessVisualAndOperableComponents(dashboard) {
  const components = [
    ...(dashboard.widgets || []),
    ...(dashboard.alerts || []),
    ...(dashboard.exports || [])
  ];
  const findings = [];

  for (const component of components) {
    if (component.foreground && component.background) {
      const contrast = contrastRatio(component.foreground, component.background);
      if (component.critical && contrast < 4.5) {
        findings.push(finding(
          component,
          'LOW_CONTRAST_CRITICAL_METRIC',
          'blocker',
          `Critical component contrast is ${contrast.toFixed(2)}:1, below the 4.5:1 release threshold.`
        ));
      } else if (contrast < 4.5) {
        findings.push(finding(
          component,
          'LOW_CONTRAST_NONCRITICAL_METRIC',
          'warning',
          `Noncritical component contrast is ${contrast.toFixed(2)}:1, below the 4.5:1 readiness threshold.`
        ));
      }
    }

    if (!component.screenReaderLabel || !component.screenReaderLabel.trim()) {
      findings.push(finding(component, 'MISSING_SCREEN_READER_LABEL', 'blocker', 'Component lacks a meaningful screen-reader label.'));
    }

    if (component.keyboardReachable === false || component.focusTrap) {
      findings.push(finding(component, 'KEYBOARD_TRAP', 'blocker', 'Keyboard users cannot reach or leave this component predictably.'));
    }

    if (component.ariaTextContainsPrivateData || containsPrivateData(accessibilityText(component))) {
      findings.push(finding(component, 'PRIVATE_DATA_IN_ACCESSIBILITY_TEXT', 'blocker', 'Accessibility text exposes private user, lab, or project data.'));
    }

    if ((component.type === 'table' || component.format) && !component.tableSummary) {
      findings.push(finding(component, 'MISSING_TABLE_SUMMARY', 'blocker', 'Table or export output needs a concise nonvisual summary.'));
    }
  }

  findings.push(...assessHeadingOrder(components));
  return findings;
}

function assessHeadingOrder(components) {
  const findings = [];
  let previousLevel = null;

  for (const component of components.filter((item) => item.headingLevel)) {
    if (previousLevel !== null && component.headingLevel > previousLevel + 1) {
      findings.push(finding(component, 'HEADING_ORDER_SKIP', 'warning', 'Heading order skips a level and may confuse screen-reader navigation.'));
    }
    previousLevel = component.headingLevel;
  }

  return findings;
}

function assessMotion(dashboard) {
  if (dashboard.motion?.animatedCharts?.length && !dashboard.motion.reducedMotionFallback) {
    return dashboard.motion.animatedCharts.map((componentId) => ({
      componentId,
      code: 'MISSING_REDUCED_MOTION_FALLBACK',
      severity: 'warning',
      message: 'Animated dashboard content needs a reduced-motion fallback before public release.'
    }));
  }
  return [];
}

function finding(component, code, severity, message) {
  return {
    componentId: component.id,
    code,
    severity,
    message
  };
}

function chooseStatus(blockerCount, warningCount) {
  if (blockerCount > 0) return 'hold_accessibility_release';
  if (warningCount > 0) return 'remediate_before_public_release';
  return 'release_with_accessibility_monitoring';
}

function chooseReleaseLanes(blockerCount, warningCount) {
  if (blockerCount > 0) {
    return {
      adminDashboard: 'blocked',
      scheduledExport: 'blocked',
      webhookNotice: 'blocked'
    };
  }
  if (warningCount > 0) {
    return {
      adminDashboard: 'internal_only',
      scheduledExport: 'blocked',
      webhookNotice: 'internal_only'
    };
  }
  return {
    adminDashboard: 'allowed',
    scheduledExport: 'allowed',
    webhookNotice: 'allowed'
  };
}

function buildActions(dashboard, findings) {
  if (!findings.length) return ['release_with_accessibility_monitoring'];

  const actions = new Set();
  const hasBlocker = findings.some((item) => item.severity === 'blocker');
  if (hasBlocker) actions.add(`block_release:${dashboard.dashboardId}`);

  for (const item of findings) {
    if (item.code === 'MISSING_REDUCED_MOTION_FALLBACK') {
      actions.add(`add_reduced_motion_fallback:${item.componentId}`);
    }
    if (item.code === 'MISSING_TABLE_SUMMARY') {
      actions.add(`add_table_summary:${item.componentId}`);
    }
    if (item.code === 'MISSING_SCREEN_READER_LABEL') {
      actions.add(`add_screen_reader_label:${item.componentId}`);
    }
    if (
      item.code === 'LOW_CONTRAST_CRITICAL_METRIC' ||
      item.code === 'LOW_CONTRAST_NONCRITICAL_METRIC'
    ) {
      actions.add(`improve_contrast:${item.componentId}`);
    }
    if (item.code === 'PRIVATE_DATA_IN_ACCESSIBILITY_TEXT') {
      actions.add(`redact_accessibility_text:${item.componentId}`);
    }
  }

  return [...actions].sort();
}

function buildWcagSignals(findings) {
  const codes = new Set(findings.map((finding) => finding.code));
  return {
    perceivable:
      !codes.has('LOW_CONTRAST_CRITICAL_METRIC') &&
      !codes.has('LOW_CONTRAST_NONCRITICAL_METRIC') &&
      !codes.has('MISSING_TABLE_SUMMARY'),
    operable: !codes.has('KEYBOARD_TRAP') && !codes.has('MISSING_REDUCED_MOTION_FALLBACK'),
    understandable: !codes.has('PRIVATE_DATA_IN_ACCESSIBILITY_TEXT') && !codes.has('HEADING_ORDER_SKIP'),
    robust: !codes.has('MISSING_SCREEN_READER_LABEL')
  };
}

function contrastRatio(foreground, background) {
  const fg = relativeLuminance(hexToRgb(foreground));
  const bg = relativeLuminance(hexToRgb(background));
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function relativeLuminance({ r, g, b }) {
  const channels = [r, g, b].map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function containsPrivateData(value = '') {
  return /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|private lab|restricted project/i.test(value);
}

function accessibilityText(component) {
  return [component.screenReaderLabel, component.tableSummary].filter(Boolean).join(' ');
}

function digestPacket(packet) {
  return crypto.createHash('sha256').update(stableStringify(packet)).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  assessDashboardRelease
};
