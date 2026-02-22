# air-claudecode

Shared team skills and agent prompts for Claude Code.

## Release

When releasing a new version:
1. Update the `version` field in all files:
   - `.claude-plugin/plugin.json`
   - `.claude-plugin/marketplace.json` (top-level `version` and `plugins[0].version`)
   - `package.json`
2. Create a git tag: `git tag v<version> && git push origin v<version>`

