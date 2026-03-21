# Contributing to Cortina.D

## Commit Convention
feat: new feature
fix: bug fix
refactor: code change without feature/fix
perf: performance improvement
test: adding or updating tests
docs: documentation only
chore: build process, tooling, or dependencies
style: formatting, no logic change

Examples:
feat: add pagination to orders endpoint
fix: resolve socket leak in useSettings hook
perf: add in-memory cache for settings images

## Branch Naming
feature/short-description
fix/short-description
refactor/short-description
chore/short-description

## Development Setup
1. Clone the repo
2. cd server && cp .env.example .env && npm install
3. cd client && cp .env.example .env && npm install
4. cd server && npm run dev
5. cd client && npm run dev

## PR Process
1. Create branch from main
2. Make changes with conventional commits
3. Run tests: npm test
4. Run lint: npm run lint
5. Open PR using the template
