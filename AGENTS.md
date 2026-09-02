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
