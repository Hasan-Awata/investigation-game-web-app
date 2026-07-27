<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('game_rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();
            $table->foreignId('host_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('invite_code')->unique();
            $table->foreignId('current_level_id')->nullable()->constrained('levels')->nullOnDelete();
            $table->string('status')->default('active'); // e.g., active, failed, solved
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('game_rooms');
    }
};
