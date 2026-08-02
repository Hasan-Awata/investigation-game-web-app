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
    public function run(): void
    {
        // 1. Create the Parent Case
        $case = GameCase::create([
            'title' => 'Suspended Hostility',
            'story' => "Elias Vance, the visionary managing partner of Vance & Thorne Architectural, was found dead in his 40th-floor corner office at 6:00 AM this morning. The cause of death: hanging. The office door was bolted from the inside, and the precinct detectives, eager to close their shift, ruled it a tragic suicide.\n\nBut the DA's office isn't buying it. Vance was 48 hours away from a massive hostile takeover that would have ousted his co-founder, Marcus Thorne. You and your unit have been brought in to review the file. You have three strikes before the DA pulls your mandate and closes the case for good. Dig into the forensics. Cross-reference the timeline. Democracy is your tool, but truth is your only objective. Find out who really tied that knot.",
            'min_player_XP' => 0,
            'XP_on_solve' => 500,
            'max_strikes' => 3,
        ]);

        // 2. Create the Non-Linear Phases (Levels)
        $phase1 = Level::create([
            'case_id' => $case->id,
            'title' => 'The Locked Room',
            'details' => 'Establish how the killer executed the victim and escaped the bolted 40th-floor office without triggering the electronic security locks.',
            'order_index' => 1,
            'is_initial' => true,
        ]);

        $phase2 = Level::create([
            'case_id' => $case->id,
            'title' => 'The Corporate Motive',
            'details' => 'Cross-reference Marcus Thorne\'s rock-solid alibi with the timeline of the murder.',
            'order_index' => 2,
            'is_initial' => true,
        ]);

        $phase3 = Level::create([
            'case_id' => $case->id,
            'title' => 'The Fixer',
            'details' => 'Identify the external contractor Thorne hired to execute the hit.',
            'order_index' => 3,
            'is_initial' => false, // Hidden until unlocked
        ]);

        // 3. Create Case Evidence
        $evidence1 = Evidence::create([
            'case_id' => $case->id,
            'is_initial' => true,
            'title' => 'Security Keycard Logs',
            'description' => '40th-floor access records for the night of the murder.',
            'evidence_type' => EvidenceType::Document,
            'paragraph' => "21:00 - Elias Vance (Master Access)\n23:30 - Maintenance/Janitorial Staff (Temp Access)\n\n*No other entries or exits recorded on the 40th floor until morning discovery.*",
        ]);

        $evidence2 = Evidence::create([
            'case_id' => $case->id,
            'is_initial' => true,
            'title' => 'Coroner\'s Preliminary Report',
            'description' => 'Initial physical autopsy findings.',
            'evidence_type' => EvidenceType::Forensic,
            'paragraph' => "Lividity and rigor mortis indicate time of death at approximately 02:00 AM. \n\n**ANOMALY DETECTED:** A faint, secondary ligature mark is present around the circumference of the neck, measuring 2mm in width. This contradicts the 1-inch thick industrial hemp rope found bearing the body's weight at the scene.",
        ]);

        $evidence3 = Evidence::create([
            'case_id' => $case->id,
            'is_initial' => true,
            'title' => 'Marcus Thorne\'s Statement',
            'description' => 'Official statement given to precinct detectives.',
            'evidence_type' => EvidenceType::Testimony,
            'paragraph' => "> \"Elias was a troubled man. The stress of the firm was getting to him. I was at the Mayor's Charity Gala at the Grand Hotel from 8:00 PM until the bar closed at 3:00 AM. You can check the society pages; I was photographed all night.\"",
        ]);

        $evidence4 = Evidence::create([
            'case_id' => $case->id,
            'is_initial' => false, // Hidden until unlocked in Phase 1
            'title' => 'HVAC Architecture Blueprint',
            'description' => 'Building schematics for the 40th-floor corner office.',
            'evidence_type' => EvidenceType::Image,
            'img_url' => '/assets/cases/hvac-blueprint.jpg', // Placeholder for actual assignment
        ]);

        // 4. Create Verdicts and Choices

        // PHASE 1 VERDICTS
        $p1q1 = Question::create([
            'level_id' => $phase1->id,
            'text' => 'The coroner noted a "secondary ligature mark" made by a thinner cord. What does this indicate?',
            'msg_when_wrong' => 'Look at the mechanics of the staging. A thick rope doesn\'t leave a razor-thin indentation.',
            'is_mandatory' => true,
        ]);
        Choice::create(['question_id' => $p1q1->id, 'text' => 'Vance attempted to hang himself twice with different materials.', 'is_correct' => false]);
        Choice::create(['question_id' => $p1q1->id, 'text' => 'Vance was garroted from behind with a wire, and the hanging was staged post-mortem using the thicker rope.', 'is_correct' => true]);
        Choice::create(['question_id' => $p1q1->id, 'text' => 'The rope frayed and dug into the skin during the struggle.', 'is_correct' => false]);

        $p1q2 = Question::create([
            'level_id' => $phase1->id,
            'text' => 'How did the killer exit the 40th-floor corner office while leaving the heavy deadbolt locked from the inside?',
            'msg_when_wrong' => 'The door was physically bolted, not electronically locked. Think about architectural vulnerabilities.',
            'is_mandatory' => true,
        ]);
        Choice::create(['question_id' => $p1q2->id, 'text' => 'They cloned Vance\'s keycard and remotely triggered the deadbolt.', 'is_correct' => false]);
        Choice::create(['question_id' => $p1q2->id, 'text' => 'They scaled the exterior glass using the window-washing rig.', 'is_correct' => false]);
        Choice::create([
            'question_id' => $p1q2->id, 
            'text' => 'They bypassed the door entirely, utilizing the oversized HVAC return vent and resetting the grille from the inside.', 
            'is_correct' => true,
            'unlocks_evidence_id' => $evidence4->id // Unlocks the blueprint
        ]);

        // PHASE 2 VERDICTS
        $p2q1 = Question::create([
            'level_id' => $phase2->id,
            'text' => 'Marcus Thorne was photographed at a charity gala until 3:00 AM, but the murder occurred around 2:00 AM. How does this factor into the locked-room execution?',
            'msg_when_wrong' => 'A CEO doesn\'t crawl through air vents. Apply Occam\'s razor to his alibi.',
            'is_mandatory' => true,
        ]);
        Choice::create(['question_id' => $p2q1->id, 'text' => 'Thorne slipped out the back of the gala, committed the murder, and returned unnoticed.', 'is_correct' => false]);
        Choice::create([
            'question_id' => $p2q1->id, 
            'text' => 'Thorne\'s alibi is solid because he didn\'t physically commit the murder; he hired a professional \'fixer\' to bypass the security and stage the scene.', 
            'is_correct' => true,
            'unlocks_level_id' => $phase3->id // Unlocks Phase 3
        ]);
        Choice::create(['question_id' => $p2q1->id, 'text' => 'The coroner\'s estimated time of death was intentionally falsified by a bribed medical examiner.', 'is_correct' => false]);

        // PHASE 3 VERDICTS
        $p3q1 = Question::create([
            'level_id' => $phase3->id,
            'text' => 'Based on the HVAC blueprints and the required skill to cleanly stage the hanging, who is the external contractor Thorne hired?',
            'msg_when_wrong' => 'Review EX-001. Someone had legitimate access to the floor hours before the murder.',
            'is_mandatory' => true,
        ]);
        Choice::create(['question_id' => $p3q1->id, 'text' => 'The precinct detective who immediately ruled it a suicide.', 'is_correct' => false]);
        Choice::create(['question_id' => $p3q1->id, 'text' => 'The "Janitor" who badged in at 11:30 PM, whose employer is a shell company quietly owned by Thorne.', 'is_correct' => true]);
        Choice::create(['question_id' => $p3q1->id, 'text' => 'Vance\'s own executive assistant, who had master access to the floor.', 'is_correct' => false]);
    }
}