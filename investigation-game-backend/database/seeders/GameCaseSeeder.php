<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\GameCase;
use App\Models\Phase;
use App\Models\Level;
use App\Models\Evidence;
use App\Models\Question;
use App\Models\Choice;
use App\Models\Suspect;
use App\Models\Victim; 
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

        Victim::create([
            'case_id' => $case->id,
            'name' => 'Elias Vance',
            'background' => "48-year-old visionary managing partner of Vance & Thorne Architectural. Found dead in his 40th-floor corner office at 6:00 AM. The official cause of death was ruled a suicide by hanging, but circumstances surrounding the bolted door and the impending hostile takeover suggest foul play.",
            'img_url' => '/assets/victims/elias-vance.png',
            'is_initial' => true,
        ]);

        Victim::create([
            'case_id' => $case->id,
            'name' => 'Julian Carver',
            'background' => "Former Chief Financial Officer at Vance & Thorne. Perished in a suspicious hit-and-run accident three weeks prior to Elias Vance's death. Carver was the only board member vocally opposing Marcus Thorne's restructuring plans.",
            'img_url' => '/assets/victims/julian-carver.png',
            'is_initial' => false,
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

        // 2. Create the Parent Phases
        $phase1 = Phase::create(['case_id' => $case->id, 'title' => 'Initial Sweep', 'description' => 'Secure and analyze the immediate scene.', 'order_index' => 1]);
        $phase2 = Phase::create(['case_id' => $case->id, 'title' => 'Medical Examiner', 'description' => 'Review the physical trauma and toxicology.', 'order_index' => 2]);
        $phase3 = Phase::create(['case_id' => $case->id, 'title' => 'Corporate Espionage', 'description' => 'Follow the money and cross-reference alibis.', 'order_index' => 3]);
        $phase4 = Phase::create(['case_id' => $case->id, 'title' => 'The Break', 'description' => 'Interrogate the prime suspects.', 'order_index' => 4]);
        // NEW: Wiretap test phase
        $phase5 = Phase::create(['case_id' => $case->id, 'title' => 'Surveillance', 'description' => 'Active wiretap on a burner device.', 'order_index' => 5]);

        // 3. Create the Nested Levels (Attached to Phases)
        $level1 = Level::create([
            'phase_id' => $phase1->id,
            'title' => 'The Crime Scene',
            'details' => 'Sweep the spatial anomalies of the bolted 40th-floor office to find the killer\'s entry point.',
            'order_index' => 1,
            'is_initial' => true,
            'img_url' => '/assets/cases/Level1.png',
            'presentation_type' => 'location', 
        ]);
            
        $level2 = Level::create([
            'phase_id' => $phase2->id,
            'title' => 'The Autopsy',
            'details' => 'Review the coroner\'s findings and establish the true cause and time of death.',
            'order_index' => 1,
            'is_initial' => true,
            'img_url' => '/assets/cases/Level2.png',
            'presentation_type' => 'standard',
        ]);
            
        $level3 = Level::create([
            'phase_id' => $phase3->id,
            'title' => 'The Motive',
            'details' => 'Cross-reference Marcus Thorne\'s rock-solid alibi with internal communications.',
            'order_index' => 1,
            'is_initial' => true,
            'img_url' => '/assets/cases/Level3.png',
            'presentation_type' => 'standard',
        ]);

        $level4 = Level::create([
            'phase_id' => $phase3->id,
            'title' => 'The Fixer',
            'details' => 'Identify the external contractor Thorne hired to execute the hit.',
            'order_index' => 2,
            'is_initial' => false, 
            'img_url' => '/assets/cases/Level4.png',
            'presentation_type' => 'standard',
        ]);

        $level5 = Level::create([
            'phase_id' => $phase4->id,
            'title' => 'The Confession',
            'details' => 'Anton Varga has been detained and brought into Interrogation Room B. Break his alibi and secure a confession.',
            'order_index' => 1,
            'is_initial' => false, 
            'img_url' => '/assets/cases/Level5.png',
            'presentation_type' => 'interrogation', 
        ]);

        // NEW: Wiretap test level
        $level6 = Level::create([
            'phase_id' => $phase5->id,
            'title' => 'Burner Phone Intercept',
            'details' => 'We managed to clone a burner phone tied to Marcus Thorne. A call is incoming. You only get one chance to listen.',
            'order_index' => 1,
            'is_initial' => true, // Set to true so you can test it immediately
            'presentation_type' => 'wiretap',
        ]);

        // 4. Create Case Evidence
        $evidence1 = Evidence::create([
            'case_id' => $case->id,
            'is_initial' => true,
            'title' => 'Security Keycard Logs',
            'description' => '40th-floor access records for the night of the murder.',
            'evidence_type' => 'document',
            'paragraph' => "21:00 - Elias Vance (Master Access)\n23:30 - Maintenance/Janitorial Staff (Temp Access)\n\n*No other entries or exits recorded on the 40th floor until morning discovery.*",
        ]);

        $evidence2 = Evidence::create([
            'case_id' => $case->id,
            'is_initial' => true,
            'title' => 'Coroner\'s Preliminary Report',
            'description' => 'Initial physical autopsy findings.',
            'evidence_type' => 'forensic',
            'paragraph' => "Lividity and rigor mortis indicate time of death at approximately 02:00 AM. \n\n**ANOMALY DETECTED:** A faint, secondary ligature mark is present around the circumference of the neck, measuring 2mm in width. This contradicts the 1-inch thick industrial hemp rope found bearing the body's weight at the scene. Tox screen reveals trace amounts of sedatives.",
        ]);

        $evidence3 = Evidence::create([
            'case_id' => $case->id,
            'is_initial' => true,
            'title' => 'Marcus Thorne\'s Statement',
            'description' => 'Official statement given to precinct detectives.',
            'evidence_type' => 'testimony',
            'paragraph' => "> \"Elias was a troubled man. The stress of the firm was getting to him. I was at the Mayor's Charity Gala at the Grand Hotel from 8:00 PM until the bar closed at 3:00 AM. You can check the society pages; I was photographed all night.\"",
        ]);

        $evidence4 = Evidence::create([
            'case_id' => $case->id,
            'is_initial' => true,
            'title' => 'Intercepted Internal Email',
            'description' => 'A partially recovered draft from Vance to his legal team.',
            'evidence_type' => 'document',
            'paragraph' => "If Marcus tries to push this buyout, I have the leverage to stop him. He doesn't know that I found the discrepancy in the `Cayman Islands offshore routing` accounts. I have the files backed up on a `physical drive hidden in my safe`. If I don't survive this week, look for the `black ledger`.",
        ]);

        $evidence5 = Evidence::create([
            'case_id' => $case->id,
            'is_initial' => true,
            'title' => 'Crime Scene Photo: Vance\'s Desk',
            'description' => 'Police photography of the immediate vicinity.',
            'evidence_type' => 'image',
            'img_url' => '/assets/cases/file_00000000153481f495d614d07aac0ad3.png',
        ]);

        // Hidden Evidence
        $evidence6 = Evidence::create([
            'case_id' => $case->id,
            'is_initial' => false, 
            'title' => 'HVAC Architecture Blueprint',
            'description' => 'Building schematics for the 40th-floor corner office.',
            'evidence_type' => 'image',
            'img_url' => '/assets/cases/file_000000003ce481f49d89f87c915a8097.png',
        ]);

        $evidence7 = Evidence::create([
            'case_id' => $case->id,
            'is_initial' => false, 
            'title' => 'Micro-Cassette (Recovered from Safe)',
            'description' => 'Chain of Custody: CSU drilled the wall safe behind the crooked painting per your unit\'s request. The safe was emptied by the killer, but this dictaphone tape was lodged in the back hinge.',
            'evidence_type' => 'audio',
            'audio_url' => '/assets/cases/drilling_sound.wav',
        ]);

        // 5. Create Verdicts and Choices

        // LEVEL 1: LOCATION PHASE VERDICTS
        $l1q1 = Question::create([
            'level_id' => $level1->id,
            'text' => 'The door was physically bolted from the inside. Locate the killer\'s exact point of entry.',
            'msg_when_wrong' => 'The door was physically bolted, not electronically locked. Think about architectural vulnerabilities.',
            'is_mandatory' => true,
        ]);
        // Formatted for the location visual targeter: "X,Y | Title"
        Choice::create(['question_id' => $l1q1->id, 'text' => '45.0,50.0 | The Bolted Door', 'is_correct' => false]);
        Choice::create(['question_id' => $l1q1->id, 'text' => '85.5,20.0 | The Exterior Window Rig', 'is_correct' => false]);
        Choice::create([
            'question_id' => $l1q1->id, 
            'text' => '65.2,15.5 | HVAC Return Vent', 
            'is_correct' => true,
            'unlocks_evidence_id' => $evidence6->id // Unlocks the blueprint
        ]);

        // LEVEL 2: STANDARD PHASE VERDICTS
        $l2q1 = Question::create([
            'level_id' => $level2->id,
            'text' => 'The coroner noted a "secondary ligature mark" made by a thinner cord, plus sedatives in the tox screen. What does this indicate?',
            'msg_when_wrong' => 'Look at the mechanics of the staging. A thick rope doesn\'t leave a razor-thin indentation, and a suicidal man doesn\'t drug himself first.',
            'is_mandatory' => true,
        ]);
        Choice::create(['question_id' => $l2q1->id, 'text' => 'Vance attempted to hang himself twice with different materials.', 'is_correct' => false]);
        Choice::create(['question_id' => $l2q1->id, 'text' => 'Vance was sedated and garroted from behind with a wire; the hanging was staged post-mortem using the thicker rope.', 'is_correct' => true]);

        // LEVEL 3: STANDARD PHASE VERDICTS
        $l3q1 = Question::create([
            'level_id' => $level3->id,
            'text' => 'Marcus Thorne was photographed at a charity gala until 3:00 AM, but the murder occurred around 2:00 AM. How does this factor into the execution?',
            'msg_when_wrong' => 'A CEO doesn\'t crawl through air vents. Apply Occam\'s razor to his alibi.',
            'is_mandatory' => true,
        ]);
        Choice::create([
            'question_id' => $l3q1->id, 
            'text' => 'Thorne\'s alibi is solid because he hired a professional \'fixer\' to bypass the security and stage the scene.', 
            'is_correct' => true,
            'unlocks_level_id' => $level4->id // Unlocks Level 4
        ]);
        Choice::create(['question_id' => $l3q1->id, 'text' => 'Thorne slipped out the back of the gala, committed the murder, and returned unnoticed.', 'is_correct' => false]);

        $l3q2 = Question::create([
            'level_id' => $level3->id,
            'text' => '[OPTIONAL] The intercepted email mentions a "black ledger." Does the crime scene photo show any evidence of a search for this item?',
            'msg_when_wrong' => 'Look at the background of the photo, near the framed architectural awards. Something has been physically disturbed.',
            'is_mandatory' => false,
        ]);
        Choice::create([
            'question_id' => $l3q2->id, 
            'text' => 'The painting on the back wall is crooked. Dispatch Crime Scene Units (CSU) to sweep and crack the wall safe behind it.', 
            'is_correct' => true,
            'unlocks_evidence_id' => $evidence7->id
        ]);
        Choice::create([
            'question_id' => $l3q2->id, 
            'text' => 'No, the room appears completely undisturbed aside from the body.', 
            'is_correct' => false
        ]);

        // LEVEL 4: STANDARD PHASE VERDICTS
        $l4q1 = Question::create([
            'level_id' => $level4->id,
            'text' => 'Based on the HVAC blueprints and the required skill to cleanly stage the hanging, who is the external contractor Thorne hired?',
            'msg_when_wrong' => 'Review EX-001. Someone had legitimate access to the floor hours before the murder.',
            'is_mandatory' => true,
        ]);
        Choice::create([
            'question_id' => $l4q1->id, 
            'text' => 'The "Janitor" who badged in at 11:30 PM, whose employer is a shell company quietly owned by Thorne.', 
            'is_correct' => true,
            'unlocks_level_id' => $level5->id // Instantly unlocks the Interrogation Log
        ]);
        Choice::create([
            'question_id' => $l4q1->id, 
            'text' => 'The precinct detective who immediately ruled it a suicide.', 
            'is_correct' => false
        ]);

        // LEVEL 5: INTERROGATION PHASE VERDICTS
        $l5q1 = Question::create([
            'level_id' => $level5->id,
            'text' => "I already told the uniforms, I just empty the trash. I don't know anything about a hanging.",
            'msg_when_wrong' => "He is playing dumb. Confront him with hard evidence of his specialized skills and access.",
            'is_mandatory' => true,
        ]);
        Choice::create([
            'question_id' => $l5q1->id, 
            'text' => 'We know Thorne paid you. Just admit it.', 
            'is_correct' => false
        ]);
        Choice::create([
            'question_id' => $l5q1->id, 
            'text' => 'A janitor doesn\'t know how to bypass an HVAC return vent without leaving a trace. But a former infiltration specialist does.', 
            'is_correct' => true
        ]);

        // NEW LEVEL 6: WIRETAP PHASE VERDICTS
        $l6q1 = Question::create([
            'level_id' => $level6->id,
            'text' => 'Analyze the background noise behind the target\'s voice. What do you hear?',
            'audio_url' => '/assets/cases/drilling_sound.wav',
            'msg_when_wrong' => 'Listen closely to the rhythmic, mechanical sound.',
            'is_mandatory' => true,
        ]);
        Choice::create([
            'question_id' => $l6q1->id, 
            'text' => 'Heavy traffic and sirens. They are in a moving vehicle.', 
            'is_correct' => false
        ]);
        Choice::create([
            'question_id' => $l6q1->id, 
            'text' => 'A high-speed drill or mechanical whine, matching a safe breach.', 
            'is_correct' => true
        ]);
    }
}