<?php

namespace App\Http\Controllers;

use App\Models\GameRoom;
use App\Services\PersonaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PersonaController extends Controller
{
    public function __construct(
        private readonly PersonaService $personaService
    ) {}

    /**
     * Trigger the Persona Hint system for the active room.
     */
    public function store(Request $request, GameRoom $room): JsonResponse
    {
        $user = $request->user();
        
        $result = $this->personaService->generateHint($room, $user);

        if ($result->isFailure()) {
            return response()->json([
                'error' => 'Hint Request Rejected',
                'message' => $result->errorMessage
            ], 400); 
        }

        return response()->json([
            'message' => 'The Persona has spoken. Hint broadcasted to all players.',
            'data' => $result->value
        ], 200);
    }
}