<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            $table->string('map_url')->nullable()->after('story');
        });

        Schema::table('zones', function (Blueprint $table) {
            if (Schema::hasColumn('zones', 'map_url')) {
                $table->dropColumn('map_url');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('zones', function (Blueprint $table) {
            $table->string('map_url')->nullable();
        });

        Schema::table('cases', function (Blueprint $table) {
            if (Schema::hasColumn('cases', 'map_url')) {
                $table->dropColumn('map_url');
            }
        });
    }
};