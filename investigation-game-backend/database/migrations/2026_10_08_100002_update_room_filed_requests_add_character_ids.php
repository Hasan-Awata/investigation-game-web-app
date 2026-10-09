<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('room_filed_requests', function (Blueprint $table) {
            $table->json('character_ids')->nullable()->after('evidence_ids');
        });
    }

    public function down(): void {
        Schema::table('room_filed_requests', function (Blueprint $table) {
            $table->dropColumn('character_ids');
        });
    }
};
