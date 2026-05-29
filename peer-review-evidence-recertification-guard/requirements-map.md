# Requirements Map

## Peer Reviews & Comments

- Structured peer-review evidence is tied to reviewed artifact digests.
- Malformed review submission or recertification timestamps require recertification before review credit is applied.
- Inline comments track artifact anchors and require recertification when anchors shift, artifact digests change, or comment timing evidence is malformed.
- Public, semi-private, and double-blind review modes are represented.
- Review history is emitted in a project timeline packet.

## Contributor Credits

- Review-derived reputation deltas are preserved as original deltas.
- Stale evidence freezes effective deltas until recertification.
- Audit packets keep enough evidence for profile and citation-page credit decisions.

## Reputation Scoring

- Current reviews apply their transparent reputation delta.
- Stale reviews are blocked from leaderboards, badges, and score updates.
- Recertification tasks explain which evidence must be refreshed.

## Privacy And Trust

- Double-blind reviewer IDs are replaced by anonymous labels.
- Synthetic data only; no private profile emails, credentials, or external API calls.
- The timeline audit digest is deterministic for reviewer verification.
