import subprocess
result = subprocess.run(['node', 'src/web/scripts_B/explore_page.js'], cwd='/', capture_output=True, text=True, timeout=60)
print("=== STDOUT ===")
print(result.stdout)
print("=== STDERR ===")
print(result.stderr)
print("=== RETURN CODE ===")
print(result.returncode)
