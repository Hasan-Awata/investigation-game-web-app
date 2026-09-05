<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('phases', function (Blueprint $table) {
            $table->string('map_url')->nullable();
            $table->decimal('coord_x', 5, 2)->nullable();
            $table->decimal('coord_y', 5, 2)->nullable();
        });
    }

    public function down()
    {
        Schema::table('phases', function (Blueprint $table) {
            $table->dropColumn(['map_url', 'coord_x', 'coord_y']);
        });
    }
};
