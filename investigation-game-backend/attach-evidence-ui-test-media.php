<?php

/**
 * Attaches real image and audio binaries to the media evidence of an imported
 * case, so the media viewer and audio player can be exercised with actual
 * files instead of empty shells.
 *
 * The bulk import cannot carry binary content, so the image and audio evidence
 * arrive with no asset at all. This script generates a plausible CCTV still and
 * a short WAV clip, then writes them through EvidenceAssetWriter, which is the
 * same path the admin upload endpoint uses.
 *
 * Usage:
 *   php attach-evidence-ui-test-media.php [case-title-substring]
 *
 * With no argument the most recently created case is used. Nothing here is
 * case specific: the script finds the image and audio evidence by their
 * evidence_type, so it works on any case that has them.
 */

require __DIR__ . '/vendor/autoload.php';

$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Enums\AssetKind;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Services\Evidence\EvidenceAssetWriter;
use Illuminate\Http\UploadedFile;

/* ------------------------------------------------------------------ *
 * PNG generation (no GD on this host, so the encoder is written out)
 * ------------------------------------------------------------------ */

function pngChunk(string $type, string $data): string
{
    return pack('N', strlen($data)) . $type . $data . pack('N', crc32($type . $data));
}

/**
 * @param  callable(int,int):array{int,int,int}  $pixel
 */
function encodePng(int $width, int $height, callable $pixel): string
{
    $raw = '';

    for ($y = 0; $y < $height; $y++) {
        // Filter type 0 (None) for every scanline.
        $raw .= "\x00";

        for ($x = 0; $x < $width; $x++) {
            [$r, $g, $b] = $pixel($x, $y);
            $raw .= chr($r & 0xFF) . chr($g & 0xFF) . chr($b & 0xFF);
        }
    }

    $ihdr = pack('NN', $width, $height) . pack('C5', 8, 2, 0, 0, 0);

    return "\x89PNG\r\n\x1a\n"
        . pngChunk('IHDR', $ihdr)
        . pngChunk('IDAT', gzcompress($raw, 9))
        . pngChunk('IEND', '');
}

/**
 * Draws a corridor still: vanishing-point perspective floor, a lit doorway at
 * the end of it, a standing figure, sensor noise and interlace banding. It only
 * has to be a real, non-trivial image of the right aspect ratio and weight.
 */
function cctvStill(int $width, int $height): string
{
    $vanishX = (int) ($width * 0.52);
    $vanishY = (int) ($height * 0.46);
    $doorL = (int) ($width * 0.44);
    $doorR = (int) ($width * 0.60);
    $doorT = (int) ($height * 0.20);
    $doorB = (int) ($height * 0.62);

    // Figure: head plus shoulders, standing right of the doorway.
    $figCX = (int) ($width * 0.66);
    $figCY = (int) ($height * 0.56);
    $figR = (int) ($height * 0.075);
    $figW = (int) ($width * 0.075);
    $figH = (int) ($height * 0.30);

    return encodePng($width, $height, function (int $x, int $y) use (
        $vanishX, $vanishY, $doorL, $doorR, $doorT, $doorB,
        $figCX, $figCY, $figR, $figW, $figH, $width, $height
    ) {
        // Base: cool grey wall, brighter toward the vanishing point.
        $depth = min(1.0, max(0.0, 1 - (abs($x - $vanishX) / ($width * 0.75))));
        $r = (int) (26 + 30 * $depth);
        $g = (int) (30 + 34 * $depth);
        $b = (int) (38 + 44 * $depth);

        // Floor below the horizon line.
        if ($y > $vanishY) {
            $t = ($y - $vanishY) / max(1, $height - $vanishY);
            $r = (int) (18 + 26 * (1 - $t));
            $g = (int) (21 + 28 * (1 - $t));
            $b = (int) (27 + 34 * (1 - $t));
        }

        // Lit doorway.
        if ($x >= $doorL && $x <= $doorR && $y >= $doorT && $y <= $doorB) {
            $fall = 1 - (($y - $doorT) / max(1, $doorB - $doorT)) * 0.35;
            $r = (int) (150 * $fall);
            $g = (int) (146 * $fall);
            $b = (int) (128 * $fall);
        }

        // Figure silhouette.
        $inHead = (($x - $figCX) ** 2 + (($y - $figCY - $figR) ** 2) * 1.6) <= ($figR ** 2);
        $inBody = abs($x - $figCX) <= $figW && $y > $figCY && $y <= $figCY + $figH;
        if ($inHead || $inBody) {
            $r = 14; $g = 15; $b = 20;
        }

        // Interlace banding every other row.
        if ($y % 2 === 0) {
            $r = (int) ($r * 0.88);
            $g = (int) ($g * 0.88);
            $b = (int) ($b * 0.88);
        }

        // Deterministic sensor noise, so the file does not compress to nothing.
        $n = (($x * 7 + $y * 13) % 11) - 5;
        $r = max(0, min(255, $r + $n));
        $g = max(0, min(255, $g + $n));
        $b = max(0, min(255, $b + $n));

        // Timestamp block in the corner, as a camera overlay would be.
        if ($x >= 18 && $x < 250 && $y >= 18 && $y < 46) {
            $r = 232; $g = 232; $b = 226;
        }

        return [$r, $g, $b];
    });
}

