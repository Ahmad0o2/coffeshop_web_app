# Project Management Setup

This document describes the GitHub project-management assets added for Cortina.D and how the team should use them in day-to-day work.

## Summary

The repository now includes a lightweight GitHub collaboration setup for:
- structured bug intake
- structured feature intake
- a consistent pull request review checklist
- contributor workflow guidance
- a release history file for shipped changes

These files are intentionally repository-level so they work immediately in GitHub without any extra tooling.

## Files Added

### `.github/ISSUE_TEMPLATE/bug_report.yml`

Provides a guided bug report form with:
- a required problem description
- required reproduction steps
- expected behavior
- an affected area selector
- a severity selector

This helps triage bugs faster and keeps reports consistent across customer, admin, real-time, and SEO related issues.

### `.github/ISSUE_TEMPLATE/feature_request.yml`

Provides a guided feature request form with:
- the problem being solved
- a proposed solution
- alternative ideas considered
- an area selector

This keeps feature proposals focused on user value instead of only raw implementation ideas.

### `.github/pull_request_template.md`

Adds a pull request checklist covering:
- change type
- local validation
- lint/build status
- reviewer notes
- UI screenshots when needed

This reduces review back-and-forth and makes each PR easier to understand quickly.

### `.github/CONTRIBUTING.md`

Documents the expected collaboration workflow:
- conventional commit prefixes
- branch naming rules
- local development setup
- pull request process

This file gives contributors one place to understand how to work in the repo before opening a PR.

### `CHANGELOG.md`

Adds a release history file based on the Keep a Changelog style with:
- an `Unreleased` section
- a documented `1.1.0` release
- a documented `1.0.0` baseline release

This creates a clear place to track shipped functionality and upcoming work.

## Why This Setup Was Added

The goal of this setup is to make repository collaboration easier as the project grows. It improves:
- issue quality
- review consistency
- contributor onboarding
- release visibility
- maintainability for future team members

## Expected Workflow

### Reporting a bug

1. Open a new GitHub issue.
2. Choose `Bug Report`.
3. Fill in the required description, reproduction steps, area, and severity.
4. Assign or triage based on impact.

### Requesting a feature

1. Open a new GitHub issue.
2. Choose `Feature Request`.
3. Describe the problem and proposed solution.
4. Use the selected area to route the request to the right part of the product.

### Opening a pull request

1. Create a branch using the documented naming convention.
2. Make changes using conventional commits.
3. Run the expected checks locally.
4. Open the PR with the provided template.
5. Fill in reviewer notes and screenshots if the change affects UI.

### Documenting a release

1. Add upcoming work to `## [Unreleased]`.
2. When releasing, move relevant entries into a dated version section.
3. Keep entries grouped under headings such as `Added`, `Fixed`, and `Security`.

## Notes About Scope

This setup only adds collaboration and documentation assets. It does not change application runtime behavior, backend logic, frontend rendering, or deployment behavior by itself.

## Future Improvements

Suggested next steps if you want to expand this setup later:
- add `config.yml` under `.github/ISSUE_TEMPLATE/` to guide users toward discussions or contact links
- add `CODEOWNERS` for review routing
- add release automation for changelog and version tagging
- add PR or issue labels automation
- add GitHub Projects or milestones for roadmap tracking
