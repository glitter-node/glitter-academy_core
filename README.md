# Glitter Academy Core

`glitter-academy_core` is a Gnuboard7 user template for academy information, community boards, pages, member features, and consultation reservations.

## Requirements

- Gnuboard7 7.0.6 or later
- PHP 8.2 or later
- Node.js and npm are required only when rebuilding frontend assets
- Modules: `sirsoft-board >=1.0.3`, `sirsoft-page >=1.0.2`, `glitter-reservation >=0.2.4`
- Plugin: `sirsoft-daum_postcode >=1.0.1`

Install and activate the declared dependencies before activating this template. `glitter-reservation` must be obtained separately when it is not included in the Gnuboard7 distribution.

## Package structure

The repository root must be the template package root and must contain `template.json`, `routes.json`, `components.json`, `layouts/`, `lang/`, `src/`, and the built `dist/` assets. Do not wrap these files in an additional directory inside a release ZIP.

## Installation

Place the package in `templates/_bundled/glitter-academy_core` for a bundled installation, then run:

```bash
/usr/local/bin/php83 artisan template:install glitter-academy_core
/usr/local/bin/php83 artisan template:activate glitter-academy_core
```

The Gnuboard7 administrator can also install a GitHub repository or ZIP release through the template installer. The GitHub repository root or extracted ZIP package root must contain `template.json`.

On a fresh installation without the required `qna` board, board pages show a first-run setup action only to an administrator with the Official `sirsoft-board.boards.create` permission. The action creates the minimal board through the Official sirsoft-board admin API. An existing `qna` board and its site-specific settings are preserved; this package does not import a database dump, sample posts, or comments.

## Updating

After publishing a higher semantic version in `template.json` and `CHANGELOG.md`, update an installed bundled copy with:

```bash
/usr/local/bin/php83 artisan template:update glitter-academy_core --source=bundled
```

Choose the layout overwrite or keep strategy after reviewing site-specific layout modifications.

## Frontend build

Release packages include the generated `dist/css/components.css` and `dist/js/components.iife.js` files because Gnuboard7 serves them directly through the template asset API. Rebuild them after changing `src/`:

```bash
npm run build
```

For continuous static builds, use `npm run build:watch`. Vite development server and HMR are not supported by this package.

## Tests

```bash
npm run test:run
npm run type-check
```

## License

MIT. See `LICENSE`.
