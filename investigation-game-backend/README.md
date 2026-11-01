<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## Case bundle setup

### Run the local app

From `investigation-game-backend`, run `composer run dev` to start the API, database queue listener, Reverb, and the sibling frontend together. Stop separately started copies first to avoid port conflicts. Interrogation countdowns require the queue listener: running only `php artisan serve` and Reverb will save votes without processing their delayed answers. Keep the development command running while playing. To add only the missing worker to an already running app, use `php artisan queue:work --sleep=1 --tries=3 --timeout=60` in a separate terminal.

### Repair encounters after upgrading

After deploying the backend and restarting queue workers, run `php artisan encounters:release-concluded` from the backend directory. It closes stale active encounter groups in solved/failed rooms in batches of 100 rooms, preserving votes, membership history, results, and XP. Each room is repaired transactionally; active investigations are untouched. The command reports the number of groups closed, can be safely rerun, and exits unsuccessfully if a repair fails. This is a deployment step for existing stale locks; newly concluded investigations release encounters automatically.

Enable PHP's ZIP extension for both CLI and web requests before running `composer install`. Run `composer check-platform-reqs --lock` to verify the installed extensions.

Local case media lives in `public/assets/cases`. Preserve this directory across deployments and back it up together with the database; restoring only the database leaves broken media references. The web server (Nginx/Apache) must deny script execution in this directory. PHP needs write access here and in `storage/app/private`, where bundle extraction uses temporary `tmp/case-bundle-*` directories. Allow disk space for the uploaded ZIP, up to 200 MiB of extraction and another copy of the referenced local media during import.

Cloudinary uploads remain optional. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` before running `php artisan config:cache`. The existing provider client and media ownership checks both use `filesystems.disks.cloudinary`; rebuild the configuration cache after changing credentials. Preserve the provider's case assets when redeploying or restoring the database. The default filesystem and the admin's local-storage choice are unchanged.

### Synchronous request budget

Import and export run in the HTTP request. Default import limits are a 50 MiB ZIP, 1,000 entries, 100 MiB per expanded file, 200 MiB total expansion and a 2 MiB manifest. Referenced images also have a 4 MiB/4096-pixel limit and audio a 10 MiB limit. Configure the web PHP SAPI's `upload_max_filesize=50M` and `post_max_size=52M` (multipart overhead), plus the server's body-size limit, to admit the supported upload size.

For local imports, start with finite host settings of `memory_limit=128M` and `max_execution_time=60`. On PHP-FPM, also set a finite wall-clock budget such as `request_terminate_timeout=90s`; align the proxy/web-server request timeout, for example Nginx `fastcgi_read_timeout 120s` or Apache `Timeout 120`. Apply equivalent finite limits on other hosts. The application does not override PHP limits. Memory, execution time, disk capacity and server timeouts are separate budgets.

Measured on 2026-10-30 with Windows/XAMPP PHP 8.2.12, SQLite in memory and the Laravel HTTP import route: a 51,965,595-byte ZIP (49.56 MiB), exactly 200 MiB expanded, a 2 MiB manifest and 20 distinct valid WAV files imported locally in 1.583 seconds with 62 MiB peak PHP allocation under 128M/60-second limits. Fixture generation was excluded; temporary media and the database were isolated. This measures the local request path, not production upload transfer or Cloudinary latency.

Before increasing bundle limits, repeat a representative largest supported import on the deployment host through its web server, including Cloudinary uploads if used, and record elapsed time and peak memory. Remote export downloads are sequential with a 20-second timeout per asset, so provider-heavy bundles need their own finite host request budget. A 512M memory setting is optional only when measurements and available RAM justify it; it does not solve a timeout or disk exhaustion.

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework. You can also check out [Laravel Learn](https://laravel.com/learn), where you will be guided through building a modern Laravel application.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
