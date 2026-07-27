import os

def gather_project_code(root_dir, output_file):
    # Aggressively ignore directories that bloat the AI context window
    # Skipping frontend views, heavy vendor packages, logs, and compiled assets
    ignore_dirs = {
        '.git', '.vscode', 'vendor', 'node_modules', 
        'storage', 'bootstrap', 'public', 'tests', 'resources'
    }
    
    # Focus purely on PHP backend files
    allowed_extensions = {'.php'}
    
    # Explicitly include crucial configuration files regardless of extension
    allowed_files = {'composer.json', '.env.example', 'README.md'}
    
    # Initialize our counter
    successful_files = 0

    print(f"Scanning Laravel project at: {root_dir}...\n")

    with open(output_file, 'w', encoding='utf-8') as outfile:
        output_file_name = os.path.basename(output_file)
        
        outfile.write("LARAVEL PROJECT ARCHITECTURE SNAPSHOT\n")
        outfile.write("=====================================\n\n")

        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Modify dirnames in-place to skip ignored directories
            dirnames[:] = [d for d in dirnames if d not in ignore_dirs]

            for filename in filenames:
                # Skip the output file itself to prevent infinite loops
                if filename == output_file_name:
                    continue
                    
                # Check if the file is a PHP file OR a specifically allowed config file
                is_allowed_ext = any(filename.endswith(ext) for ext in allowed_extensions)
                is_allowed_file = filename in allowed_files

                if is_allowed_ext or is_allowed_file:
                    filepath = os.path.join(dirpath, filename)
                    
                    try:
                        with open(filepath, 'r', encoding='utf-8') as infile:
                            content = infile.read()
                            
                        # Write the file header
                        outfile.write(f"\nFILE: {filepath}\n")
                        outfile.write("-" * 40 + "\n")
                        # Write the file content
                        outfile.write(content)
                        outfile.write("\n\n")
                        
                        # Print the success message to the console and increment the counter
                        print(f"[SUCCESS] Dumped: {filepath}")
                        successful_files += 1
                        
                    except Exception as e:
                        print(f"[ERROR] Could not read {filepath}: {e}")

    # Print the final summary report
    print("\n" + "="*50)
    print("DUMP COMPLETE!")
    print(f"Total files successfully dumped: {successful_files}")
    print(f"Output saved to: {output_file}")
    print("="*50)

if __name__ == "__main__":
    # Point this directly to the INVESTIGATION-GAME root folder
    project_root = r"D:\Laravel\investigation-game\investigation-game-backend" 
    
    # The name of the text file you want to generate
    output_filename = "lean_laravel_dump.txt"
    
    gather_project_code(project_root, output_filename)