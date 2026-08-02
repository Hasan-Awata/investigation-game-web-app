<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('suspects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();
            $table->string('name');
            $table->text('background')->nullable();
            $table->string('img_url')->nullable();
            $table->boolean('is_initial')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('suspects');
    }
};