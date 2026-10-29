<?php

namespace App\Support;

final class MediaValidationRules
{
    public const IMAGE = ['image', 'mimes:jpeg,png,jpg,webp', 'max:4096', 'dimensions:max_width=4096,max_height=4096'];

    public const AUDIO = ['file', 'mimes:mp3,wav,ogg', 'max:10240'];
}
