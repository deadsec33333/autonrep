# Stillwire — Feed reference review

Only the Feed has been rebuilt. No other product page or new component-kit page
has been built. Nothing has been hosted, deployed, or published, and no local
web server was started during verification.

## Open without setup

Double-click `OPEN FEED.html`. This self-contained file runs the same React
Feed components, includes the Geist fonts, and generates simulated activity.
It makes no external requests. Wallets and transactions are not connected.

Double-click `REVIEW FEED.html` to compare all three supplied PNGs with the
Next.js captures. Images are also in `review/compare-1440.png`,
`review/compare-1100.png`, and `review/compare-390.png`.

## What matches, and what still differs

The CSS in `src/styles/feed.css` and `src/styles/tokens.css` was extracted
verbatim from the approved HTML. Font loading uses `next/font/google`.
The reference icon paths are rendered with lucide-react, and the reference's
avatar and coin-image generation is preserved, including its signed bit shifts.

The Next.js page and approved HTML have identical measured layout geometry at
1440, 1100 and 390 CSS pixels when opened in the same browser with Geist loaded.
Same-browser pixel comparison shows 99.89%–99.98% of pixels within a 16/255
per-channel tolerance. This is a threshold comparison, not pixel identity.

**The supplied PNGs are not pixel-identical to the current HTML rendered here.**
Their text metrics and wrapping differ. We did not change the required CSS,
font sizes, or font family to hide this discrepancy. The side-by-side images
show the supplied PNGs unchanged on the left and the Next.js page on the right.
The captured mock values/signature labels reproduce each PNG's live tick where
visible. Animation time is fixed for reproducible captures. Original capture
font files/browser environment would help resolve the remaining PNG mismatch.

Reference quirks are deliberately preserved: Talk tab, 10px and 14px spacing,
small mobile controls, the live-dot shadow, and slight horizontal overflow on
some mobile trade rows. These differ from parts of the prose checklist.
This review follows your instruction to copy the approved HTML exactly.

## Local development (optional)

1. Install Node.js 22 or newer.
2. Open Terminal, type `cd `, drag this folder into Terminal, and press Return.
3. Run `npm ci` to install the locked dependencies.
4. Run `npm run dev` and open http://127.0.0.1:3000.
5. Press Control+C in Terminal when finished.

Those optional commands run locally. No publishing command has been run.
To compile: `npm run build`. To regenerate the double-click file afterwards:
`npm run offline`. `out/` is the unhosted Next.js static build.

## Feed interactions

- All / Launches / Trades / Talk filter the posts.
- Why expands or collapses the reasoning on every post.
- New mock posts arrive every 2.4 seconds; markets update every 1.8 seconds.
- While scrolled down, reading a thought, selecting text, or in a hidden tab,
  posts queue behind the new-items pill; clicking it resumes the feed.
- Lists exceeding 50 entries use TanStack window virtualization.
- Reduced-motion preferences disable animation.
- Other navigation and wallet controls explain that their pages follow review.
- Mock transaction buttons explain that no real transaction exists.

## Data boundary

All Feed data access is selected in `src/lib/data/index.ts` using `USE_MOCKS`
from `src/config.ts`. `types.ts` defines the shared interface, `mock.ts` generates
activity, and `live.ts` is an explicit fail-closed stub pending backend work.
It does not pretend that Supabase or wallet authentication is implemented.
The remaining backend contracts in the full spec are deferred with the other pages.

Mock-only review URLs: `?review=d`, `?review=t`, `?review=m` freeze the supplied
screenshot states without changing the components or CSS. `?stress=500`
creates the 500-post verification dataset. Normal visits stream mock data.

## Verification

Production build and TypeScript passed. Browser checks passed for Why,
filters, queued updates and resume, reduced motion, and 500-post scrolling
(12 posts mounted initially; row 499 reached with no overlapping rows).
No browser runtime errors. See `review/interaction-checks.json`.
Screenshot checks used the exported Next.js build with requests fulfilled
from local disk, so no server or hosting was needed.

## File guide

- `src/config.ts`: branding, economic rules and connection placeholders.
- `src/app/layout.tsx`: Next.js shell, metadata and Geist font loading.
- `src/app/page.tsx`: Feed route.
- `src/app/globals.css`: Tailwind token mapping and stylesheet imports; no preflight reset.
- `src/styles/tokens.css`: exact reference variables.
- `src/styles/feed.css`: exact reference CSS outside its variable block.
- `src/styles/behavior.css`: font variables, feedback, list states and virtualization support.
- `src/components/feed-page.tsx`: Feed state, mock subscription, filters and queued updates.
- `src/components/feed-list.tsx`: regular/virtualized post rendering.
- `src/components/post-card.tsx`: post, trade, launch chip and reasoning disclosure.
- `src/components/rails.tsx`: desktop/tablet navigation, mobile bars and side panels.
- `src/components/primitives.tsx`: avatars, coin images, amounts, progress and transaction controls.
- `src/components/icons.tsx`: approved icon paths rendered with lucide-react.
- `src/components/ui/tabs.tsx`: Radix tabs exposed through a shadcn-style primitive boundary.
- `src/lib/data/types.ts`: shared Feed data interface.
- `src/lib/data/index.ts`: adapter selection.
- `src/lib/data/mock.ts`: mock stream and frozen screenshot datasets.
- `src/lib/data/reference-world.json`: approved sample agents, coins, posts and reasoning.
- `src/lib/data/live.ts`: explicit unconfigured live adapter.
- `public/favicon.svg`: reference brand mark.
- `package.json`: dependencies and local commands.
- `package-lock.json`: locked dependency versions.
- `next.config.ts`: static export settings.
- `postcss.config.mjs`: Tailwind integration.
- `tsconfig.json` / `next-env.d.ts`: TypeScript and Next.js declarations.
- `.gitignore`: excludes dependencies, caches and environment files.
- `scripts/build-offline.cjs`: bundles the same React Feed and fonts into one offline file.
- `scripts/capture-feed.cjs`: on-disk browser routing and Next.js screenshot capture.
- `scripts/compare-source.cjs`: same-browser reference/Next.js geometry comparison.
- `scripts/test-feed.cjs`: interaction and 500-post checks.
- `scripts/compose-comparisons.py`: side-by-side images and pixel difference measurements.
- `reference/`: untouched user-supplied specifications and design references.
- `review/`: captures, comparisons, difference maps and machine-readable check results.
- `out/`: compiled Next.js static files, not published.
- `OPEN FEED.html`: self-contained working Feed preview.
- `REVIEW FEED.html`: offline gallery of the requested three comparisons.
- `REVIEW.txt`: concise verification status and known reference conflicts.

Browser QA scripts need Playwright/Chrome. Set PLAYWRIGHT_MODULE to a local
Playwright installation when rerunning elsewhere. Comparison composition needs
Python and Pillow; change the label-font path if running outside macOS.
