import os
import re

def generate_tree(dir_path, ignore_dirs, prefix=""):
    """Generates an ASCII directory tree for the LLM table of contents."""
    tree_str = ""
    try:
        entries = sorted(os.listdir(dir_path))
    except PermissionError:
        return ""
    
    entries = [e for e in entries if e not in ignore_dirs and not e.startswith('.')]
    entries_count = len(entries)
    
    for index, entry in enumerate(entries):
        path = os.path.join(dir_path, entry)
        connector = "└── " if index == entries_count - 1 else "├── "
        tree_str += f"{prefix}{connector}{entry}\n"
        
        if os.path.isdir(path):
            extension = "    " if index == entries_count - 1 else "│   "
            tree_str += generate_tree(path, ignore_dirs, prefix + extension)
            
    return tree_str

def clean_code(content):
    """Reduces empty lines and redundant whitespace to conserve tokens."""
    content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content)
    content = "\n".join(line.rstrip() for line in content.splitlines())
    return content.strip()

def gather_project_code(root_dir, output_file):
    ignore_dirs = {
        '.git', '.vscode', '.idea', 'vendor', 'node_modules', 
        'storage', 'public', 'cache', 'coverage', '.husky'
    }
    
    allowed_extensions = {'.php', '.json', '.yml', '.yaml'}
    
    allowed_config_files = {
        'composer.json', '.env.example', 'README.md'
    }
    
    ignored_patterns = {'.test.', '.spec.', 'Test.php'}
    
    successful_files = 0
    total_chars = 0
    skipped_log = []
    
    print(f"Scanning Laravel project at: {root_dir}...\n")

    with open(output_file, 'w', encoding='utf-8') as outfile:
        
        outfile.write("<system_directives>\n")
        outfile.write("  <rule>Read this entire document carefully. Do NOT assume code is missing. Never use placeholders like `...` or `// rest of the code` in your responses. Write complete, fully functional blocks.</rule>\n")
        outfile.write("  <rule>Strictly adhere to Clean Architecture, SOLID principles, Dependency Injection, and the Repository/Service layer patterns. Maintain strict Separation of Concerns: keep HTTP handling/validation in Controllers/FormRequests, business logic in Services, and data persistence in Repositories/Models.</rule>\n")
        outfile.write("  <rule>When proposing backend modifications, respect Eloquent relationship definitions, database schema constraints (migrations), Form Request validation rules, and API response structures present in this codebase.</rule>\n")
        outfile.write("  <rule>Rely ONLY on explicit models, services, events, broadcasting channels, and helpers provided in this context. Do not hallucinate uninstalled packages or non-existent methods.</rule>\n")
        outfile.write("  <rule>For real-time WebSocket events or broadcasting listeners, ensure payload keys match expected client-side data contracts.</rule>\n")
        outfile.write("</system_directives>\n\n")

        outfile.write("<project_context>\n")
        outfile.write(f"  <root_directory>{os.path.basename(os.path.abspath(root_dir))}</root_directory>\n")
        outfile.write("  <directory_structure>\n")
        outfile.write(generate_tree(root_dir, ignore_dirs))
        outfile.write("  </directory_structure>\n")
        outfile.write("</project_context>\n\n")

        outfile.write("<source_code>\n")
        
        for dirpath, dirnames, filenames in os.walk(root_dir):
            dirnames[:] = [d for d in dirnames if d not in ignore_dirs and not d.startswith('.')]

            for filename in sorted(filenames):
                filepath = os.path.join(dirpath, filename)
                relative_path = os.path.relpath(filepath, root_dir).replace("\\", "/")

                if filename in {'composer.lock', 'package-lock.json', 'yarn.lock'}:
                    skipped_log.append(f"[LOCKFILE] {relative_path}")
                    continue
                
                if any(pattern in filename for pattern in ignored_patterns):
                    skipped_log.append(f"[IGNORED PATTERN] {relative_path}")
                    continue

                is_allowed_ext = any(filename.endswith(ext) for ext in allowed_extensions)
                is_allowed_file = filename in allowed_config_files

                if not (is_allowed_ext or is_allowed_file):
                    skipped_log.append(f"[UNALLOWED EXT/FILE] {relative_path}")
                    continue
                    
                if os.path.getsize(filepath) > 80 * 1024:
                    skipped_log.append(f"[EXCEEDS 80KB] {relative_path}")
                    continue
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                    cleaned_content = clean_code(content)
                    
                    outfile.write(f'<file path="{relative_path}">\n')
                    outfile.write(cleaned_content)
                    outfile.write("\n</file>\n\n")
                    
                    successful_files += 1
                    total_chars += len(cleaned_content)
                    print(f"[PACKED] {relative_path}")
                    
                except Exception as e:
                    print(f"[ERROR] Could not read {relative_path}: {e}")

        outfile.write("</source_code>\n")

    # Output skipped files directly to the terminal
    print("\n" + "-" * 50)
    print("SKIPPED FILES LOG")
    print("-" * 50)
    if skipped_log:
        for log in skipped_log:
            print(log)
    else:
        print("No files were skipped.")

    estimated_tokens = total_chars // 4
    print("\n" + "=" * 50)
    print("AI BACKEND CONTEXT DUMP COMPLETE!")
    print(f"Files Packed: {successful_files}")
    print(f"Estimated Tokens: ~{estimated_tokens:,}")
    print(f"Main Output: {output_file}")
    print("=" * 50)

if __name__ == "__main__":
    project_root = r"D:\Laravel\investigation-game\investigation-game-backend" 
    output_filename = "ai_backend_project_context.xml"
    
    gather_project_code(project_root, output_filename)