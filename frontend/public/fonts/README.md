# Fonts

The design specimen in `docs/design/03-type-colour-specimen.jpg` names **Lufga**,
which is a commercial typeface. It is not bundled here and it is not available
from a CDN, so nothing in this repository fetches it.

## If you have a Lufga licence

Drop the `.woff2` files into this directory with exactly these names:

```
Lufga-Regular.woff2     400
Lufga-Medium.woff2      500
Lufga-SemiBold.woff2    600
Lufga-Bold.woff2        700
Lufga-Black.woff2       900
Lufga-Italic.woff2      400 italic
```

`src/styles/index.css` already declares the matching `@font-face` rules and
puts Lufga first in `--font-ui`, so the app picks them up with no code change.

## If you do not

Nothing breaks. The browser falls straight through to the next family in
`--font-ui`, which is **Plus Jakarta Sans** — a geometric humanist face in the
same register, loaded from Google Fonts in `index.html`. Display type uses
**Fraunces**, a high-contrast serif standing in for the hero treatment in
`docs/design/01-lifeline-hero-mobile.png`.

Vite prints a "didn't resolve at build time" warning for each missing Lufga
file. That warning is expected while the files are absent and is not an error —
the reference simply resolves (to nothing) at runtime, and the fallback applies.
