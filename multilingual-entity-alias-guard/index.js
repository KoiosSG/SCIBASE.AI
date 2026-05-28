const crypto = require('crypto');

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

function normalizeTerm(term) {
  return term.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function buildAliasIndex(entities) {
  const index = new Map();

  for (const entity of entities) {
    for (const [language, terms] of Object.entries(entity.localizedNames)) {
      for (const term of terms) {
        const key = `${language}:${normalizeTerm(term)}`;
        const existing = index.get(key);

        if (!existing) {
          index.set(key, {
            kind: 'alias',
            entity,
            language,
            term
          });
          continue;
        }

        const entitiesForAlias =
          existing.kind === 'collision' ? existing.entities.slice() : [existing.entity];

        if (entitiesForAlias.some((candidate) => candidate.id === entity.id)) {
          continue;
        }

        entitiesForAlias.push(entity);
        index.set(key, {
          kind: 'collision',
          entities: entitiesForAlias,
          entityIds: entitiesForAlias.map((candidate) => candidate.id).sort(),
          language,
          term
        });
      }
    }
  }

  return index;
}

function mentionDecision(mention, aliasIndex, homographs) {
  const aliasEntry = aliasIndex.get(`${mention.language}:${normalizeTerm(mention.text)}`);
  const alias = aliasEntry && aliasEntry.kind === 'alias' ? aliasEntry : null;
  const candidateEntityId = alias ? alias.entity.id : mention.candidateEntityId || null;
  const homographKey = `${mention.language}:${normalizeTerm(mention.text)}`;

  if (homographs[homographKey]) {
    return {
      id: mention.id,
      language: mention.language,
      text: mention.text,
      documentId: mention.documentId,
      decision: 'hold-for-curator-review',
      reason: 'false-friend-or-homograph',
      candidateEntityId,
      candidateEntityIds: candidateEntityId ? [candidateEntityId] : [],
      confidence: mention.confidence,
      preservedLanguageTag: mention.language
    };
  }

  if (aliasEntry && aliasEntry.kind === 'collision') {
    return {
      id: mention.id,
      language: mention.language,
      text: mention.text,
      documentId: mention.documentId,
      decision: 'hold-for-curator-review',
      reason: 'alias-collision',
      candidateEntityId: null,
      candidateEntityIds: aliasEntry.entityIds,
      confidence: mention.confidence,
      preservedLanguageTag: mention.language
    };
  }

  if (!alias || mention.confidence < 0.8) {
    return {
      id: mention.id,
      language: mention.language,
      text: mention.text,
      documentId: mention.documentId,
      decision: 'suppress-recommendation',
      reason: alias || candidateEntityId ? 'low-confidence-alias' : 'unknown-alias',
      candidateEntityId,
      candidateEntityIds: candidateEntityId ? [candidateEntityId] : [],
      confidence: mention.confidence,
      preservedLanguageTag: mention.language
    };
  }

  return {
    id: mention.id,
    language: mention.language,
    text: mention.text,
    documentId: mention.documentId,
    decision: 'accept-canonical-entity',
    reason: 'trusted-translated-alias',
    candidateEntityId: alias.entity.id,
    candidateEntityIds: [alias.entity.id],
    confidence: mention.confidence,
    preservedLanguageTag: mention.language
  };
}

function curatorActionForDecision(decision) {
  if (decision.decision === 'accept-canonical-entity') {
    return null;
  }

  return {
    id: `curate-${decision.id}`,
    mentionId: decision.id,
    action:
      decision.reason === 'alias-collision'
        ? 'review-multilingual-alias-collision'
        : decision.reason === 'false-friend-or-homograph'
        ? 'review-multilingual-homograph'
        : 'verify-translated-alias-before-recommendation',
    priority:
      decision.reason === 'false-friend-or-homograph' || decision.reason === 'alias-collision'
        ? 'high'
        : 'normal',
    language: decision.language,
    text: decision.text,
    candidateEntityId: decision.candidateEntityId,
    candidateEntityIds: decision.candidateEntityIds,
    reason: decision.reason
  };
}

function buildEntityPackets(entities, decisions) {
  return entities.map((entity) => {
    const accepted = decisions.filter(
      (decision) =>
        decision.decision === 'accept-canonical-entity' && decision.candidateEntityId === entity.id
    );
    const languages = Array.from(new Set(accepted.map((decision) => decision.language))).sort();

    return {
      id: entity.id,
      canonicalName: entity.canonicalName,
      ontology: entity.ontology,
      identifier: entity.identifier,
      languages,
      mentions: accepted.map((decision) => ({
        id: decision.id,
        text: decision.text,
        language: decision.language,
        documentId: decision.documentId,
        confidence: decision.confidence
      })),
      localizedNames: entity.localizedNames,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: entity.canonicalName,
        identifier: `${entity.ontology}:${entity.identifier}`,
        inDefinedTermSet: entity.ontology,
        alternateName: Object.values(entity.localizedNames).flat()
      },
      schemaOrg: {
        '@type': 'ScholarlyArticle',
        about: accepted.map((decision) => ({
          '@type': 'DefinedTerm',
          name: decision.text,
          inLanguage: decision.language,
          identifier: `${entity.ontology}:${entity.identifier}`
        }))
      }
    };
  });
}

