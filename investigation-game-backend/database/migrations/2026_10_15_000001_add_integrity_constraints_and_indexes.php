<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table("room_votes", function (Blueprint $table) {
            $table->unique(["room_id", "user_id", "question_id"], "room_votes_user_question_unique");
            $table->index(["room_id", "question_id"]);
        });

        Schema::table("room_users", function (Blueprint $table) {
            $table->unique(["room_id", "user_id"]);
        });

        Schema::table("room_evidences", function (Blueprint $table) {
            $table->unique(["room_id", "evidence_id"]);
        });

        Schema::table("room_completed_levels", function (Blueprint $table) {
            $table->unique(["room_id", "level_id"]);
        });

        Schema::table("room_unlocked_levels", function (Blueprint $table) {
            $table->unique(["room_id", "level_id"]);
        });

        Schema::table("case_user", function (Blueprint $table) {
            $table->unique(["case_id", "user_id"]);
        });

        Schema::table("game_rooms", function (Blueprint $table) {
            $table->index(["status", "case_id"]);
        });

        Schema::table("cases", function (Blueprint $table) {
            $table->index("is_published");
        });

        // FK hardening. Cross-boundary guards only: SET NULL / CASCADE are the
        // only safe actions for FKs that live inside the case's own cascade
        // tree — RESTRICT there makes whole-case deletion (re-import replace,
        // AdminCaseController::destroy) impossible because SQLite/InnoDB
        // checks the restrict edge before the cascading parent rows die.
        Schema::table("investigation_requests", function (Blueprint $table) {
            try {
                $table->dropForeign(["unlocks_evidence_id"]);
            } catch (Throwable $e) {
            }
            $table->foreign("unlocks_evidence_id")
                ->references("id")
                ->on("evidences")
                ->nullOnDelete();
        });

        // Idempotency key for filed procedural requests (#6): one filing per
        // (room, submitted item-combination) enforced at the storage layer.
        Schema::table("room_filed_requests", function (Blueprint $table) {
            $table->string("signature", 64)->after("room_id");
            $table->unique(["room_id", "signature"], "room_filed_requests_room_signature_unique");
        });

        // Audit trail for who burned a wiretap intercept (#5 residual).
        Schema::table("room_played_wiretaps", function (Blueprint $table) {
            $table->foreignId("played_by")
                ->nullable()
                ->after("question_id")
                ->constrained("users")
                ->nullOnDelete();
        });

        Schema::table("room_investigation_requests", function (Blueprint $table) {
            try {
                $table->dropForeign(["request_id"]);
            } catch (Throwable $e) {
            }
            $table->foreign("request_id")
                ->references("id")
                ->on("investigation_requests")
                ->cascadeOnDelete();
        });

        Schema::table("levels", function (Blueprint $table) {
            try {
                $table->dropForeign(["required_request_id"]);
            } catch (Throwable $e) {
            }
            $table->foreign("required_request_id")
                ->references("id")
                ->on("investigation_requests")
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table("levels", function (Blueprint $table) {
            try {
                $table->dropForeign(["required_request_id"]);
            } catch (Throwable $e) {
            }
            $table->foreign("required_request_id")
                ->references("id")
                ->on("investigation_requests")
                ->nullOnDelete();
        });

        Schema::table("room_investigation_requests", function (Blueprint $table) {
            try {
                $table->dropForeign(["request_id"]);
            } catch (Throwable $e) {
            }
            $table->foreign("request_id")
                ->references("id")
                ->on("investigation_requests")
                ->cascadeOnDelete();
        });

        Schema::table("room_played_wiretaps", function (Blueprint $table) {
            try {
                $table->dropForeign(["played_by"]);
            } catch (Throwable $e) {
            }
            $table->dropColumn("played_by");
        });

        Schema::table("room_filed_requests", function (Blueprint $table) {
            try {
                $table->dropUnique("room_filed_requests_room_signature_unique");
            } catch (Throwable $e) {
            }
            try {
                $table->dropColumn("signature");
            } catch (Throwable $e) {
            }
        });

        Schema::table("investigation_requests", function (Blueprint $table) {
            try {
                $table->dropForeign(["unlocks_evidence_id"]);
            } catch (Throwable $e) {
            }
            $table->foreign("unlocks_evidence_id")
                ->references("id")
                ->on("evidences")
                ->nullOnDelete();
        });

        Schema::table("cases", function (Blueprint $table) {
            try { $table->dropIndex(["is_published"]); } catch (Throwable $e) {}
        });
        Schema::table("game_rooms", function (Blueprint $table) {
            try { $table->dropIndex(["status", "case_id"]); } catch (Throwable $e) {}
        });
        Schema::table("case_user", function (Blueprint $table) {
            try { $table->dropUnique(["case_id", "user_id"]); } catch (Throwable $e) {}
        });
        Schema::table("room_unlocked_levels", function (Blueprint $table) {
            try { $table->dropUnique(["room_id", "level_id"]); } catch (Throwable $e) {}
        });
        Schema::table("room_completed_levels", function (Blueprint $table) {
            try { $table->dropUnique(["room_id", "level_id"]); } catch (Throwable $e) {}
        });
        Schema::table("room_evidences", function (Blueprint $table) {
            try { $table->dropUnique(["room_id", "evidence_id"]); } catch (Throwable $e) {}
        });
        Schema::table("room_users", function (Blueprint $table) {
            try { $table->dropUnique(["room_id", "user_id"]); } catch (Throwable $e) {}
        });
        Schema::table("room_votes", function (Blueprint $table) {
            try { $table->dropUnique("room_votes_user_question_unique"); } catch (Throwable $e) {}
            try { $table->dropIndex(["room_id", "question_id"]); } catch (Throwable $e) {}
        });
    }
};

