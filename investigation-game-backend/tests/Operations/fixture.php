<?php

declare(strict_types=1);

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->useStoragePath(getenv('OPS_ROOT').'/storage');
$app->usePublicPath(getenv('OPS_ROOT').'/public');
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\GameCase;
use App\Models\GameRoom;
use App\Models\User;
use App\Models\Zone;
use App\Services\GameRoomService;
use App\Services\EncounterGroupService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

$mode = $argv[1];
if ($mode === 'init') {
    Artisan::call('migrate', ['--force' => true]);
    $player = User::factory()->create(['username' => 'ops_player', 'email' => 'ops@example.test']);
    $case = GameCase::create(['title' => 'Operations fixture', 'story' => 'Synthetic', 'is_published' => true, 'XP_on_solve' => 10]);
    $zone = Zone::create(['case_id' => $case->id, 'title' => 'Zone', 'order_index' => 1]);
    $level = $zone->levels()->create(['title' => 'Interview', 'details' => 'Synthetic', 'is_initial' => true, 'order_index' => 1, 'presentation_type' => 'interrogation']);
    $first = $level->questions()->create(['text' => 'First', 'order_index' => 1]);
    $next = $level->questions()->create(['text' => 'Next', 'order_index' => 2]);
    $first->choices()->create(['text' => 'Continue', 'outcomes' => ['next_question_id' => $next->id]]);
    $next->choices()->create(['text' => 'Finish', 'outcomes' => []]);
    $room = app(GameRoomService::class)->createRoom($case, $player)->value;
    app(EncounterGroupService::class)->start($room, $level, $player);
    mkdir(public_path('assets/cases'), 0770, true);
    file_put_contents(public_path('assets/cases/proof.txt'), 'synthetic evidence');
    $evidence = \App\Models\Evidence::create(['case_id' => $case->id, 'title' => 'Proof', 'evidence_type' => 'document', 'img_url' => '/assets/cases/proof.txt', 'is_initial' => true]);
    $room->unlockedEvidences()->attach($evidence->id);
} elseif ($mode === 'vote') {
    $group = \App\Models\EncounterGroup::firstOrFail();
    $question = \App\Models\Question::findOrFail($group->current_question_id);
    $result = app(EncounterGroupService::class)->vote(GameRoom::firstOrFail(), $question, $question->choices()->firstOrFail()->id, User::firstOrFail());
    if ($result->isFailure()) { throw new RuntimeException('Synthetic vote failed'); }
} elseif ($mode === 'duplicate') {
    $resolution = DB::table('room_question_resolutions')->first();
    \App\Jobs\FinalizeEncounterQuestion::dispatch($resolution->encounter_group_id, $resolution->question_id, now()->subSeconds(10)->toISOString());
} elseif ($mode === 'snapshot') {
    echo json_encode(['resolutions' => DB::table('room_question_resolutions')->count(), 'jobs' => DB::table('jobs')->count(), 'failed' => DB::table('failed_jobs')->count(), 'completed' => DB::table('room_completed_levels')->count()]);
} elseif ($mode === 'cache') {
    $limiter = new \Illuminate\Cache\RateLimiter(\Illuminate\Support\Facades\Cache::store('database'));
    $limiter->hit('operations-auth-budget', 60);
    echo $limiter->attempts('operations-auth-budget');
} elseif ($mode === 'login') {
    $request = \Illuminate\Http\Request::create('/api/login', 'POST', ['email' => 'ops@example.test', 'password' => 'incorrect'], [], [], ['HTTP_ACCEPT' => 'application/json', 'REMOTE_ADDR' => '192.0.2.80']);
    echo $app->make(\Illuminate\Contracts\Http\Kernel::class)->handle($request)->getStatusCode();
} elseif ($mode === 'resume') {
    $player = User::firstOrFail();
    $token = $player->createToken('restore')->plainTextToken;
    $request = \Illuminate\Http\Request::create('/api/rooms/'.GameRoom::firstOrFail()->id, 'GET', [], [], [], ['HTTP_ACCEPT' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer '.$token]);
    $response = $app->make(\Illuminate\Contracts\Http\Kernel::class)->handle($request);
    if ($response->getStatusCode() !== 200 || !str_contains($response->getContent(), 'Proof') || file_get_contents(public_path('assets/cases/proof.txt')) !== 'synthetic evidence') { throw new RuntimeException('Restore not playable'); }
    echo 'resumed';
} elseif ($mode === 'failed') {
    DB::table('failed_jobs')->insert(['uuid' => 'synthetic-failure', 'connection' => 'database', 'queue' => 'ops', 'payload' => '{}', 'exception' => 'Synthetic failure', 'failed_at' => now()]);
} elseif ($mode === 'clear-failed') {
    DB::table('failed_jobs')->delete();
} else {
    throw new InvalidArgumentException('Unknown fixture operation');
}
