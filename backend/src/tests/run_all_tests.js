/**
 * Master Test Runner for VeriSocial Full-Stack Verification Portal
 * Runs all integration, RBAC, and security test suites sequentially.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const testFiles = [
  'rbac.test.js',
  'security_audit.test.js',
  'workflow.test.js',
  'notification.test.js',
  'official_social_accounts.test.js',
  'profile_management.test.js',
  'superadmin_dashboard.test.js',
  'superadmin_users.test.js'
];

console.log('========================================================');
console.log('   VeriSocial Full-Stack Verification Portal Test Suite  ');
console.log('========================================================\n');

let passedCount = 0;
let failedCount = 0;

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  console.log(`▶ Running suite: ${file}...`);
  const result = spawnSync('node', [filePath], {
    stdio: 'inherit',
    env: process.env
  });

  if (result.status === 0) {
    passedCount++;
    console.log(`✓ ${file} PASSED\n`);
  } else {
    failedCount++;
    console.error(`✕ ${file} FAILED (Exit Code: ${result.status})\n`);
  }
}

console.log('========================================================');
console.log(`Test Execution Summary: ${passedCount} passed, ${failedCount} failed of ${testFiles.length} suites.`);
console.log('========================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL TEST SUITES PASSED SUCCESSFULLY!');
  process.exit(0);
}
