<?php

namespace Tests\Unit\Evidence;

use App\Exceptions\UnsafeArtifactStylesheetException;
use App\Services\Evidence\ArtifactSanitizer;
use App\Services\Evidence\CssPolicy;
use App\Services\Evidence\TextBlockSanitizer;
use Tests\TestCase;

class SanitizerTest extends TestCase
{
    private TextBlockSanitizer $text;

    private ArtifactSanitizer $artifact;

    protected function setUp(): void
    {
        parent::setUp();

        $this->text = new TextBlockSanitizer;
        $this->artifact = new ArtifactSanitizer(new CssPolicy);
    }

    public function test_text_blocks_keep_their_formatting_subset(): void
    {
        $html = '<h2>Autopsy</h2><p>The <strong>cause</strong> is <em>blunt force</em>.</p>'
            .'<ul><li>Left temple</li></ul><blockquote>Dr. Hale</blockquote><p>Line<br>break</p>';

        $clean = $this->text->sanitize($html);

        foreach (['<h2>', '<strong>', '<em>', '<ul>', '<li>', '<blockquote>', '<br'] as $tag) {
            $this->assertStringContainsString($tag, $clean, "{$tag} should survive sanitizing");
        }
    }

    /**
     * Purifier signals a property it does not understand by emitting a PHP
     * warning, which Laravel turns into an exception. Asserting the sanitize
     * pass is warning-free means widening an allow-list with a property name
     * Purifier has never heard of fails here instead of at runtime.
     */
    public function test_sanitizing_never_emits_a_php_warning(): void
    {
        $warnings = [];

        set_error_handler(function (int $number, string $message) use (&$warnings): bool {
            // Respect @-suppression the way Laravel's own handler does. Purifier
            // recreates its cache directory on every construction, and the
            // resulting warning is suppressed because the directory exists.
            if (error_reporting() & $number) {
                $warnings[] = $message;
            }

            return true;
        });

        try {
            $this->text->sanitize('<p style="text-align:center">a</p>');
            $this->artifact->sanitizeHtml(
                '<table><tr><td style="border:1px solid #999;background-color:#eee">a</td></tr></table>'
            );
        } finally {
            restore_error_handler();
        }

        $this->assertSame([], $warnings);
    }

    public function test_text_blocks_lose_everything_that_can_execute_or_navigate(): void
    {
        $html = '<p>ok</p><script>alert(1)</script>'
            .'<img src=x onerror=alert(1)>'
            .'<iframe src="https://evil.test"></iframe>'
            .'<a href="https://evil.test">click</a>'
            .'<p onclick="alert(1)">handler</p>';

        $clean = $this->text->sanitize($html);

        foreach (['script', 'onerror', 'onclick', 'iframe', 'href', 'evil.test'] as $forbidden) {
            $this->assertStringNotContainsString($forbidden, $clean, "{$forbidden} must not survive");
        }
    }

    public function test_text_block_styles_are_confined_to_typography(): void
    {
        $clean = $this->text->sanitize(
            '<p style="text-align:center">a</p><p style="position:fixed;top:0">b</p>'
        );

        $this->assertStringContainsString('text-align:center', $clean);
        $this->assertStringNotContainsString('position', $clean);
    }

    public function test_empty_input_sanitizes_to_empty(): void
    {
        $this->assertSame('', $this->text->sanitize(null));
        $this->assertSame('', $this->text->sanitize('   '));
    }

    public function test_artifacts_may_contain_tables_and_definition_lists(): void
    {
        $html = '<h1>Ballistics</h1><table><thead><tr><th>Caliber</th></tr></thead>'
            .'<tbody><tr><td>9mm</td></tr></tbody></table><dl><dt>Grip</dt><dd>Right</dd></dl>';

        $clean = $this->artifact->sanitizeHtml($html);

        foreach (['<h1>', '<table>', '<thead>', '<th>', '<td>', '<dl>', '<dt>', '<dd>'] as $tag) {
            $this->assertStringContainsString($tag, $clean, "{$tag} should survive sanitizing");
        }
    }

    public function test_artifacts_keep_their_prose_intact(): void
    {
        $html = '<section>Case narrative</section><article>Analysis</article>'
            .'<header>Ballistics Division</header><footer>Page 4</footer>'
            .'<p>A <mark>critical</mark> detail, 3<sup>rd</sup> witness, 5<small>mm</small>.</p>';

        $clean = $this->artifact->sanitizeHtml($html);

        foreach (['Case narrative', 'Analysis', 'Ballistics Division', 'Page 4', 'critical', '3', '5'] as $text) {
            $this->assertStringContainsString($text, $clean, "{$text} must not be silently dropped");
        }
    }

    public function test_artifacts_lose_forms_frames_and_scripts(): void
    {
        $html = '<p>report</p><script>fetch("/api/admin/evidence")</script>'
            .'<form action="/logout"><input name="x"></form>'
            .'<iframe src="https://evil.test"></iframe>'
            .'<object data="evil.swf"></object>'
            .'<button onclick="alert(1)">go</button>'
            .'<a href="https://evil.test">link</a>';

        $clean = $this->artifact->sanitizeHtml($html);

        foreach (['script', 'fetch(', '<form', '<input', '<iframe', '<object', '<button', 'onclick', 'href'] as $forbidden) {
            $this->assertStringNotContainsString($forbidden, $clean, "{$forbidden} must not survive");
        }

        $this->assertStringContainsString('report', $clean);
    }

    public function test_artifacts_cannot_smuggle_a_remote_resource_through_a_style(): void
    {
        $html = '<p style="background-image:url(https://evil.test/p.png)">a</p>'
            .'<p style="background-color:#eee">b</p>';

        $clean = $this->artifact->sanitizeHtml($html);

        $this->assertStringNotContainsString('evil.test', $clean);
        $this->assertStringNotContainsString('background-image', $clean);
        $this->assertStringContainsString('background-color', $clean);
    }

    public function test_a_safe_artifact_stylesheet_is_accepted(): void
    {
        $css = '.case-file { border: 1px solid #333; padding: 12px; }';

        $this->assertTrue((new CssPolicy)->isSafe($css));

        // Nothing to assert beyond "no exception": the point is that these
        // three inputs are all accepted, including the empty ones.
        $this->artifact->assertCssIsSafe($css);
        $this->artifact->assertCssIsSafe(null);
        $this->artifact->assertCssIsSafe('');

        $this->assertTrue(true);
    }

    public function test_an_artifact_stylesheet_that_fetches_is_rejected(): void
    {
        $this->expectException(UnsafeArtifactStylesheetException::class);

        $this->artifact->assertCssIsSafe('@import "https://evil.test/steal.css";');
    }
}
