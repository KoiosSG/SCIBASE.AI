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
  cleanManuscript
};
