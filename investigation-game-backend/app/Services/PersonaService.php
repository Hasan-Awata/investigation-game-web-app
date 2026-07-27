<?php

namespace App\Services;

use App\Models\GameRoom;
use App\Models\User;
use App\Models\Choice;
use App\Models\Question;
use App\Support\Result;
use App\Events\PersonaHintTriggered;

class PersonaService
{
    public function __construct(private readonly VotingService $votingService) {}

    /**
     * Evaluate the team's current consensus, find a flawed verdict, and broadcast the hint.
     */
    public function generateHint(GameRoom $room, User $user): Result
    {
        // 1. Authorization Gate: Ensure the requester is the Host
        if ($room->host_user_id !== $user->id) {
            return Result::failure("Unauthorized: Only the Host can consult the Persona.");
        }

        // 2. Fetch the current consensus to find where they went wrong
        $levelId = $room->current_level_id;
        $consensus = $this->votingService->calculateLevelConsensus($room, $levelId);
        
        $questionsCount = $room->currentLevel->questions()->count();
        if (count($consensus) !== $questionsCount) {
            return Result::failure("All verdicts must be locked in before the Persona can analyze the theory.");
        }

        $flawedQuestion = null;

        foreach ($consensus as $questionId => $choiceId) {
            $isCorrect = Choice::where('id', $choiceId)->value('is_correct');
            
            if (!$isCorrect) {
                $flawedQuestion = Question::find($questionId);
                break; // Stop at the first incorrect answer to give them a focused hint
            }
        }

        if (!$flawedQuestion) {
            return Result::failure("The current theory is completely correct. No hint is needed, submit your verdicts.");
        }

        // 3. Extract the hint and broadcast it
        $hintMessage = $flawedQuestion->msg_when_wrong ?? "Re-evaluate the evidence thoroughly.";
        
        PersonaHintTriggered::dispatch($room, $hintMessage);

        return Result::success(['hint' => $hintMessage]);
    }
}