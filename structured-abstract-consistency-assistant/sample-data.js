const blockedManuscript = {
  manuscriptId: 'ms-abstract-risk',
  assessedAt: '2026-05-28T10:10:00Z',
  abstract: {
    background: 'Remote review tools may improve manuscript quality.',
    methods: 'We evaluated 120 participants in a randomized study.',
    results: 'The primary endpoint improved strongly after the assistant was used.',
    conclusions: 'The assistant definitively improves all review outcomes and is ready for clinical deployment.'
  },
  methods: {
    design: 'exploratory observational pilot',
    sampleSize: 84,
    primaryEndpoint: 'review turnaround time',
    confidenceIntervalCrossesNull: true
  },
  results: {
    primaryEndpoint: 'review turnaround time',
    direction: 'no_clear_effect',
    sampleSize: 84,
    effect: 'median review time changed by 1.1 hours',
    exploratory: true
  },
  limitations: []
};

const revisionManuscript = {
  manuscriptId: 'ms-abstract-incomplete',
  assessedAt: '2026-05-28T10:15:00Z',
  abstract: {
    background: 'A short background is present.',
    methods: 'We evaluated 64 projects in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved in 64 projects.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 64,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 64,
    exploratory: false
  },
  limitations: ['single-institution pilot']
};

const resultCertaintyOverclaimManuscript = {
  manuscriptId: 'ms-abstract-result-certainty-overclaim',
  assessedAt: '2026-05-30T02:55:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, showed a statistically significant and clinically meaningful improvement in 96 manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings but requires validation.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: true
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['confidence interval crosses null']
};

const mixedCertaintyOverclaimManuscript = {
  manuscriptId: 'ms-abstract-mixed-certainty-overclaim',
  assessedAt: '2026-05-30T07:40:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, was not statistically significant but clinically meaningful in 96 manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings but requires validation.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: true
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['confidence interval crosses null']
};

const conclusionCertaintyOverclaimManuscript = {
  manuscriptId: 'ms-abstract-conclusion-certainty-overclaim',
  assessedAt: '2026-05-30T03:35:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
    conclusions: 'The assistant provides a statistically significant and clinically meaningful improvement but requires validation.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: true
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['confidence interval crosses null']
};

const weakLimitationHedgeManuscript = {
  manuscriptId: 'ms-abstract-weak-limitation-hedge',
  assessedAt: '2026-05-30T09:05:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: true
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: true
  },
  limitations: ['confidence interval crosses null']
};

const percentageSampleSizeManuscript = {
  manuscriptId: 'ms-abstract-percentage-sample-size',
  assessedAt: '2026-05-30T08:12:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated manuscripts in a retrospective cohort; 96% used automated screening.',
    results: 'The primary endpoint, comment triage time, improved in 96% of manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const decimalSampleSizeManuscript = {
  manuscriptId: 'ms-abstract-decimal-sample-size',
  assessedAt: '2026-05-30T10:10:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated manuscripts in a retrospective cohort; the baseline ratio was 0.96.',
    results: 'The primary endpoint, comment triage time, had an effect estimate of 0.96.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const cleanManuscript = {
  manuscriptId: 'ms-abstract-clean',
  assessedAt: '2026-05-28T10:20:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

module.exports = {
  blockedManuscript,
  revisionManuscript,
  resultCertaintyOverclaimManuscript,
  mixedCertaintyOverclaimManuscript,
  conclusionCertaintyOverclaimManuscript,
  weakLimitationHedgeManuscript,
  percentageSampleSizeManuscript,
  decimalSampleSizeManuscript,
  cleanManuscript
};
