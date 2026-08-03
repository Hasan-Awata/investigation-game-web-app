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

        $cases = GameCase::select(
            'id', 'title', 'story', 'min_player_XP', 'XP_on_solve', 'img_url', 'max_strikes',
            'rating_stars', 'age_rating', 'estimated_playtime', 'difficulty', 'tags', 'author_name'
        )
            ->with([
                'users' => function ($query) use ($userId) {
                    $query->where('users.id', $userId)->select('users.id', 'case_user.status');
                },
                // Eager load any active rooms where this user is participating
                'rooms' => function ($query) use ($userId) {
                    $query->where('status', 'active')
                          ->where(function ($q) use ($userId) {
                              $q->where('host_user_id', $userId)
                                ->orWhereHas('users', function ($q2) use ($userId) {
                                    $q2->where('user_id', $userId);
                                });
                          })->orderBy('created_at', 'desc');
                }
            ])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($case) {
                // Map the narrative completion status
                $case->user_status = $case->users->first()?->pivot->status;
                
                // Map the active session invite code if one exists
                $case->active_room_invite_code = $case->rooms->first()?->invite_code;
                
                unset($case->users); 
                unset($case->rooms); 
                return $case;
            });

        return response()->json([
            'cases' => $cases,
            'user' => $request->user()->only(['id', 'username', 'name', 'email', 'XP', 'is_admin'])
        ], 200);
    }
}