<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('cases', function (Blueprint $table) {
            $table->decimal('rating_stars', 3, 1)->default(5.0)->after('max_strikes');
            $table->string('age_rating')->default('Unrated')->after('rating_stars');
            $table->string('estimated_playtime')->nullable()->after('age_rating');
            $table->string('difficulty')->default('Standard')->after('estimated_playtime');
            $table->json('tags')->nullable()->after('difficulty');
            $table->string('author_name')->default('System')->after('tags');
        });
    }

    public function down(): void {
        Schema::table('cases', function (Blueprint $table) {
            $table->dropColumn(['rating_stars', 'age_rating', 'estimated_playtime', 'difficulty', 'tags', 'author_name']);
        });
    }
};