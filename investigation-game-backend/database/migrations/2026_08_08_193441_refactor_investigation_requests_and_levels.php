<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // 1. Make the request unlocks totally flexible
        Schema::table('investigation_requests', function (Blueprint $table) {
            $table->foreignId('unlocks_evidence_id')->nullable()->change();
            $table->foreignId('unlocks_level_id')->nullable()->constrained('levels')->nullOnDelete()->after('unlocks_evidence_id');
        });

        // 2. Explicitly track which requests a room has completed
        Schema::create('room_investigation_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('request_id')->constrained('investigation_requests')->cascadeOnDelete();
            $table->timestamps();
            
            $table->unique(['room_id', 'request_id']);
        });

        // 3. Add the gatekeeper requirement to levels
        Schema::table('levels', function (Blueprint $table) {
            $table->string('required_request_type')->nullable()->after('presentation_type');
        });
    }

    public function down(): void {
        Schema::dropIfExists('room_investigation_requests');
        
        Schema::table('investigation_requests', function (Blueprint $table) {
            $table->dropForeign(['unlocks_level_id']);
            $table->dropColumn('unlocks_level_id');
        });

        Schema::table('levels', function (Blueprint $table) {
            $table->dropColumn('required_request_type');
        });
    }
};