---
name: release-cli
description: Prep a knock-cli release. Use when the user asks to prepare, create,
  or cut a release, or bump the version.
argument-hint: [version]
---

# Knock CLI Release Prep

Prepare a new CLI release by bumping the version, creating the tag, and opening a PR.

## Instructions

If no version is provided, ask the user what version to release. Check the current
version in package.json to help them decide (patch, minor, or major bump).

Execute these steps:

1. **Check prerequisites**
   - Run `git status` to ensure working directory is clean
   - Run `git checkout main && git pull` to ensure you're on latest main
   - Show current version: `node -p "require('./package.json').version"`

2. **Create release branch**
   ```bash
   git checkout -b release-v{version}
   ```

3. **Build and bump version**
   ```bash
   yarn build && yarn version --new-version {version}
   ```
   This updates package.json and creates the git tag automatically.

4. **Push branch and tag**
   ```bash
   git push origin release-v{version}
   git push origin v{version}
   ```

5. **Create PR**
   Create a PR with title "v{version}" targeting main. The PR body should note
   this is a release version bump.

6. **Provide next steps**
   Tell the user:
   - Merge the PR once approved
   - Then run in Slack: `/release cut knock-cli -v {version}`

## Important

- The git tag MUST match the version in package.json exactly
- `yarn version` creates both the package.json change AND the git tag
- The release pipeline validates this match and will fail if they don't match
