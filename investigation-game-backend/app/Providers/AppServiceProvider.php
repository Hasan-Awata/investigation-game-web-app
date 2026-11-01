<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $response = static fn (Request $request, array $headers) => response()->json([
            'error' => 'Too Many Requests',
            'message' => 'Too many authentication requests. Please try again later.',
            'retry_after' => (int) $headers['Retry-After'],
        ], 429, $headers);
        $identifier = static fn (string $value): string => hash_hmac('sha256', $value, (string) config('app.key'));

        RateLimiter::for('auth-login', static function (Request $request) use ($response, $identifier): array {
            $email = $request->input('email');
            $email = is_string($email) ? mb_strtolower(trim($email)) : '';
            return [
                Limit::perMinute(30)->by('ip:'.$identifier((string) $request->ip()))->response($response),
                Limit::perMinute(5)->by('credentials:'.$identifier(json_encode([$email, $request->ip()], JSON_THROW_ON_ERROR)))->response($response),
            ];
        });
        RateLimiter::for('auth-register', static fn (Request $request): array => [
            Limit::perMinute(5)->by('minute:'.$identifier((string) $request->ip()))->response($response),
            Limit::perHour(20)->by('hour:'.$identifier((string) $request->ip()))->response($response),
        ]);
    }
}
