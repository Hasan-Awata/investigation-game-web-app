<?php

namespace App\Services\Evidence;

use App\Exceptions\UnsafeArtifactStylesheetException;
use Mews\Purifier\Facades\Purifier;

/**
 * Cleans the `custom` artifact payload, which is richer than a text block
 * because it is a standalone document rather than a fragment of a page.
 *
 * The artifact is rendered in a sandboxed iframe without allow-same-origin, so
 * it has no access to the app origin, the session, or the API. This sanitizer
 * exists to keep the artifact self-contained and to strip anything that would
 * make it a liability rather than content: scripts, forms, frames, and every
 * stylesheet property capable of loading a remote resource.
 */
class ArtifactSanitizer
{
    /**
     * Figure and figcaption are deliberately absent. HTMLPurifier 4.19 accepts
     * them but empties their text content, which would silently drop an
     * author's prose. A div with a class covers the same ground without
     * losing anything, so the artifact editor documents that instead.
     */
    private const ALLOWED = 'p[style],br,hr,strong,b,em,i,u,s,del,ins,mark,small,sub,sup,'
        .'ul,ol,li,dl,dt,dd,'
        .'h1,h2,h3,h4,h5,h6,blockquote[cite],pre,code,kbd,samp,var,'
        .'table,caption,thead,tbody,tfoot,tr,th,td,colgroup,col,'
        .'span[style],div[style],section,article,header,footer,address';

    /**
     * Properties allowed on inline styles.
     *
     * Two separate concerns shaped this list. Purifier only understands a fixed
     * set of properties and emits a PHP warning for anything outside it, so
     * every name here is one Purifier actually supports. Separately, the
     * url-capable properties it does support - background, background-image,
     * list-style-image, border-image, content, cursor - are excluded because an
     * artifact must not reach outside its own sandboxed frame. The
     * CSS.ForbiddenProperties setting below enforces that second rule even if
     * this list is later widened by mistake.
     */
    private const ALLOWED_CSS_PROPERTIES = 'text-align,font-weight,font-style,text-decoration,'
        .'text-transform,letter-spacing,line-height,color,background-color,'
        .'width,height,min-width,max-width,min-height,max-height,'
        .'margin,margin-top,margin-right,margin-bottom,margin-left,'
        .'padding,padding-top,padding-right,padding-bottom,padding-left,'
        .'border,border-top,border-right,border-bottom,border-left,'
        .'border-color,border-style,border-width,border-collapse,border-spacing,'
        .'vertical-align,white-space,word-spacing,caption-side,'
        .'font-family,font-size,font-variant,text-indent,list-style-type,float,clear';

    /**
     * Belt and braces alongside ALLOWED_CSS_PROPERTIES.
     */
    private const FORBIDDEN_CSS_PROPERTIES = 'background,background-image,list-style-image,'
        .'border-image,content,cursor,transform,opacity';

    public function __construct(private readonly CssPolicy $cssPolicy) {}

    public function sanitizeHtml(?string $html): string
    {
        if ($html === null || trim($html) === '') {
            return '';
        }

        return trim(Purifier::clean($html, $this->htmlConfig()));
    }

    /**
     * @throws UnsafeArtifactStylesheetException
     */
    public function assertCssIsSafe(?string $css): void
    {
        if ($css === null || $css === '') {
            return;
        }

        $this->cssPolicy->assertSafe($css);
    }

    /**
     * @return array<string, mixed>
     */
    private function htmlConfig(): array
    {
        return [
            'Core.Encoding' => 'UTF-8',
            'HTML.Allowed' => self::ALLOWED,
            'HTML.AllowedComments' => '',
            'HTML.ForbiddenElements' => 'script,style,iframe,object,embed,applet,form,input,button,'
                .'select,textarea,option,label,fieldset,legend,link,meta,base,svg,math,'
                .'audio,video,source,track,canvas,a,map,area',
            'CSS.AllowedProperties' => self::ALLOWED_CSS_PROPERTIES,
            'CSS.ForbiddenProperties' => self::FORBIDDEN_CSS_PROPERTIES,
            'AutoFormat.AutoParagraph' => false,
            'AutoFormat.RemoveEmpty' => false,
            'Attr.EnableID' => false,
            'Attr.AllowedFrameTargets' => [],
            'HTML.Nofollow' => true,
            'HTML.TargetBlank' => false,
        ];
    }
}
