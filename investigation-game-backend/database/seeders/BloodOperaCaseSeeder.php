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

class BloodOperaCaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create the Parent Case
        $case = GameCase::create([
            'title' => 'أوبرا الدماء',
            'story' => "في منتصف ليلة مظلمة، استيقظت المدينة على مشهد مرعب أمام مبنى الإدارة الرئيسي لمستشفى المدينة المركزية؛ حيث غُلّق جثمان الدكتور (رأفت)، استشاري الجراحة العامة ونائب رئيس لجنة تقييم الأخطاء الطبية، من شرفة الطوالق العالي بطريقة وحشية ومدروسة. أشار تقرير الطب الشرعي المبدئي إلى أن الضحية تعرضت لشلل مؤقت قبل أن يتم بتر أصابع يده اليمنى بدقة جراحية مذهلة وتعليقه بحبل متصل بمعصمه. بجانب الجُثة، وُجد جهاز تسجيل صغير بيت مقطوعة أوبرا حزينة بجوار قلمه الطبي الملطخ بالدماء. وبينما تحاول الشرطة جمع الخيوط الأولى، تشير المستندات الرسمية وسجلات المتقفي إلى أن الضحية كان يتولى إدارة صفقات مشبوهة وقرارات إدارية مثيرة للجدل لتغطية أخطاء جسيمة، مما يفتح باباً واسعاً لاحتمال وجود تصفية حسابات شخصية أو انتقام من خصوم مهنيين طالهم الظلم داخل أروقة المستشفى.",            
            'min_player_XP' => 0, 
            'XP_on_solve' => 2500,
            'max_strikes' => 5,
            'rating_stars' => 4.8,
            'age_rating' => 'Adult 18+',
            'estimated_playtime' => '120 Minutes',
            'difficulty' => 'Standard',
            'tags' => ['Tactical', 'Puzzle'],
            'author_name' => 'System',
            'img_url' => '/assets/cases/blood-opera-cover.png',
            'is_published' => true,
        ]);

        // 2. Create Initial Victim
        Victim::create([
            'case_id' => $case->id,
            'name' => 'الدكتور رأفت',
            'background' => "استشاري الجراحة العامة ونائب رئيس لجنة تقييم الأخطاء الطبية في مستشفى المدينة المركزية. وُجد جثمانه معلقاً من شرفة الطابق العالي بعد تعرضه لشلل مؤقت وبتر دقيق لأصابع يده اليمنى.",
            'img_url' => '/assets/victims/dr-rafat.png',
            'is_initial' => true,
        ]);

        // 3. Create Suspects Roster
        Suspect::create([
            'case_id' => $case->id,
            'name' => 'مدير المستشفى',
            'background' => 'مدير المستشفى التنفيذي، كان على خلاف حاد مع الدكتور رأفت بسبب تقارير لجنة تقييم الأخطاء الطبية التي هددت بتوريط الإدارة في قضايا إهمال جسيمة.',
            'is_initial' => true,
            'is_guilty' => true, 
            'img_url' => '/assets/placeholder-mugshot.jpg',
        ]);

        Suspect::create([
            'case_id' => $case->id,
            'name' => 'الممرض السري',
            'background' => 'ممرض عمل لفترة طويل تحت إشراف الدكتور رأفت وتم فصله تعسفياً إثر شكوى تقدم بها للجنة الأخطاء الطبية.',
            'is_initial' => true,
            'is_guilty' => false, 
            'img_url' => '/assets/placeholder-mugshot.jpg',
        ]);

        // 4. Create Parent Phases & Levels
        $phase1 = Phase::create([
            'case_id' => $case->id, 
            'title' => 'مسرح الجريمة', 
            'description' => 'فحص ملابسات تعليق الجثمان والأدلة الصوتية بجوار الجثة.', 
            'order_index' => 1
        ]);

        $level1 = Level::create([
            'phase_id' => $phase1->id,
            'title' => 'تحليل مسرح الجريمة',
            'details' => 'فحص موقع الحادث أمام مستشفى المدينة المركزية ودراسة الأدلة المتروكة.',
            'order_index' => 1,
            'is_initial' => true,
            'img_url' => '/assets/cases/blood-level1.png',
            'presentation_type' => 'location', 
        ]);

        // 5. Create Initial Evidence
        Evidence::create([
            'case_id' => $case->id,
            'is_initial' => true,
            'title' => 'جهاز التسجيل وقلم الدم',
            'description' => 'جهاز تسجيل صغير وُجد بجوار الجثة يعزف مقطوعة أوبرا بجانب قلم طبي ملطخ بالدماء.',
            'evidence_type' => 'document',
            'paragraph' => "يحتوي جهاز التسجيل على تسجيل صوتي لمقطع أوبرا حزين يتكرر باستمرار. القلم الطبي يحمل بصمات غير واضحة.",
        ]);

        // 6. Create Questions and Choices
        $q1 = Question::create([
            'level_id' => $level1->id,
            'text' => 'ما الذي يشير إليه بتر أصابع اليد اليمنى بهذه الدقة الجراحية بجانب الشلل المؤقت؟',
            'msg_when_wrong' => 'راجع تقرير الطب الشرعي؛ الجراحة الدقيقة تعكس خلفية مهنية وليست عشوائية.',
            'is_mandatory' => true,
        ]);

        Choice::create([
            'question_id' => $q1->id, 
            'text' => 'دليل على انتقام شخصي من شخص ذي خلفية طبية أو جراحية.', 
            'is_correct' => true
        ]);
        
        Choice::create([
            'question_id' => $q1->id, 
            'text' => 'مجرد حادث عارض نتج عن مقاومة الضحية أثناء السقوط.', 
            'is_correct' => false
        ]);
    }
}