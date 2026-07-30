import os

def gather_project_code(root_dir, output_file):
    # Ignoring heavy folders and asset directories
    ignore_dirs = {
        '.git', '.vscode', '.idea', 'node_modules', 'public', 
        'dist', 'build', 'Assesssts', 'Assets', 'assets', 'images', 'fonts', 'coverage'
    }
    
    # CSS and SCSS are back in the mix
    allowed_extensions = {'.ts', '.tsx', '.js', '.jsx', '.css', '.scss'}
    
    allowed_files = {
        'package.json', 'tsconfig.json', 'tsconfig.app.json', 
        'tsconfig.node.json', 'vite.config.ts', 'eslint.config.js', 
        'index.html', 'README.md', '.env.example'
    }
    
    successful_files = 0
    print(f"Scanning React project at: {root_dir}...\n")

    with open(output_file, 'w', encoding='utf-8') as outfile:
        output_file_name = os.path.basename(output_file)
        
        outfile.write("REACT PROJECT ARCHITECTURE SNAPSHOT\n")
        outfile.write("=====================================\n\n")

        for dirpath, dirnames, filenames in os.walk(root_dir):
            dirnames[:] = [d for d in dirnames if d not in ignore_dirs]

            for filename in filenames:
                if filename in (output_file_name, 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'):
                    continue
                    
                is_allowed_ext = any(filename.endswith(ext) for ext in allowed_extensions)
                is_allowed_file = filename in allowed_files

                if is_allowed_ext or is_allowed_file:
                    filepath = os.path.join(dirpath, filename)
                    
                    # SAFETY CHECK: Skip files larger than 100KB to block massive compiled CSS
                    if os.path.getsize(filepath) > 100 * 1024:
                        print(f"[SKIPPED] {filepath} (Exceeds 100KB size limit)")
                        continue
                    
                    try:
                        with open(filepath, 'r', encoding='utf-8') as infile:
                            content = infile.read()
                            
                        outfile.write(f"\nFILE: {filepath}\n")
                        outfile.write("-" * 40 + "\n")
                        outfile.write(content)
                        outfile.write("\n\n")
                        
                        print(f"[SUCCESS] Dumped: {filepath}")
                        successful_files += 1
                        
                    except Exception as e:
                        print(f"[ERROR] Could not read {filepath}: {e}")

    print("\n" + "="*50)
    print("DUMP COMPLETE!")
    print(f"Total files successfully dumped: {successful_files}")
    print(f"Output saved to: {output_file}")
    print("="*50)

if __name__ == "__main__":
    project_root = r"D:\Laravel\investigation-game\investigation-game-frontend" 
    output_filename = "lean_react_dump.txt"
    
    gather_project_code(project_root, output_filename)