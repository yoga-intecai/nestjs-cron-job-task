# Contributing

We love your input! We want to make contributing to this project as easy and transparent as possible.

## Development Workflow

1. Fork the repo and create your branch from `main`.
2. Run `npm install` (this also registers the Git hooks).
3. If you've added code that should be tested, add tests.
4. If you've changed APIs, update the documentation.
5. Ensure the test suite passes (`npm test`).
6. Make sure your code lints and is formatted
   (`npm run lint`, `npm run format:check`).

A pre-commit hook runs `npm run lint` and `npm run format:check` automatically
once the hooks are installed.

## Pull Requests

1. Describe your changes in the PR description.
2. Link any relevant issues.
3. Wait for CI to pass and for code review.

## Coding Style

- We use Prettier for formatting and Oxlint for linting.
- Follow NestJS best practices.
- Write meaningful tests.
