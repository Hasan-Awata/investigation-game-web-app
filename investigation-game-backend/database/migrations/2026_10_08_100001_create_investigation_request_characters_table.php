<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // The pivot table storing the strict character IDs required for approval
        Schema::create('investigation_request_characters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('investigation_requests')->cascadeOnDelete();
            $table->foreignId('character_id')->constrained('characters')->cascadeOnDelete();
            $table->timestamps();

            // A request cannot require the exact same character twice
            $table->unique(['request_id', 'character_id']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('investigation_request_characters');
    }
};
