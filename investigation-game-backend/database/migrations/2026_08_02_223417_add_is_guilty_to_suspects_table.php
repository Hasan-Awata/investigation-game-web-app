<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('suspects', function (Blueprint $table) {
            $table->boolean('is_guilty')->default(false)->after('is_initial');
        });
    }

    public function down(): void {
        Schema::table('suspects', function (Blueprint $table) {
            $table->dropColumn('is_guilty');
        });
    }
};