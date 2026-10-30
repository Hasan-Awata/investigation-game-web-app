<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class MediaConfigurationTest extends TestCase
{
    public function test_cached_configuration_supplies_the_provider_client_and_ownership_checks(): void
    {
        $cache = tempnam($this->app->bootstrapPath('cache'), 'media-config-');
        File::delete($cache);
        $environment = [
            'APP_CONFIG_CACHE' => 'bootstrap/cache/'.basename($cache),
            'CLOUDINARY_CLOUD_NAME' => 'cached-cloud',
            'CLOUDINARY_API_KEY' => 'test-key',
            'CLOUDINARY_API_SECRET' => 'test-secret',
        ];

        try {
            $build = new Process([PHP_BINARY, 'artisan', 'config:cache'], base_path(), $environment);
            $build->mustRun();
            $this->assertFileExists($cache);

            $probe = <<<'PHP'
                require 'vendor/autoload.php';
                $app = require 'bootstrap/app.php';
                $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
                $client = $app->make(Cloudinary\Cloudinary::class);
                $media = $app->make(App\Services\MediaService::class);
                $url = 'https://res.cloudinary.com/cached-cloud/image/upload/cases/test/Cover/new.png';
                $api = Mockery::mock(Cloudinary\Api\Upload\UploadApi::class);
                $api->shouldReceive('upload')->twice()->with(Mockery::type('string'), [
                    'folder' => 'cases/test/Cover', 'resource_type' => 'image', 'overwrite' => false,
                ])->andReturn(
                    new Cloudinary\Api\ApiResponse(['secure_url' => $url], []),
                    new Cloudinary\Api\ApiResponse(['secure_url' => $url, 'existing' => true], []),
                );
                $fake = Mockery::mock(Cloudinary\Cloudinary::class);
                $fake->shouldReceive('uploadApi')->twice()->andReturn($api);
                $app->instance(Cloudinary\Cloudinary::class, $fake);
                $source = tempnam(sys_get_temp_dir(), 'cached-upload-');
                try {
                    file_put_contents($source, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='));
                    $created = [];
                    $stored = $media->storeFromPath($source, 'image.png', 'Test', 'Cover', false, createdMedia: $created);
                    $reused = [];
                    $existing = $media->storeFromPath($source, 'image.png', 'Test', 'Cover', false, createdMedia: $reused);
                    Mockery::close();
                } finally {
                    unlink($source);
                }
                echo json_encode([
                    'cached' => $app->configurationIsCached(),
                    'environment_absent' => env('CLOUDINARY_CLOUD_NAME') === null
                        && env('CLOUDINARY_API_KEY') === null && env('CLOUDINARY_API_SECRET') === null,
                    'credentials' => $client->configuration->cloud->cloudName === 'cached-cloud'
                        && $client->configuration->cloud->apiKey === 'test-key'
                        && $client->configuration->cloud->apiSecret === 'test-secret',
                    'secure' => $client->configuration->url->secure,
                    'upload_tracking' => $stored === $url && $created === [$url]
                        && $existing === $url && $reused === [],
                    'owned' => $media->ownsCloudinaryAsset($stored),
                    'unowned' => $media->ownsCloudinaryAsset('https://res.cloudinary.com/other-cloud/image/upload/cases/test/Cover/new.png'),
                ]);
                PHP;
            $process = new Process([PHP_BINARY, '-r', $probe], base_path(), array_replace($environment, [
                'CLOUDINARY_CLOUD_NAME' => false,
                'CLOUDINARY_API_KEY' => false,
                'CLOUDINARY_API_SECRET' => false,
                'CLOUDINARY_URL' => false,
            ]));
            $process->mustRun();

            $this->assertSame([
                'cached' => true,
                'environment_absent' => true,
                'credentials' => true,
                'secure' => true,
                'upload_tracking' => true,
                'owned' => true,
                'unowned' => false,
            ], json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR));
        } finally {
            File::delete($cache);
        }
    }
}
