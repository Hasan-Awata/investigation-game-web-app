<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // Track visual point-and-click location sweeps
        Schema::create('room_inspections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('choice_id')->constrained('choices')->cascadeOnDelete();
            $table->boolean('is_dead_end')->default(false);
            $table->timestamps();
            
            // Prevent duplicate clicks on the same point from bloating the database
            $table->unique(['room_id', 'choice_id']);
        });

        // Track the permanent history of procedural requests sent to the DA
        Schema::create('room_filed_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->string('request_type');
            $table->json('evidence_ids');
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('room_filed_requests');
        Schema::dropIfExists('room_inspections');
    }
};