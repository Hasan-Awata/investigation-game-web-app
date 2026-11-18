<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasAttempts = Schema::hasTable('room_submission_attempts');
        $appliedMigrations = DB::table(config('database.migrations.table'))->pluck('migration');
        // The earlier evidence migration identifies databases installed before this baseline.
        $hasPriorBaseline = $appliedMigrations->contains(fn (string $name): bool => str_starts_with($name, '2026_08_02_065959_'));
        $completedTrustUpgrade = $appliedMigrations->contains(fn (string $name): bool => str_starts_with($name, '2026_11_18_000000_'));

        if (! Schema::hasColumn('game_rooms', 'management_trust') || ($hasPriorBaseline && (! $completedTrustUpgrade || ! $hasAttempts))) {
            throw new LogicException('Complete the Management Trust migration on the previous release before upgrading to this release.');
        }

        if ($hasAttempts) {
            return;
        }

        Schema::create('room_submission_attempts', function (Blueprint $table): void {
            $table->foreignId('room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('action', 16);
            $table->uuid('attempt_id');
            $table->char('payload_hash', 64);
            $table->json('result');
            $table->primary(['room_id', 'user_id', 'action', 'attempt_id']);
        });
    }

    public function down(): void
    {
        throw new LogicException('Restore a pre-deployment backup to roll back the Management Trust schema.');
    }
};
