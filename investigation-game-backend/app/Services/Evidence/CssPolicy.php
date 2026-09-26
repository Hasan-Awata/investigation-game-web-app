<?php

namespace App\Services\Evidence;

use App\Exceptions\UnsafeArtifactStylesheetException;

/**
 * A deny-list for the CSS an admin may attach to a `custom` artifact.
 *
 * PHP has no CSS parser, so a full allow-list grammar is not available. Rather
 * than pretend to validate, this rejects the constructs that turn a stylesheet
 * into a request forger:
 *
 *   url()/@import   - exfiltrate evidence to a third party, or beacon
 *   expression()    - legacy IE script execution
 *   javascript:/vbscript:/data: in a value - script execution
 *   behavior/-moz-binding - script execution
 *   backslash       - CSS escapes let an author spell "url" as "\75 rl"
 *   comments        - split tokens to hide the above
 *   "</"            - close the host <style> element and break out of it
 *
 * The remaining stylesheet is still untrusted, which is why ArtifactViewer
 * renders artifacts in a sandboxed frame without allow-same-origin. This layer
 * reduces the blast radius; the sandbox is what actually contains it.
 */
class CssPolicy
{
    /**
     * Named so both the tests and the admin form can talk about the failure.
     *
     * @var array<string, string>
     */
    private const RULES = [
        'external_fetch' => '/\burl\s*\(/i',
        'external_import' => '/@import\b/i',
        'legacy_expression' => '/\bexpression\s*\(/i',
        'script_url' => '/(?:javascript|vbscript|livescript)\s*:/i',
        'data_url' => '/\bdata\s*:/i',
        'legacy_behavior' => '/\bbehavior\s*:/i',
        'moz_binding' => '/-moz-binding\b/i',
        'progid_filter' => '/\bprogid\s*:/i',
        'escaped_identifier' => '/\\\\/',
        'comment' => '/\/\*|\*\//',
        'style_breakout' => '#</#i',
    ];

    /**
     * @return list<string> the rule names that matched, in declaration order
     */
    public function violations(string $css): array
    {
        $found = [];

        foreach (self::RULES as $name => $pattern) {
            if (preg_match($pattern, $css) === 1) {
                $found[] = $name;
            }
        }

        return $found;
    }

    public function isSafe(string $css): bool
    {
        return $this->violations($css) === [];
    }

    /**
     * @throws UnsafeArtifactStylesheetException
     */
    public function assertSafe(string $css): void
    {
        $violations = $this->violations($css);

        if ($violations !== []) {
            throw UnsafeArtifactStylesheetException::because($violations);
        }
    }
}
