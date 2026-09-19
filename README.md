# CordisX Agent Trace Showcase

Agent Trace Showcase adds a read-only Timeline for one Agent session. It is
useful when you need to inspect durable session events, lifecycle transitions,
tool activity, approvals, and the exact entity definition recorded with the
session without giving the plugin control over that session.

## Install

Plugin ID: `agent-trace-showcase`. Current release: `0.1.1`.

Release `v0.1.1` is a documentation and source package. Its archive does not
contain the standard `cordisx-package.json` manifest required by the current
CordisX CLI artifact installer, so it cannot be installed with `plugin install`.
Adding an artifact record to the Marketplace alone does not fix that package
format gap.

The published archive and `SHA256SUMS` remain available from the
[GitHub release](https://github.com/cordisx/plugin-agent-trace/releases/tag/v0.1.1)
for source inspection. Do not unpack it into a CordisX profile as a substitute
for an installable package.

After a future release provides the standard package manifest and compatible
runtime bundle, the CLI syntax will be:

```sh
FEED_URL=https://raw.githubusercontent.com/cordisx/marketplace/main/marketplace.json
npx cordisx@beta source add "$FEED_URL" --yes
npx cordisx@beta plugin install agent-trace-showcase --source "$FEED_URL" --version <installable-version>
```

For another profile, add the same `--profile <profile>` argument to both future
commands. `--source` selects an already configured and enabled source; it does
not register one. `--yes` confirms the source change only and does not approve
plugin permissions. A discovery source is not a trust root.

## Use

Open an Agent session in CordisX, then use the session Timeline action. The page
shows the immutable history available for the active `session.timeline` route
and follows new committed events. It never creates, edits, resumes, or cancels
Agent work.

## Configuration

`timelineWindowSize` limits the in-memory and rendered event window. The default
is `500`; accepted values are `50` through `500`. Configuration applies after a
plugin restart.

## Permissions and limits

The plugin requests optional, route-scoped `sessions.get`, `sessions.read`, and
`sessions.subscribe` access for the exact active session ID. Data is retained
only for the current runtime and is not transferred externally.

If the Host service, exact route permission, session, read operation, or
subscription is unavailable, the Timeline stays empty and reports the
unavailable state. It does not fall back to another event source, query mutable
entity state, or reconstruct missing history.

## Troubleshooting

- **`plugin install` rejects `0.1.1`:** this release is not an installable CLI
  artifact because its archive lacks `cordisx-package.json`. Use the release
  only for source inspection and wait for an explicitly installable version.
- **Timeline is empty:** open it from a concrete Agent session and review the
  three session permissions in CordisX plugin settings.
- **Timeline stops updating:** reopen the session route. A terminal subscription
  code is shown instead of silently switching data sources.

## License

See [LICENSE](LICENSE) and [legal](legal/) for the package and dependency terms.
Maintainer setup, checks, packaging, and release instructions are in
[AGENTS.md](AGENTS.md).
