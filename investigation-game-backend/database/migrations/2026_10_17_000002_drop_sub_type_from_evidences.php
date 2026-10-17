<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasColumn('evidences', 'sub_type')) {
            return;
        }

        Schema::table('evidences', function (Blueprint $table) {
            $table->dropColumn('sub_type');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('evidences', 'sub_type')) {
            return;
        }

        Schema::table('evidences', function (Blueprint $table) {
            $table->string('sub_type')->nullable()->after('evidence_type');
        });
    }
};
