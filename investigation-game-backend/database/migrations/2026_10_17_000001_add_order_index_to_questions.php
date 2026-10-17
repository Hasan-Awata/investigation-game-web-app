<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->integer('order_index')->default(0)->after('level_id');
            $table->index(['level_id', 'order_index'], 'questions_level_order_index_idx');
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropIndex('questions_level_order_index_idx');
            $table->dropColumn('order_index');
        });
    }
};
