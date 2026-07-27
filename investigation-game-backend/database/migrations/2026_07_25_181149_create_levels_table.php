<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();
            $table->string('title');
            $table->text('details');
            $table->integer('order_index');
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('levels');
    }
};
