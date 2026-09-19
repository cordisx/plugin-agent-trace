# CordisX Agent Trace Showcase

Agent Trace Showcase adds a read-only Timeline for one Agent session. It is
useful when you need to inspect durable session events, lifecycle transitions,
tool activity, approvals, and the exact entity definition recorded with the
session without giving the plugin control over that session.

## Install

Plugin ID: `agent-trace-showcase`. Current release: `0.1.2`.

The CordisX Community Marketplace feed must already be configured and enabled
before `--source` can select it:

```sh
FEED_URL=https://raw.githubusercontent.com/cordisx/marketplace/main/marketplace.json
npx cordisx@beta source add "$FEED_URL" --yes
npx cordisx@beta plugin install agent-trace-showcase --source "$FEED_URL" --version 0.1.2
```

Skip `source add` when that exact feed is already enabled. For another profile,
add the same `--profile <profile>` argument to both commands. `--source` selects
an already configured and enabled source; it does not register one. `--yes`
confirms the source change only and does not approve plugin permissions. A
discovery source is not a trust root.

The install command becomes available after the Marketplace v3 entry lists the
verified `0.1.2` artifact. Until then, download the archive and `SHA256SUMS`
from the
[GitHub release](https://github.com/cordisx/plugin-agent-trace/releases/tag/v0.1.2).

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

- **Install cannot find version `0.1.2`:** confirm the Marketplace v3 entry
  lists the verified artifact. `--source` does not add or repair a feed.
- **Timeline is empty:** open it from a concrete Agent session and review the
  three session permissions in CordisX plugin settings.
- **Timeline stops updating:** reopen the session route. A terminal subscription
  code is shown instead of silently switching data sources.

## License

See [LICENSE](LICENSE) and [legal](legal/) for the package and dependency terms.
Maintainer setup, checks, packaging, and release instructions are in
[AGENTS.md](AGENTS.md).
