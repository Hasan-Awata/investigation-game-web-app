<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('evidences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('level_id')->constrained('levels')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('evidence_type');
            $table->string('audio_url')->nullable();
            $table->string('img_url')->nullable();
            $table->text('paragraph')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('evidences');
    }
};
