<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('levels', function (Blueprint $table) {
            $table->string('presentation_type')->default('standard')->after('is_initial');
        });
    }

    public function down(): void {
        Schema::table('levels', function (Blueprint $table) {
            $table->dropColumn('presentation_type');
        });
    }
};