# Requirements Map

## Peer Reviews & Comments

- Structured peer-review evidence is tied to reviewed artifact digests.
- Missing or malformed review submission or recertification timestamps require recertification before review credit is applied.
- Missing or malformed artifact change timestamps require review and inline-comment recertification before review credit or comment evidence is applied.
- Inline comments track artifact anchors and require recertification when anchors shift, artifact digests change, artifact timing evidence is missing or malformed, anchor metadata is missing, artifact anchor maps are missing, or comment timing evidence is missing or malformed.
- Stale review or inline-comment evidence blocks reputation updates until recertification is complete.
- Public, semi-private, and double-blind review modes are represented, with blind and fully anonymous labels normalized across hyphenated, underscored, and space-separated variants.
- Public and semi-private review credit requires a concrete reviewer identity before reputation deltas are applied.
- Review history is emitted in a project timeline packet.

## Contributor Credits

- Review-derived reputation deltas are preserved as original deltas.
- Stale review evidence freezes effective deltas until recertification, and stale inline-comment evidence blocks reputation updates.
- Audit packets keep enough evidence for profile and citation-page credit decisions.

## Reputation Scoring

- Current reviews apply their transparent reputation delta.
- Stale reviews are blocked from leaderboards, badges, and score updates.
- Reviews without non-blind reviewer identity are blocked from leaderboards, badges, and score updates until the identity is recertified.
- Recertification tasks explain which evidence must be refreshed.

## Privacy And Trust

- Double-blind and fully anonymous reviewer IDs are replaced by anonymous labels even when incoming mode names use spaces or underscores.
- Synthetic data only; no private profile emails, credentials, or external API calls.
- The timeline audit digest is deterministic for reviewer verification.
