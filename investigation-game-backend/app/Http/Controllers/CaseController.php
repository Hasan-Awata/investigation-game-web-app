<?php

namespace App\Http\Controllers;

use App\Models\GameCase;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CaseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $cases = GameCase::select('id', 'title', 'story', 'min_player_XP', 'XP_on_solve', 'img_url')
            ->with(['users' => function ($query) use ($userId) {
                $query->where('users.id', $userId)->select('users.id');
            }])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($case) {
                $case->user_status = $case->users->first()?->pivot->status;
                unset($case->users); 
                return $case;
            });

        return response()->json([
            'cases' => $cases,
            // Strictly whitelist only the fields the frontend needs to render the UI
            'user' => $request->user()->only(['id', 'username', 'name', 'email', 'XP', 'is_admin'])
        ], 200);
    }
}