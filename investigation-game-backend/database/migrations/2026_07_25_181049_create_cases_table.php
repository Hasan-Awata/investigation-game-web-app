<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('cases', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('story');
            $table->integer('min_player_XP')->default(0);
            $table->integer('XP_on_solve');
            $table->timestamps(); 
        });
    }

    public function down(): void {
        Schema::dropIfExists('cases');
    }
};
