<?php

namespace App\Enums;

/**
 * How the player-facing viewer renders an evidence. Resolved on the server by
 * PresentationResolver and stored on the row so the frontend never has to
 * derive presentation from a type/matrix combination.
 */
enum ViewerStrategy: string
{
    /** Fixed A4 sheet with paginated blocks. */
    case Paper = 'paper';

    /** Black terminal window with paginated blocks. */
    case Terminal = 'terminal';

    /** Image or audio element sourced from the evidence assets. */
    case Media = 'media';

    /** Sandboxed admin-authored HTML/CSS or a 3D model. */
    case Artifact = 'artifact';
}
