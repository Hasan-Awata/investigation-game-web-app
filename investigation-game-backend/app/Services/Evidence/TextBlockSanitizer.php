<?php

namespace App\Services\Evidence;

use Mews\Purifier\Facades\Purifier;

/**
 * Cleans the rich text carried by `text` blocks.
 *
 * The text block sits inside the ordinary page markup that the whole app
 * already controls, so it only needs a formatting subset. Everything that can
 * navigate, load or execute is excluded: no anchors (evidence prose is not a
 * link farm), no images, no iframes, and style limited to text-align so the
 * block's align prop cannot be used to smuggle in position or sizing.
 *
 * On the allow-list syntax: `p[style]` allows the style *attribute*, while the
 * properties that attribute may carry are narrowed separately by
 * CSS.AllowedProperties. The bracket list takes attribute names only, not
 * property names.
 */
class TextBlockSanitizer
{
    private const ALLOWED = 'p[style],br,hr,strong,b,em,i,u,s,del,ins,'
        .'ul,ol,li,'
        .'h1,h2,h3,h4,h5,h6,blockquote,pre,code,kbd,samp,var,'
        .'span[style],div[style]';

    /**
     * @return array<string, mixed>
     */
    private function config(): array
    {
        return [
            'Core.Encoding' => 'UTF-8',
            'HTML.Allowed' => self::ALLOWED,
            'HTML.AllowedComments' => '',
            'HTML.ForbiddenElements' => 'script,style,iframe,object,embed,form,input,button,'
                .'link,meta,base,svg,math,audio,video,source,track',
            'CSS.AllowedProperties' => 'text-align,font-weight,font-style,text-decoration',
            'AutoFormat.AutoParagraph' => false,
            'AutoFormat.RemoveEmpty' => false,
            'Attr.EnableID' => false,
            'Attr.AllowedFrameTargets' => [],
            'HTML.Nofollow' => true,
            'HTML.TargetBlank' => false,
        ];
    }

    public function sanitize(?string $html): string
    {
        if ($html === null || trim($html) === '') {
            return '';
        }

        return trim(Purifier::clean($html, $this->config()));
    }

    /**
     * True when sanitizing would not change the markup, i.e. the authored HTML
     * was already inside the allow-list. Used by the admin form to surface a
     * warning rather than silently altering an author's words.
     */
    public function isClean(?string $html): bool
    {
        return $this->sanitize($html) === ($html === null ? '' : trim($html));
    }
}
