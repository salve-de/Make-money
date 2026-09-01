# Security Policy

## Reporting

Do not open a public issue for vulnerabilities involving authentication, private user data, service-role credentials, RLS bypass, or stored XSS. Report them privately to the repository owner.

## Rules

- Never commit `SUPABASE_SERVICE_ROLE_KEY` or other server secrets.
- The browser may receive only the public Supabase URL and anon key.
- Keep Row Level Security enabled on every user-data table.
- Treat all submitted URLs and text as untrusted.
- Do not allow arbitrary HTML in descriptions or evidence notes.
- Rate-limit anonymous submissions and analytics events at the edge before public launch.
- Review external data licenses before storing or redistributing content.
