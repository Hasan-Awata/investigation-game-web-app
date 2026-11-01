<?php

declare(strict_types=1);

// Offline only: preserve the original export and never connect to a game database.
$source = $argv[1] ?? '';
$destination = $argv[2] ?? '';
$content = dirname(__DIR__, 2).'/database/release-content/glasshouse-files';
$inventory = json_decode(file_get_contents($content.'/source.json'), true, flags: JSON_THROW_ON_ERROR);

if (!is_file($source) || $destination === '' || file_exists($destination)) {
    fwrite(STDERR, "Usage: php scripts/release-content/build-glasshouse-release.php ORIGINAL.zip NEW.zip (output must not exist)\n");
    exit(1);
}

$archive = new ZipArchive();
if ($archive->open($source, ZipArchive::RDONLY) !== true) {
    throw new RuntimeException('Could not open original export.');
}
try {
    $manifest = $archive->getFromName('case.json');
    if ($manifest === false || hash('sha256', $manifest) !== $inventory['original_manifest_sha256']) {
        throw new RuntimeException('Source manifest differs from the reviewed Glasshouse export.');
    }
    foreach ($inventory['media_sha256'] as $name => $hash) {
        $bytes = $archive->getFromName($name);
        if ($bytes === false || hash('sha256', $bytes) !== $hash) {
            throw new RuntimeException('Source media differs from the reviewed export: '.$name);
        }
    }
} finally {
    $archive->close();
}

// Exclusive creation prevents replacing a source or an existing release bundle.
$output = fopen($destination, 'xb');
if ($output === false) throw new RuntimeException('Could not create new release bundle.');
try {
    $input = fopen($source, 'rb');
    if ($input === false) throw new RuntimeException('Could not read original export.');
    try {
        if (stream_copy_to_stream($input, $output) === false) throw new RuntimeException('Could not copy source bundle.');
    } finally {
        fclose($input);
    }
} finally {
    fclose($output);
}
if ($archive->open($destination) !== true) throw new RuntimeException('Could not open release bundle.');
try {
    if (!$archive->addFile($content.'/case.json', 'case.json')) throw new RuntimeException('Could not write corrected manifest.');
} finally {
    if (!$archive->close()) throw new RuntimeException('Could not finalize release bundle.');
}
echo 'Release bundle SHA-256: '.hash_file('sha256', $destination).PHP_EOL;
