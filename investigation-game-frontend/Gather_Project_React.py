import os

def gather_project_code(root_dir, output_file):
    # Aggressively ignore directories that bloat the AI context window
    # Skipping build folders, heavy vendor packages, public assets, and custom asset folders
    ignore_dirs = {
        '.git', '.vscode', 'node_modules', 'public', 
        'dist', 'build', 'Assesssts'
    }
    
    # Focus purely on TypeScript and React/JavaScript files
    allowed_extensions = {'.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.html'}
    
    # Explicitly include crucial configuration files regardless of extension
    allowed_files = {
        'package.json', 'tsconfig.json', 'tsconfig.app.json', 
        'tsconfig.node.json', 'vite.config.ts', 'eslint.config.js', 
        'index.html', 'README.md', '.env.example'
    }
    
    # Initialize our counter
    successful_files = 0

    print(f"Scanning React project at: {root_dir}...\n")

    with open(output_file, 'w', encoding='utf-8') as outfile:
        output_file_name = os.path.basename(output_file)
        
        outfile.write("REACT PROJECT ARCHITECTURE SNAPSHOT\n")
        outfile.write("=====================================\n\n")

        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Modify dirnames in-place to skip ignored directories
            dirnames[:] = [d for d in dirnames if d not in ignore_dirs]

            for filename in filenames:
                # Skip the output file itself and package-lock to prevent bloat/infinite loops
                if filename == output_file_name or filename == 'package-lock.json':
                    continue
                    
                # Check if the file is a TS/JS file OR a specifically allowed config file
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
    # Point this directly to the React application folder inside your frontend directory
    project_root = r"D:\Laravel\investigation-game\investigation-game-frontend" 
    
    # The name of the text file you want to generate
    output_filename = "lean_react_dump.txt"
    
    gather_project_code(project_root, output_filename)