/* ------------------------------------------------------------------ *
 * WAV generation
 * ------------------------------------------------------------------ */

/**
 * 16-bit PCM mono. Two bursts of a low modulated tone separated by silence,
 * so the player has a real duration and a real waveform to draw.
 */
function wiretapClip(int $sampleRate = 8000, float $seconds = 3.4): string
{
    $total = (int) ($sampleRate * $seconds);
    $samples = '';

    for ($i = 0; $i < $total; $i++) {
        $t = $i / $sampleRate;

        $inFirst = $t >= 0.35 && $t < 1.75;
        $inSecond = $t >= 2.05 && $t < 2.95;

        $value = 0.0;

        if ($inFirst || $inSecond) {
            $base = $inFirst ? 165.0 : 205.0;
            // Two partials plus a slow tremolo reads as speech-like movement.
            $value = sin(2 * M_PI * $base * $t) * 0.55
                + sin(2 * M_PI * $base * 2.02 * $t) * 0.22
                + sin(2 * M_PI * $base * 0.51 * $t) * 0.15;
            $value *= 0.55 + 0.45 * sin(2 * M_PI * 3.1 * $t);
            // Fade the burst edges so the clip does not click.
            $edge = min($t - ($inFirst ? 0.35 : 2.05), ($inFirst ? 1.75 : 2.95) - $t);
            if ($edge < 0.05) {
                $value *= $edge / 0.05;
            }
        } else {
            // Room tone rather than digital silence.
            $value = sin(2 * M_PI * 60 * $t) * 0.012;
        }

        $samples .= pack('s', (int) max(-32768, min(32767, $value * 26000)));
    }

    $dataSize = strlen($samples);

    return 'RIFF'
        . pack('V', 36 + $dataSize)
        . 'WAVE'
        . 'fmt '
        . pack('V', 16)
        . pack('v', 1)                              // PCM
        . pack('v', 1)                              // mono
        . pack('V', $sampleRate)
        . pack('V', $sampleRate * 2)                // byte rate
        . pack('v', 2)                              // block align
        . pack('v', 16)                             // bits per sample
        . 'data'
        . pack('V', $dataSize)
        . $samples;
}

/* ------------------------------------------------------------------ *
 * Attach
 * ------------------------------------------------------------------ */

$titleFilter = $argv[1] ?? null;

$query = GameCase::query()->with('evidences')->orderByDesc('id');

if ($titleFilter !== null && $titleFilter !== '') {
    $query->where('title', 'like', '%' . $titleFilter . '%');
}

$case = $query->first();

if (! $case instanceof GameCase) {
    fwrite(STDERR, "No matching case found. Import case-evidence-ui-test.json first.\n");
    exit(1);
}

echo "Case      : #{$case->id} {$case->title}\n";

$imageEvidence = $case->evidences->firstWhere('evidence_type', 'image');
$audioEvidence = $case->evidences->firstWhere('evidence_type', 'audio');

$targets = [
    AssetKind::Image->value => ['model' => $imageEvidence, 'bytes' => cctvStill(1280, 720), 'name' => 'cctv-still.png', 'mime' => 'image/png'],
    AssetKind::Audio->value => ['model' => $audioEvidence, 'bytes' => wiretapClip(), 'name' => 'wiretap-clip.wav', 'mime' => 'audio/wav'],
];

$writer = app(EvidenceAssetWriter::class);
$tmp = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ev-ui-test-media';

if (! is_dir($tmp)) {
    mkdir($tmp, 0777, true);
}

$failed = 0;

foreach ($targets as $kind => $target) {
    /** @var Evidence|null $evidence */
    $evidence = $target['model'];

    if (! $evidence instanceof Evidence) {
        echo "  SKIP  {$kind}: the case has no {$kind} evidence\n";
        $failed++;
        continue;
    }

    $path = $tmp . DIRECTORY_SEPARATOR . $target['name'];
    file_put_contents($path, $target['bytes']);

    $upload = new UploadedFile($path, $target['name'], $target['mime'], null, true);

    $asset = $writer->replace($evidence, AssetKind::from($kind), $upload);

    printf(
        "  OK    %-6s evidence #%d %-46s disk=%-7s %7d bytes  %s\n",
        $kind,
        $evidence->id,
        mb_substr($evidence->title, 0, 44),
        $asset->disk->value,
        $asset->bytes,
        $asset->path
    );

    @unlink($path);
}

echo $failed === 0
    ? "\nDone. The media viewer now has a real image and a real audio clip.\n"
    : "\nFinished with {$failed} problem(s).\n";

exit($failed === 0 ? 0 : 1);
