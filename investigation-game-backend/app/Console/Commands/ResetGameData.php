<?php

namespace App\Console\Commands;

use App\Models\GameCase;
use App\Models\User;
use App\Services\MediaService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ResetGameData extends Command
{
    protected $signature = 'app:reset-game-data {--confirm= : Must exactly match the active database name}';
    protected $description = 'Remove application game data and non-admin accounts while retaining admin accounts.';

    public function handle(MediaService $mediaService): int
    {
        $databaseName = DB::connection()->getDatabaseName();
        if (!$databaseName || $this->option('confirm') !== $databaseName) {
            $this->error('No data was removed. Pass --confirm with the exact active database name to proceed.');
            return self::FAILURE;
        }

        $cases = GameCase::query()->with(['evidences', 'zones.levels.questions', 'characters'])->get();
        $mediaUrls = [];
        $blockMetadata = [];
        foreach ($cases as $case) {
            $mediaUrls[] = $case->getRawOriginal('img_url');
            foreach ($case->evidences as $evidence) {
                $mediaUrls[] = $evidence->getRawOriginal('img_url');
                $mediaUrls[] = $evidence->getRawOriginal('audio_url');
                $blockMetadata[] = $evidence->metadata;
            }
            foreach ($case->zones->flatMap->levels as $level) {
                $mediaUrls[] = $level->getRawOriginal('img_url');
                foreach ($level->questions as $question) $mediaUrls[] = $question->getRawOriginal('img_url');
            }
            foreach ($case->characters as $character) $mediaUrls[] = $character->getRawOriginal('img_url');
        }

        DB::transaction(function (): void {
            GameCase::query()->delete();
            User::query()->where('is_admin', '!=', true)->orWhereNull('is_admin')->delete();
            User::query()->where('is_admin', true)->update(['remember_token' => null]);
            if (Schema::hasTable('personal_access_tokens')) DB::table('personal_access_tokens')->delete();
            if (Schema::hasTable('sessions')) DB::table('sessions')->delete();
            if (Schema::hasTable('password_reset_tokens')) DB::table('password_reset_tokens')->delete();
        });

        foreach ($mediaUrls as $url) $mediaService->delete(is_string($url) ? $url : null);
        foreach ($blockMetadata as $metadata) $mediaService->cleanupOrphanedBlockImages($metadata, null);

        $this->info('Game data, non-admin accounts, sessions, and tokens were cleared. Admin accounts were retained.');
        return self::SUCCESS;
    }
}
