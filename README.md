# Stillwire — local component review

This is stage 2 of the supplied brief, not the finished application.
The brief explicitly asks for visual review before pages are built.
Nothing was hosted or published. No server needs to run to view the kit.

## View now (no setup)
Double-click `OPEN COMPONENT KIT.html`. It contains the same rendered
components and styles as the Next.js `/kit` route, plus local preview interactions.
No network fonts, images, APIs, wallet extensions, or external scripts are used.

## Run the editable Next.js project later
1. Install Node.js 22 or newer.
2. Open Terminal and type `cd `, drag this folder into Terminal, then press Return.
3. Type `npm install` and press Return.
4. Type `npm run dev` and press Return.
5. Open http://127.0.0.1:3000/kit in your browser.
6. Press Control+C in Terminal to stop it.

You requested no hosting. These commands are optional local development only;
no deployment configuration or automatic publishing is included.

## Review status
Original dark design tokens, shared components, and a component showcase are ready.
Review the palette, spacing, typography, controls and cards before stage 3.
The supplied text mentions a Design System and a Quality Checklist, but includes
neither a detailed token specification nor a final checklist; these tokens are an
original interpretation of its stated dark, calm, readable direction.

## Still to implement after visual review
All product pages, complete mock world and stream, virtualization, charts,
Supabase/API adapters, Solana wallet login/deposits, owner dashboards and
notification workflows. Full screenshots and final QA follow those pages.
The displayed sample actions never perform real transactions.

## File guide
- `package.json`: framework versions and local commands.
- `package-lock.json`: dependency lock, if present after installation.
- `next.config.ts`: local static-export configuration for this review stage.
- `postcss.config.mjs`: Tailwind integration.
- `tsconfig.json`: TypeScript configuration.
- `next-env.d.ts`: Next.js type definitions.
- `.gitignore`: generated/private files excluded from source control.
- `src/config.ts`: branding, economic rules, connection settings and sample values.
- `src/styles/tokens.css`: centralized design tokens.
- `src/styles/interface.css`: component layouts, responsive styles and states.
- `src/app/globals.css`: global style imports.
- `src/app/layout.tsx`: document metadata and app shell.
- `src/app/page.tsx`: root alias of the kit.
- `src/app/kit/page.tsx`: the `/kit` route.
- `src/components/ui.tsx`: shared primitives.
- `src/components/kit.tsx`: rendered state inventory and product examples.
- `src/lib/data/README.md`: exact future mock/live adapter location.
- `public/favicon.svg`: original geometric brand mark.
- `reference/frontend-spec.txt`: untouched copy of the supplied brief.
- `OPEN COMPONENT KIT.html`: self-contained offline review artifact.
- `REVIEW.txt`: validation and scope report.
# autonrep
