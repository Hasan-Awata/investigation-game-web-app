<?php

namespace App\Http\Controllers;

use App\Models\GameCase;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CaseController extends Controller
{
    /**
     * Return a list of all playable cases, ordered by their creation date.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $cases = GameCase::select('id', 'title', 'story', 'min_player_XP', 'XP_on_solve')
            ->withExists([
                'users as is_solved' => function ($query) use ($userId) {
                    $query->where('case_user.user_id', $userId)
                          ->where('case_user.status', 'solved');
                }
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'cases' => $cases
        ], 200);
    }
}