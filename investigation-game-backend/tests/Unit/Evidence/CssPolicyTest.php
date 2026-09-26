<?php

namespace Tests\Unit\Evidence;

use App\Exceptions\UnsafeArtifactStylesheetException;
use App\Services\Evidence\CssPolicy;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CssPolicyTest extends TestCase
{
    private CssPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();

        $this->policy = new CssPolicy;
    }

    public function test_ordinary_presentational_css_passes(): void
    {
        $css = <<<'CSS'
        .report { font-family: "Courier New", monospace; color: #222; }
        table { border-collapse: collapse; width: 100%; }
        td { padding: 6px 8px; border: 1px solid #999; }
        .stamp { transform: rotate(-8deg); letter-spacing: 0.08em; }
        CSS;

        $this->assertSame([], $this->policy->violations($css));
        $this->assertTrue($this->policy->isSafe($css));
        $this->policy->assertSafe($css);
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function forbiddenProvider(): array
    {
        return [
            'url()' => ['body { background: url(https://evil.test/p.png); }', 'external_fetch'],
            'spaced url()' => ['body { background: url ("https://evil.test/p.png"); }', 'external_fetch'],
            '@import' => ['@import url("https://evil.test/x.css");', 'external_import'],
            'bare @import' => ['@import "https://evil.test/x.css";', 'external_import'],
            'expression()' => ['div { width: expression(alert(1)); }', 'legacy_expression'],
            'javascript url' => ['a { background: url(javascript:alert(1)); }', 'external_fetch'],
            'javascript scheme' => ['div { color: javascript:alert(1) }', 'script_url'],
            'data url' => ['div { background: url(data:text/html,<script>alert(1)</script>); }', 'data_url'],
            'behavior' => ['div { behavior: url(evil.htc); }', 'legacy_behavior'],
            'moz binding' => ['div { -moz-binding: url(evil.xml#x); }', 'moz_binding'],
            'progid' => ['div { filter: progid:DXImageTransform.Microsoft.Blur(); }', 'progid_filter'],
            'escaped identifier' => ['div { background: \\75 rl(https://evil.test/p.png); }', 'escaped_identifier'],
            'comment split token' => ['div { background: ur/**/l(https://evil.test/p.png); }', 'comment'],
            'style breakout' => ['div { color: red } </style><script>alert(1)</script>', 'style_breakout'],
        ];
    }

    #[DataProvider('forbiddenProvider')]
    public function test_it_rejects_the_constructs_that_turn_a_stylesheet_into_a_request_forger(
        string $css,
        string $expectedRule,
    ): void {
        $this->assertContains($expectedRule, $this->policy->violations($css));
        $this->assertFalse($this->policy->isSafe($css));

        $this->expectException(UnsafeArtifactStylesheetException::class);

        $this->policy->assertSafe($css);
    }

    public function test_the_exception_names_every_rule_that_matched(): void
    {
        $css = '@import url(https://evil.test/x.css); div { behavior: url(evil.htc); }';

        try {
            $this->policy->assertSafe($css);
            $this->fail('Expected an UnsafeArtifactStylesheetException.');
        } catch (UnsafeArtifactStylesheetException $exception) {
            $this->assertStringContainsString('external_import', $exception->getMessage());
            $this->assertStringContainsString('legacy_behavior', $exception->getMessage());
        }
    }

    public function test_an_empty_stylesheet_is_safe(): void
    {
        $this->assertTrue($this->policy->isSafe(''));
        $this->assertTrue($this->policy->isSafe('   '));
    }

    public function test_rejecting_rather_than_rewriting_means_the_input_is_never_silently_changed(): void
    {
        $css = 'div { background: url(https://evil.test/p.png); }';

        try {
            $this->policy->assertSafe($css);
        } catch (UnsafeArtifactStylesheetException) {
            // The caller is told to fix the input, not handed a mutated copy.
        }

        $this->assertSame($css, $css, 'the policy must not modify what it inspects');
    }
}
