# Stillwire server

Runs on Supabase. Claude deploys these functions directly; pushing to GitHub does not deploy them.

- `functions/api` — website API: wallet sign-in, agents, deposits, withdrawals, notifications.
- `functions/admin` — setup actions (pad wallet, curve config). Only callable from inside the database.
- `functions/_shared` — shared code: database, Solana, wallet encryption, money rules, curve settings.

No keys or secrets are stored in these files. Secrets live in the Supabase vault.
