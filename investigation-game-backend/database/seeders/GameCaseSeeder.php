<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\GameCase;
use App\Models\Level;
use App\Models\Evidence;
use App\Models\Question;
use App\Models\Choice;
use App\Models\Suspect; // Added Suspect Model
use App\Enums\EvidenceType;

class GameCaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create the Parent Case
        $case = GameCase::create([
            'title' => 'Suspended Hostility',
            'story' => "Elias Vance, the visionary managing partner of Vance & Thorne Architectural, was found dead in his 40th-floor corner office at 6:00 AM this morning. The cause of death: hanging. The office door was bolted from the inside, and the precinct detectives, eager to close their shift, ruled it a tragic suicide.\n\nBut the DA's office isn't buying it. Vance was 48 hours away from a massive hostile takeover that would have ousted his co-founder, Marcus Thorne. You and your unit have been brought in to review the file. You have three strikes before the DA pulls your mandate and closes the case for good. Dig into the forensics. Cross-reference the timeline. Democracy is your tool, but truth is your only objective. Find out who really tied that knot.",            
            'min_player_XP' => 500, 
            'XP_on_solve' => 1000,
            'max_strikes' => 3,
            'rating_stars' => 4.8,
            'age_rating' => 'Mature (17+)',
            'estimated_playtime' => '45-60 Minutes',
            'difficulty' => 'Veteran',
            'tags' => ['Tactical', 'Choice-Driven Narrative', 'Corporate Espionage'],
            'author_name' => 'Agent MasterAdmin',
            'img_url' => '/assets/cases/Case-cover.png',
        ]);

        // 1.5 Create the Suspects Roster
        Suspect::create([
            'case_id' => $case->id,
            'name' => 'Marcus Thorne',
            'background' => 'Co-founder of Vance & Thorne Architectural. Currently orchestrating a hostile takeover of the firm to oust Vance. Alibi: Photographed at the Mayor\'s Charity Gala at the Grand Hotel from 8:00 PM to 3:00 AM.',
            'is_initial' => true,
            'is_guilty' => true, 
            'img_url' => '/assets/placeholder-mugshot.jpg',
        ]);

        Suspect::create([
            'case_id' => $case->id,
            'name' => 'Anton Varga (Night Maintenance)',
            'background' => 'Employed as a janitor by a shell company recently acquired by Thorne. Clocked into the 40th floor at 11:30 PM on the night of the murder. Has a prior military background specializing in infiltration.',
            'is_initial' => true,
            'is_guilty' => true, 
            'img_url' => '/assets/placeholder-mugshot.jpg',
        ]);

        Suspect::create([
            'case_id' => $case->id,
            'name' => 'Detective Ray Miller',
            'background' => 'First responder and lead precinct detective on the scene. Eagerly ruled the death a suicide within an hour of discovery. Internal Affairs suspects he may be receiving kickbacks from corporate entities.',
            'is_initial' => true,
            'is_guilty' => false, 
            'img_url' => '/assets/placeholder-mugshot.jpg',
        ]);

        Suspect::create([
            'case_id' => $case->id,
            'name' => 'Sarah Jenkins',
            'background' => 'Chief Legal Counsel for Vance & Thorne. She was helping Elias build a defense against the hostile takeover and had access to his secure communications regarding the Cayman Islands discrepancy.',
            'is_initial' => true,
            'is_guilty' => false,
            'img_url' => '/assets/placeholder-mugshot.jpg',
        ]);

        // 2. Create the Non-Linear Phases (Levels) - Now with 3 Initial Phases
        $phase1 = Level::create([
            'case_id' => $case->id,
            'title' => 'The Crime Scene',
            'details' => 'Investigate the spatial anomalies of the bolted 40th-floor office.',
            'order_index' => 1,
            'is_initial' => true,
            'img_url' => '/assets/cases/Level1.png',
        ]);
            
        $phase2 = Level::create([
            'case_id' => $case->id,
            'title' => 'The Autopsy',
            'details' => 'Review the coroner\'s findings and establish the true cause and time of death.',
            'order_index' => 2,
            'is_initial' => true,
            'img_url' => '/assets/cases/Level2.png',
        ]);
            
        $phase3 = Level::create([
            'case_id' => $case->id,
            'title' => 'The Corporate Motive',
            'details' => 'Cross-reference Marcus Thorne\'s rock-solid alibi with internal communications.',
            'order_index' => 3,
            'is_initial' => true,
            'img_url' => '/assets/cases/Level3.png',
        ]);

        $phase4 = Level::create([
            'case_id' => $case->id,
            'title' => 'The Fixer',
            'details' => 'Identify the external contractor Thorne hired to execute the hit.',
            'order_index' => 4,
            'is_initial' => false, // Hidden until unlocked
            'img_url' => '/assets/cases/Level4.png',
        ]);

        // 3. Create Case Evidence - Expanded to 5 Initial Pieces
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
            'paragraph' => "Lividity and rigor mortis indicate time of death at approximately 02:00 AM. \n\n**ANOMALY DETECTED:** A faint, secondary ligature mark is present around the circumference of the neck, measuring 2mm in width. This contradicts the 1-inch thick industrial hemp rope found bearing the body's weight at the scene. Tox screen reveals trace amounts of sedatives.",
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
            'is_initial' => true,
            'title' => 'Intercepted Internal Email',
            'description' => 'A partially recovered draft from Vance to his legal team.',
            'evidence_type' => EvidenceType::Document,
            'paragraph' => "If Marcus tries to push this buyout, I have the leverage to stop him. He doesn't know that I found the discrepancy in the `Cayman Islands offshore routing` accounts. I have the files backed up on a `physical drive hidden in my safe`. If I don't survive this week, look for the `black ledger`.",
        ]);

        $evidence5 = Evidence::create([
            'case_id' => $case->id,
            'is_initial' => true,
            'title' => 'Crime Scene Photo: Vance\'s Desk',
            'description' => 'Police photography of the immediate vicinity.',
            'evidence_type' => EvidenceType::Image,
            'img_url' => '/assets/cases/file_00000000153481f495d614d07aac0ad3.png',
        ]);

        // Hidden Evidence
        $evidence6 = Evidence::create([
            'case_id' => $case->id,
            'is_initial' => false, 
            'title' => 'HVAC Architecture Blueprint',
            'description' => 'Building schematics for the 40th-floor corner office.',
            'evidence_type' => EvidenceType::Image,
            'img_url' => '/assets/cases/file_000000003ce481f49d89f87c915a8097.png',
        ]);

        $evidence7 = Evidence::create([
            'case_id' => $case->id,
            'is_initial' => false, 
            'title' => 'Micro-Cassette (Recovered from Safe)',
            'description' => 'Chain of Custody: CSU drilled the wall safe behind the crooked painting per your unit\'s request. The safe was emptied by the killer, but this dictaphone tape was lodged in the back hinge.',
            'evidence_type' => EvidenceType::Audio,
            'audio_url' => '/assets/cases/drilling_sound.wav',
        ]);

        // 4. Create Verdicts and Choices

        // PHASE 1 VERDICTS (The Crime Scene)
        $p1q1 = Question::create([
            'level_id' => $phase1->id,
            'text' => 'How did the killer exit the 40th-floor corner office while leaving the heavy deadbolt locked from the inside?',
            'msg_when_wrong' => 'The door was physically bolted, not electronically locked. Think about architectural vulnerabilities.',
            'is_mandatory' => true,
        ]);
        Choice::create(['question_id' => $p1q1->id, 'text' => 'They cloned Vance\'s keycard and remotely triggered the deadbolt.', 'is_correct' => false]);
        Choice::create(['question_id' => $p1q1->id, 'text' => 'They scaled the exterior glass using the window-washing rig.', 'is_correct' => false]);
        Choice::create([
            'question_id' => $p1q1->id, 
            'text' => 'They bypassed the door entirely, utilizing the oversized HVAC return vent and resetting the grille from the inside.', 
            'is_correct' => true,
            'unlocks_evidence_id' => $evidence6->id // Unlocks the blueprint
        ]);

        // PHASE 2 VERDICTS (The Autopsy)
        $p2q1 = Question::create([
            'level_id' => $phase2->id,
            'text' => 'The coroner noted a "secondary ligature mark" made by a thinner cord, plus sedatives in the tox screen. What does this indicate?',
            'msg_when_wrong' => 'Look at the mechanics of the staging. A thick rope doesn\'t leave a razor-thin indentation, and a suicidal man doesn\'t drug himself first.',
            'is_mandatory' => true,
        ]);
        Choice::create(['question_id' => $p2q1->id, 'text' => 'Vance attempted to hang himself twice with different materials.', 'is_correct' => false]);
        Choice::create(['question_id' => $p2q1->id, 'text' => 'Vance was sedated and garroted from behind with a wire; the hanging was staged post-mortem using the thicker rope.', 'is_correct' => true]);

        // PHASE 3 VERDICTS (The Corporate Motive - Includes an Optional Side-Investigation)
        $p3q1 = Question::create([
            'level_id' => $phase3->id,
            'text' => 'Marcus Thorne was photographed at a charity gala until 3:00 AM, but the murder occurred around 2:00 AM. How does this factor into the execution?',
            'msg_when_wrong' => 'A CEO doesn\'t crawl through air vents. Apply Occam\'s razor to his alibi.',
            'is_mandatory' => true,
        ]);
        Choice::create([
            'question_id' => $p3q1->id, 
            'text' => 'Thorne\'s alibi is solid because he hired a professional \'fixer\' to bypass the security and stage the scene.', 
            'is_correct' => true,
            'unlocks_level_id' => $phase4->id // Unlocks Phase 4
        ]);
        Choice::create(['question_id' => $p3q1->id, 'text' => 'Thorne slipped out the back of the gala, committed the murder, and returned unnoticed.', 'is_correct' => false]);

        $p3q2 = Question::create([
            'level_id' => $phase3->id,
            'text' => '[OPTIONAL] The intercepted email mentions a "black ledger." Does the crime scene photo show any evidence of a search for this item?',
            'msg_when_wrong' => 'Look at the background of the photo, near the framed architectural awards. Something has been physically disturbed.',
            'is_mandatory' => false,
        ]);
        
        Choice::create([
            'question_id' => $p3q2->id, 
            'text' => 'The painting on the back wall is crooked. Dispatch Crime Scene Units (CSU) to sweep and crack the wall safe behind it.', 
            'is_correct' => true,
            'unlocks_evidence_id' => $evidence7->id // Now it makes logical sense why they get a tape
        ]);
        Choice::create([
            'question_id' => $p3q2->id, 
            'text' => 'No, the room appears completely undisturbed aside from the body.', 
            'is_correct' => false
        ]);

        // PHASE 4 VERDICTS (The Fixer - Hidden Phase)
        $p4q1 = Question::create([
            'level_id' => $phase4->id,
            'text' => 'Based on the HVAC blueprints and the required skill to cleanly stage the hanging, who is the external contractor Thorne hired?',
            'msg_when_wrong' => 'Review EX-001. Someone had legitimate access to the floor hours before the murder.',
            'is_mandatory' => true,
        ]);
        Choice::create(['question_id' => $p4q1->id, 'text' => 'The "Janitor" who badged in at 11:30 PM, whose employer is a shell company quietly owned by Thorne.', 'is_correct' => true]);
        Choice::create(['question_id' => $p4q1->id, 'text' => 'The precinct detective who immediately ruled it a suicide.', 'is_correct' => false]);
    }
}