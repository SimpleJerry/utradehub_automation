# Release Checklist

Run this checklist before pushing a `v*` release tag or approving a public installer release.

- [ ] Version and tag match: confirm `package.json` version, release notes, and the planned `v*` tag describe the same release.
- [ ] Installer smoke test: install `UTradeHubAutomationSetup.exe` on a clean or representative Windows profile, launch from the desktop or Start menu, and confirm the local UI opens.
- [ ] Chrome environment: confirm Google Chrome is installed on the operator machine and the UI environment check reports no Chrome blocker.
- [ ] Human gate: confirm the tool only creates uTradeHub `임시저장` drafts and that the operator manually reviews the portal state before any later action.
- [ ] Submission boundary: do not click or automate `발급`, `제출`, or any equivalent final issuance/submission action during release validation.
- [ ] Artifact integrity: record the installer filename, size, SHA-256 hash, build source commit, release tag, and release approver in the release notes or internal release log.
