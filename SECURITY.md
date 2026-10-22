# Dependency security maintenance

## 2026-10-22 update

- Next.js: 15.5.20 → 15.5.28 (stay on the existing major/minor series).
- React / React DOM: 19.1.0 → 19.1.10.
- PostCSS: 8.5.31; its Nano ID and source-map-js dependencies resolve to patched versions.
- sharp: overridden to 0.35.5 so the compatible but vulnerable 0.34.x release is not retained.
- The lockfile is committed; use `npm ci` to reproduce the tested dependency tree.
- Application calculations, localStorage keys/schema, stock records, and UI source are unchanged.

Run `npm audit --omit=dev` for production dependencies and `npm audit` for the full build/development tree. A clean audit only means that the registry reports no known advisories for that dependency tree at that time; it is not a guarantee against all attacks or evidence that a deployment has not been compromised.

### Remaining build-tool advisories

The full audit still reports 7 affected development packages (5 high, 2 moderate), through Tailwind CSS 3's `braces` and `postcss-selector-parser` dependency chains. These are not included in the production-only audit. The suggested Tailwind CSS 4 upgrade is a breaking migration and has not been applied as part of this compatibility-preserving patch update.

- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/advisories/GHSA-rj75-hqrm-r3gf

Do not build untrusted source, glob patterns, or styles in the project's build process. The calculator does not accept these as application inputs. Recheck upstream patches and plan the Tailwind migration separately; do not treat development dependencies as universally harmless.

### Scope

This app is Next.js/React, not PHP. PHP CVE-2026-109618 / CVE-2026-109619 are not addressed by installing a PHP runtime here. Hosting-provider internals, credentials, and compromise/incident investigation are outside a dependency audit.

No `npm audit fix --force` or storage migration was used.
