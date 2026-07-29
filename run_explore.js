const { execSync } = require('child_process');
try {
  const result = execSync('node src/web/scripts_B/explore_page.js', { 
    cwd: '/', 
    encoding: 'utf-8', 
    timeout: 60000,
    maxBuffer: 10 * 1024 * 1024
  });
  console.log(result);
} catch (err) {
  console.error('STDOUT:', err.stdout);
  console.error('STDERR:', err.stderr);
  console.error('Error:', err.message);
}
