<?php

namespace Tests\Feature;

use App\Models\GameCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\Process\Process;
use Tests\Feature\Admin\Concerns\ImportsCaseBundles;
use Tests\TestCase;

class GlasshouseInstallationTest extends TestCase
{
    use ImportsCaseBundles;
    use RefreshDatabase;

    public function test_installation_checks_database_integrity_and_duplicate_catalog(): void
    {
        $bundle = tempnam(sys_get_temp_dir(), 'glasshouse-install-');
        unlink($bundle);
        try {
            (new Process([PHP_BINARY, base_path('scripts/release-content/build-glasshouse-release.php'), dirname(base_path()).'/cases/the-glasshouse-files.zip', $bundle, '--authoring']))->mustRun();
            $this->artisan('case:install-glasshouse', ['bundle' => $bundle, '--confirm-database' => 'wrong'])->assertFailed();
            $this->assertSame(0, GameCase::count());
            $this->artisan('case:install-glasshouse', ['bundle' => $bundle, '--confirm-database' => ':memory:'])->assertSuccessful();
            $this->assertDatabaseHas('cases', ['is_published' => true, 'min_player_XP' => 0]);
            $this->artisan('case:install-glasshouse', ['bundle' => $bundle, '--confirm-database' => ':memory:'])->assertFailed();
            $this->assertSame(1, GameCase::count());
        } finally {
            if (is_file($bundle)) unlink($bundle);
            if (is_file($bundle.'.provenance.json')) unlink($bundle.'.provenance.json');
        }
    }

    public function test_unknown_source_cannot_create_a_release(): void
    {
        $source = tempnam(sys_get_temp_dir(), 'invalid-source-');
        $destination = $source.'.zip';
        try {
            file_put_contents($source, 'untrusted');
            $process = new Process([PHP_BINARY, base_path('scripts/release-content/build-glasshouse-release.php'), $source, $destination, '--authoring']);
            $process->run();
            $this->assertFalse($process->isSuccessful());
            $this->assertFileDoesNotExist($destination);
        } finally {
            unlink($source);
        }
    }
}
