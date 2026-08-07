<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // 1. Create the new parent Phase table
        Schema::create('phases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('order_index');
            $table->timestamps();
        });

        // 2. Detach Levels from Cases and re-attach them to Phases
        Schema::table('levels', function (Blueprint $table) {
            $table->dropForeign(['case_id']); // Drops the MySQL foreign key constraint
            $table->dropColumn('case_id');    // Drops the column
            
            $table->foreignId('phase_id')->after('id')->constrained('phases')->cascadeOnDelete();
        });
    }

    public function down(): void {
        Schema::table('levels', function (Blueprint $table) {
            $table->dropForeign(['phase_id']);
            $table->dropColumn('phase_id');
            
            $table->foreignId('case_id')->after('id')->constrained('cases')->cascadeOnDelete();
        });
        Schema::dropIfExists('phases');
    }
};