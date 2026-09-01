# Contributing

## Development

```bash
npm run dev
npm run verify
```

## Change rules

- Keep `src/core.js` DOM-independent and add tests for scoring/search changes.
- Every new entity must have a stable unique `id` and valid category references.
- Never present demo or user-submitted numbers as verified.
- New monetary fields must declare the money type, currency, period, source and evidence grade.
- Sponsored placement must never change organic scoring.
- User-controlled strings must be escaped before insertion into HTML.
- Run `npm run verify` before pushing.

## Content contribution

A useful Money Signal states who paid whom, how much, for what, when, and which source proves it. A useful Opportunity explains why the demand exists, what remains unsolved, who can enter, and what would invalidate the thesis.
