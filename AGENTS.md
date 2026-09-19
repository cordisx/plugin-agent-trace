# Agent Trace Repository Guide

- This repository exclusively owns the CordisX Agent Trace plugin, package,
  manifest, documentation, and tests.
- Read `.agents/rules/README.md` before changing this repository.
- Keep the plugin read-only and Host-neutral. Native adapters, event ledgers,
  permission enforcement, routes, chrome, and shared controls belong to the
  Host.
- Do not add compatibility shims during the current design-validation phase.
- The package currently keeps the existing product identifiers, but no API or
  configuration compatibility is implied by that naming.

## Development and release

- Requires Node.js 22 or newer. Install with `npm ci`.
- Run `npm run check`, `npm pack --dry-run`, and `git diff --check` before a
  checkpoint commit. `npm run check` includes typecheck, build, tests, source
  lint, format verification, and the package dry run.
- The public README is for installation and use. Keep architecture checkpoints,
  source layout, build details, test commands, contribution steps, and release
  operations here or in an indexed maintainer guide.
- Releases use a GitHub prerelease, not npm. Build the exact merged main commit,
  create the private package tarball with `npm pack`, publish it as
  `cordisx-agent-trace-showcase-<version>.tgz` with `SHA256SUMS`, and verify both
  assets by downloading and hashing them. Do not publish until the package
  descriptor, package version, README version, tag, and archive all agree.
- Marketplace artifact URLs and SHA-256 digests are updated by the Marketplace
  owner after the release. Do not copy an older Official or Certified record.
