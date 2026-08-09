<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levels', function (Blueprint $table) {
            $table->dropColumn('required_request_type');
            $table->foreignId('required_request_id')
                  ->nullable()
                  ->after('presentation_type')
                  ->constrained('investigation_requests')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('levels', function (Blueprint $table) {
            $table->dropForeign(['required_request_id']);
            $table->dropColumn('required_request_id');
            $table->string('required_request_type')->nullable()->after('presentation_type');
        });
    }
};