import { spawn } from 'node:child_process';

console.log('\x1b[36m%s\x1b[0m', '========================================================');
console.log('\x1b[33m%s\x1b[0m', '  Starting Parakh (The Memory of Every Brand Decision)  ');
console.log('\x1b[36m%s\x1b[0m', '========================================================');
console.log('🚀 Open App in Browser: http://localhost:5173');
console.log('   Alternative link:    http://127.0.0.1:5173');
console.log('⚡ Backend API Server:   http://localhost:4000\n');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// Spawn Backend Server
const server = spawn(npmCmd, ['run', 'dev'], {
  cwd: './server',
  stdio: 'inherit',
  shell: true
});

// Spawn Frontend Web
const web = spawn(npmCmd, ['run', 'dev'], {
  cwd: './web',
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\nStopping Parakh services...');
  server.kill();
  web.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
