# Evidence template development and rollout

## Add a layout

Create a folder under `investigation-game-frontend/src/features/evidence/presentation/templates/<id>/v<version>` containing `definition.json`, `Layout.tsx`, and `Layout.module.css`. Use Background Check v1 as the starting point. Definitions declare English and Arabic names, a category, compatible paper types, and ordered fields. Text and row fields declare their limits. Row columns can be text, multiline text, or dates. Layouts receive saved `values`, the display `locale`, and an optional `pageLimit` for the folder preview.

Run `npm run evidence:catalog` from the frontend and commit the generated Laravel catalog alongside the layout. Vite also updates it during development and build. `npm run lint` checks catalog drift. Publish a new version in a new folder and keep earlier definitions and layouts available for their saved reports. Deploy the Laravel catalog before deploying the matching frontend.

## Convert a case or bundle

Take a database and media backup before converting an installed case. Keep the original bundle before converting an archive. Run these commands from `investigation-game-backend`.

1. Use `php artisan case:convert-paper --case=42` or `php artisan case:convert-paper --bundle=original.zip` to list legacy evidence and the current metadata hashes.
2. Create a JSON object keyed by database evidence ID or the bundle inventory key. This is the `ref_id` when present and `index:<position>` for an older entry without a reference. Each entry contains `expected_sha256` from the inventory and a `template` object with `id`, `version`, and `values`. Use `background_check` version `1` and fill in `subject`. Carry clues into `notes` and use case-managed media references for installed evidence or paths inside the archive for bundles.
3. Repeat the command with `--reviews=reviewed.json` to validate without applying. Add `--apply` to update the installed case. For a bundle, use `--apply --output=converted.zip` to write a new archive. Import the converted ZIP into a test environment before publishing it.
4. Verify evidence access and the verdict route. Once the production inventory is clear and maintained archives have been converted, set `CASE_BUNDLE_ALLOW_LEGACY_PAPER=false` and retire the transitional block reader, validation, and upload route. Converted paper bundles use format 3. Format 2 bundles without paper evidence can still be imported.
