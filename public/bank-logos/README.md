# Bank logos (owner-supplied only)

Do **not** add logo files unless the office owner provided them.

## File naming

One file per bank id from `dashboard/src/data/palestinianBanks.js`:

- `{bankId}.svg` (preferred)
- `{bankId}.png` or `{bankId}.webp` (transparent background, min width 600px)

Examples:

- `bank-of-palestine.svg`
- `quds-bank.png`

## Specs

- SVG: no scripts, no external references, no `foreignObject`
- Raster: PNG or WebP, ≤ 500 KB, transparent background
- Office-specific overrides are uploaded in **الإعدادات → شعارات البنوك** (stored on the server, not in this folder)

## Current status

No bundled logo files are shipped in the repository. The live preview uses a monogram fallback until a file exists here or an office upload is configured.
