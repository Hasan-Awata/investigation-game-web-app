<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\GameCase;
use App\Models\Level;
use App\Models\Evidence;
use App\Models\Question;
use App\Models\Choice;
use App\Enums\EvidenceType;

class GameCaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create the Parent Case
        $case = GameCase::create([
            'title' => 'The Midnight Broadcast',
            'story' => "Late-night radio host Julian Vance was found dead in his soundproof studio booth during a live midnight broadcast. The studio door was bolted from the inside, the mixing board was still looping his final track, and the authorities initially ruled it a sudden medical emergency. But a closer look at the station's logs reveals someone altered the audio automation timer minutes before he died.",
            'min_player_XP' => 0,
            'XP_on_solve' => 250,
        ]);

        // 2. Create Level 1: The Scene of the Crime
        $level1 = Level::create([
            'case_id' => $case->id,
            'title' => 'Phase 1: The Locked Booth',
            'details' => 'Establish how the intruder accessed the sealed studio and determine the exact time of death.',
            'order_index' => 1,
        ]);

        $level2 = Level::create([
            'case_id' => $case->id,
            'title' => 'Phase 2: The Digital Loop',
            'details' => 'Unmask the accomplice who manipulated the broadcast automation system to cover up the timing of the murder.',
            'order_index' => 2,
        ]);

        // EVIDENCE 1: Document Variant
        Evidence::create([
            'level_id' => $level1->id,
            'title' => 'Station Floor Plan & Keycard Access #102',
            'description' => 'Key card logs',
            'evidence_type' => EvidenceType::Document,
            'paragraph' => 'wide-angle view of the master studio. The main access door is deadbolted from the inside. A half-empty coffee mug sits on the mixing desk, and the emergency studio exit window facing the alley is cracked open three inches.',
        ]);

        // EVIDENCE 2: Testimony Variant
        Evidence::create([
            'level_id' => $level1->id,
            'title' => 'Janitor Testimony',
            'description' => 'Statement from the night shift janitor.',
            'evidence_type' => EvidenceType::Testimony,
            'paragraph' => 'I heard a loud crash around 11:30 PM. I didn\'t see anyone in the hallway, but the back door to the alley was propped open.',
        ]);

        // EVIDENCE 3: Audio Variant
        Evidence::create([
            'level_id' => $level1->id,
            'title' => 'Voicemail, 11:47 PM',
            'description' => 'Recovered from the victim\'s answering machine.',
            'evidence_type' => EvidenceType::Audio,
            'audio_url' => '/assets/audio/voicemail-1.mp3',
        ]);

        // EVIDENCE 4: Image Variant
        Evidence::create([
            'level_id' => $level1->id,
            'title' => 'Studio Overview',
            'description' => 'A wide-angle view of the master studio. The main access door is deadbolted from the inside. A half-empty coffee mug sits on the mixing desk, and the emergency studio exit window facing the alley is cracked open three inches.',
            'evidence_type' => EvidenceType::Image,
            'img_url' => '/assets/cases/latch-detail.jpg',
        ]);

        // EVIDENCE 5: Forensic Variant
        Evidence::create([
            'level_id' => $level1->id,
            'title' => 'Coroner\'s Preliminary Log',
            'description' => 'The preliminary coroner\'s report on the victim\'s body.',
            'evidence_type' => EvidenceType::Forensic,
            'paragraph' => 'The coroner\'s report indicates that the victim died from an acute potassium chloride injection, with a puncture wound found on his left wrist, obscured by a heavy wristwatch.',
        ]);

        // 3. Create the Assessment/Puzzle for Level 1
        $question1 = Question::create([
            'level_id' => $level1->id,
            'text' => 'Given that the door was bolted from the inside and no keycards were logged after 11:00 PM, how did the perpetrator exit or enter the room without leaving an electronic footprint?',
            'msg_when_wrong' => 'Check the physical state of the room relative to the keycard logs. Is there another physical entry point?',
        ]);

        Choice::create(['question_id' => $question1->id, 'text' => 'They used a cloned administrator master keycard at the main door', 'is_correct' => false]);
        Choice::create(['question_id' => $question1->id, 'text' => 'They slipped through the cracked emergency alley window after tampering with the latch.', 'is_correct' => true]);
        Choice::create(['question_id' => $question1->id, 'text' => 'They hid inside the soundproofing panels until the morning shift arrived.', 'is_correct' => false]);
        Choice::create(['question_id' => $question1->id, 'text' => 'They poisoned Julian remotely through the building\'s central air ventilation system.', 'is_correct' => false]);

        $question2 = Question::create([
            'level_id' => $level1->id,
            'text' => 'According to the coroner\'s report, what physical detail contradicts the idea that Julian died of natural causes while alone?',
            'msg_when_wrong' => 'Look closer at the physical body inspection details rather than the room surroundings.',
        ]);

        Choice::create(['question_id' => $question2->id, 'text' => 'A hidden needle puncture wound on his left wrist beneath his heavy watch.', 'is_correct' => true]);
        Choice::create(['question_id' => $question2->id, 'text' => 'The cold temperature inside the soundproof booth.', 'is_correct' => false]);
        Choice::create(['question_id' => $question2->id, 'text' => 'The fact that his coffee mug contained traces of a rare sedative.', 'is_correct' => false]);
        Choice::create(['question_id' => $question2->id, 'text' => 'The broken glass found scattered underneath the mixing board desk.', 'is_correct' => false]);


        // 3. Create the Assessment/Puzzle for Level 2
        $question3 = Question::create([
            'level_id' => $level2->id,
            'text' => 'Terminal B was used to override the broadcast at 11:58 PM. Which staff member\'s alibi falls apart when cross-referenced with the building\'s physical timeline and terminal location?',
            'msg_when_wrong' => 'Examine the timing of Sarah\'s trip to the store versus when Terminal B was accessed.',
        ]);

        Choice::create(['question_id' => $question3->id, 'text' => 'Mark, because payroll accounts can only be accessed from home via a secure VPN.', 'is_correct' => false]);
        Choice::create(['question_id' => $question3->id, 'text' => 'David, because security guards are required to stay near the main entrance monitors.', 'is_correct' => false]);
        Choice::create(['question_id' => $question3->id, 'text' => 'Sarah, because her claim of being out of the building during the midnight override contradicts the active terminal timestamp.', 'is_correct' => true]);
        Choice::create(['question_id' => $question3->id, 'text' => 'None of them, as all electronic timestamps match their physical statements perfectly.', 'is_correct' => false]);
    }
}