function evaluateAliasGuard(corpus) {
  const aliasIndex = buildAliasIndex(corpus.entities);
  const mentionDecisions = corpus.mentions.map((mention) =>
    mentionDecision(mention, aliasIndex, corpus.homographs)
  );
  const curatorActions = mentionDecisions.map(curatorActionForDecision).filter(Boolean);
  const entityPackets = buildEntityPackets(corpus.entities, mentionDecisions);
  const suppressedMentionIds = mentionDecisions
    .filter((decision) => decision.decision !== 'accept-canonical-entity')
    .map((decision) => decision.id);

  const summary = {
    acceptedMentions: mentionDecisions.filter(
      (decision) => decision.decision === 'accept-canonical-entity'
    ).length,
    heldMentions: mentionDecisions.filter(
      (decision) => decision.decision === 'hold-for-curator-review'
    ).length,
    suppressedMentions: mentionDecisions.filter(
      (decision) => decision.decision === 'suppress-recommendation'
    ).length,
    entityPackets: entityPackets.length
  };

  return {
    corpusId: corpus.corpusId,
    generatedAt: corpus.generatedAt,
    mentionDecisions,
    entityPackets,
    curatorActions,
    recommendationGuards: {
      suppressedMentionIds,
      safeEntityIds: entityPackets
        .filter((packet) => packet.mentions.length > 0)
        .map((packet) => packet.id)
    },
    summary,
    auditDigest: digest({
      corpusId: corpus.corpusId,
      mentionDecisions,
      entityPackets,
      curatorActions,
      summary
    })
  };
}

function buildSampleCorpus() {
  return {
    corpusId: 'kg-multilingual-upload-batch-17',
    generatedAt: '2026-05-28T07:00:00Z',
    entities: [
      {
        id: 'entity:mesh:D000077768',
        canonicalName: 'CRISPR-Cas9',
        ontology: 'MeSH',
        identifier: 'D000077768',
        localizedNames: {
          en: ['CRISPR-Cas9'],
          de: ['CRISPR-Cas9 Geneditierung'],
          es: ['edicion genetica CRISPR-Cas9']
        }
      },
      {
        id: 'entity:mesh:D003920',
        canonicalName: 'Diabetes Mellitus',
        ontology: 'MeSH',
        identifier: 'D003920',
        localizedNames: {
          en: ['diabetes mellitus'],
          de: ['Diabetes mellitus'],
          es: ['diabetes mellitus']
        }
      },
      {
        id: 'entity:stat:control-group',
        canonicalName: 'Control Group',
        ontology: 'SCIBASE-STAT',
        identifier: 'control-group',
        localizedNames: {
          en: ['control group'],
          es: ['grupo control'],
          de: ['Kontrollgruppe']
        }
      }
    ],
    homographs: {
      'es:control': {
        note: 'Spanish control may refer to monitoring or governance, not necessarily a statistical control group.'
      }
    },
    mentions: [
      {
        id: 'mention-crispr-en',
        documentId: 'paper-1',
        text: 'CRISPR-Cas9',
        language: 'en',
        confidence: 0.97
      },
      {
        id: 'mention-crispr-de',
        documentId: 'paper-2',
        text: 'CRISPR-Cas9 Geneditierung',
        language: 'de',
        confidence: 0.91
      },
      {
        id: 'mention-crispr-es',
        documentId: 'paper-3',
        text: 'edicion genetica CRISPR-Cas9',
        language: 'es',
        confidence: 0.89
      },
      {
        id: 'mention-diabetes-en',
        documentId: 'paper-4',
        text: 'diabetes mellitus',
        language: 'en',
        confidence: 0.94
      },
      {
        id: 'mention-diabetes-de',
        documentId: 'paper-5',
        text: 'Diabetes mellitus',
        language: 'de',
        confidence: 0.95
      },
      {
        id: 'mention-diabetes-es',
        documentId: 'paper-6',
        text: 'diabetes mellitus',
        language: 'es',
        confidence: 0.93
      },
      {
        id: 'mention-control-es',
        documentId: 'paper-7',
        text: 'control',
        language: 'es',
        confidence: 0.88,
        candidateEntityId: 'entity:stat:control-group'
      },
      {
        id: 'mention-cellule-fr',
        documentId: 'paper-8',
        text: 'cellule',
        language: 'fr',
        confidence: 0.61,
        candidateEntityId: 'entity:mesh:D002477'
      }
    ]
  };
}

module.exports = {
  evaluateAliasGuard,
  buildSampleCorpus,
  digest
};
