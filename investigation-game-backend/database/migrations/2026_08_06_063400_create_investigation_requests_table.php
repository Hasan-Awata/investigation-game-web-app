<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // The core procedural request
        Schema::create('investigation_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();
            $table->string('request_type'); // Maps to InvestigationRequestType enum
            
            // The resulting evidence they get if the DA/Judge approves the request
            $table->foreignId('unlocks_evidence_id')->constrained('evidences')->cascadeOnDelete();
            $table->timestamps();
        });

        // The pivot table storing the strict evidence IDs required to get approval
        Schema::create('investigation_request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('investigation_requests')->cascadeOnDelete();
            $table->foreignId('evidence_id')->constrained('evidences')->cascadeOnDelete();
            
            // A request cannot require the exact same piece of evidence twice
            $table->unique(['request_id', 'evidence_id']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('investigation_request_items');
        Schema::dropIfExists('investigation_requests');
    }
};