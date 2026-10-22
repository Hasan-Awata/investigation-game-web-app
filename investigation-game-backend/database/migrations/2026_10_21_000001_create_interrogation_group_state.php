<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('encounter_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('level_id')->constrained('levels')->cascadeOnDelete();
            $table->foreignId('creator_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('active_room_id')->nullable()->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('active_level_id')->nullable()->constrained('levels')->cascadeOnDelete();
            $table->string('status')->default('active');
            $table->foreignId('current_question_id')->nullable()->constrained('questions')->nullOnDelete();
            $table->timestamp('finalizes_at')->nullable();
            $table->timestamp('roster_frozen_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('abandoned_at')->nullable();
            $table->timestamps();
            $table->index(['room_id', 'level_id', 'status']);
            $table->unique(['active_room_id', 'active_level_id'], 'one_active_group_per_room_level');
        });

        Schema::create('encounter_group_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('encounter_group_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('active_user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->timestamp('joined_at');
            $table->timestamp('left_at')->nullable();
            $table->timestamps();
            $table->index(['encounter_group_id', 'user_id', 'left_at']);
            $table->unique('active_user_id', 'one_active_encounter_per_user');
        });

        Schema::create('encounter_question_voters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('encounter_group_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('left_at')->nullable();
            $table->timestamps();
            $table->unique(['encounter_group_id', 'question_id', 'user_id'], 'group_question_voter_unique');
        });

        Schema::table('room_votes', function (Blueprint $table) {
            $table->foreignId('encounter_group_id')->nullable()->after('room_id')
                ->constrained('encounter_groups')->cascadeOnDelete();
            $table->unique(['encounter_group_id', 'question_id', 'user_id'], 'group_question_user_vote_unique');
        });

        Schema::create('room_question_resolutions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('level_id')->constrained('levels')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->foreignId('choice_id')->constrained('choices')->cascadeOnDelete();
            $table->foreignId('encounter_group_id')->constrained()->cascadeOnDelete();
            $table->timestamp('resolved_at');
            $table->timestamps();
            $table->unique(['room_id', 'level_id', 'question_id'], 'room_level_question_resolution_unique');
        });

        Schema::create('room_unlocked_location_points', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('choice_id')->constrained('choices')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['room_id', 'choice_id']);
        });

        Schema::table('game_rooms', function (Blueprint $table) {
            $table->dropConstrainedForeignId('current_level_id');
        });

        Schema::dropIfExists('room_played_wiretaps');
        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn('audio_url');
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->string('audio_url')->nullable();
        });
        Schema::create('room_played_wiretaps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['room_id', 'question_id']);
        });
        Schema::table('game_rooms', function (Blueprint $table) {
            $table->foreignId('current_level_id')->nullable()->constrained('levels')->nullOnDelete();
        });
        Schema::dropIfExists('room_unlocked_location_points');
        Schema::dropIfExists('room_question_resolutions');
        Schema::table('room_votes', function (Blueprint $table) {
            $table->dropUnique('group_question_user_vote_unique');
            $table->dropConstrainedForeignId('encounter_group_id');
        });
        Schema::dropIfExists('encounter_question_voters');
        Schema::dropIfExists('encounter_group_members');
        Schema::dropIfExists('encounter_groups');
    }
};
