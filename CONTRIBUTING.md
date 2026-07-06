# Contributing to Kredex

Thanks for your interest in Kredex — an open-source (MIT) AI financial autopilot
for African small businesses. Contributions of all kinds are welcome: bug reports,
features, docs, translations, and tests.

## Ground rules

- Be respectful and constructive. This project exists to help real small
  businesses, so keep that user in mind.
- For anything non-trivial, **open an issue first** so we can agree on the approach
  before you write code.
- Keep changes focused — one logical change per pull request.

## Getting set up

Get the app running with either path from the [README](README.md):

- **Docker (easiest):** `cp .env.example .env` (add `QWEN_API_KEY` + `JWT_SECRET`)
  then `docker compose up -d --build web server mongo` → http://localhost:8080
- **Native:** `cp server/.env.example server/.env`, `npm run install:all`,
  `npm run dev` → http://localhost:5173

You'll need a **Qwen Cloud API key** from Alibaba Model Studio (DashScope). Use a
pay-as-you-go key (`sk-…`) with the `dashscope-intl` endpoint — a Token-Plan key
(`sk-sp-…`) is for interactive tools only and will `401` against a backend.

## Making a change

1. **Fork** the repo and create a branch:
   `git checkout -b feat/short-description` (or `fix/…`, `docs/…`).
2. Make your change. Match the style, naming, and comment density of the
   surrounding code.
3. **Type-check before pushing** — both must pass clean:
   ```bash
   npm --prefix server run build       # tsc
   npm --prefix client run typecheck   # tsc --noEmit
   ```
4. Commit with a clear message (e.g. `feat: add GHS currency formatting`).
5. **Open a pull request** describing what changed and why, and link the issue.
   Screenshots or a short clip help for UI changes.

## Good first areas

- More languages / locales beyond English & Nigerian Pidgin
- Additional currencies (formatting + settings)
- New autopilot scanners (e.g. slow-moving stock, upcoming bills)
- Test coverage for the agent tools, memory recall, and autopilot scanners
- Documentation and onboarding polish

## Project layout

See the [Project layout](README.md#project-layout) section of the README for a map
of `server/src` and `client/src`.

## Reporting bugs & security

- **Bugs:** open a [bug report issue](../../issues/new?template=bug_report.md) with
  steps to reproduce, what you expected, and what happened.
- **Security:** please do **not** open a public issue for a vulnerability. Contact
  the maintainer privately (see the repo's GitHub profile) so it can be fixed before
  disclosure.

## License

By contributing, you agree that your contributions are licensed under the project's
[MIT License](LICENSE).
