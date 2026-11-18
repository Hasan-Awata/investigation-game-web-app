<?php

use App\Support\Case\LegacyStrikePenalty;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_rooms', function (Blueprint $table): void {
            $table->unsignedTinyInteger('management_trust')->nullable()->default(100);
        });

        Schema::create('room_submission_attempts', function (Blueprint $table): void {
            $table->foreignId('room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('action', 16);
            $table->uuid('attempt_id');
            $table->char('payload_hash', 64);
            $table->json('result');
            $table->primary(['room_id', 'user_id', 'action', 'attempt_id']);
        });

        DB::table('game_rooms')->where('status', '!=', 'active')->update(['management_trust' => null]);
        DB::table('choices')
            ->join('questions', 'questions.id', '=', 'choices.question_id')
            ->join('levels', 'levels.id', '=', 'questions.level_id')
            ->join('zones', 'zones.id', '=', 'levels.zone_id')
            ->join('cases', 'cases.id', '=', 'zones.case_id')
            ->whereNotNull('choices.outcomes')
            ->select('choices.id', 'choices.outcomes', 'cases.max_strikes', 'levels.presentation_type')
            ->chunkById(500, function ($choices): void {
                foreach ($choices as $choice) {
                    $outcomes = json_decode($choice->outcomes, true, flags: JSON_THROW_ON_ERROR);
                    if (! is_array($outcomes) || ! array_key_exists('gives_strike', $outcomes)) {
                        continue;
                    }

                    $converted = LegacyStrikePenalty::convert($outcomes, (int) $choice->max_strikes, $choice->presentation_type === 'location');
                    DB::table('choices')->where('id', $choice->id)->update([
                        'outcomes' => $converted === [] ? null : json_encode($converted, JSON_THROW_ON_ERROR),
                    ]);
                }
            }, 'choices.id', 'id');

        DB::table('case_user')->where('status', 'failed_strikes')->update(['status' => 'failed_trust']);

        Schema::table('game_rooms', fn (Blueprint $table) => $table->dropColumn('strikes'));
        Schema::table('cases', fn (Blueprint $table) => $table->dropColumn('max_strikes'));
    }

    public function down(): void
    {
        throw new LogicException('Restore the pre-migration backup to recover the original strike limits and counts.');
    }
};
