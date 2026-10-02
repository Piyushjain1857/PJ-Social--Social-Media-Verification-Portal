/**
 * Dynamic Level Engine Unit & Integration Test Suite
 *
 * Verifies the authoritative backend level calculation service (levelService.js):
 * 1. Supports different XP requirements for every level.
 *    Example: Level 1 = 100 XP, Level 2 = 150 XP, Level 3 = 250 XP, Level 4 = 500 XP.
 *    Cumulative thresholds:
 *    Level 1: 0–99
 *    Level 2: 100–249
 *    Level 3: 250–499
 *    Level 4: 500–999
 * 2. Returns all 10 authoritative properties:
 *    - currentLevel
 *    - levelName
 *    - currentLevelStartXP
 *    - currentLevelEndXP
 *    - nextLevel
 *    - nextLevelStartXP
 *    - xpIntoLevel
 *    - xpRequiredForLevel
 *    - xpRemaining
 *    - progressPercentage
 * 3. Handles:
 *    - 0 XP
 *    - Exact threshold
 *    - One XP before threshold
 *    - One XP after threshold
 *    - Maximum level (at start, midway, exact end, and overflow)
 *    - No active levels (empty or missing)
 *    - Deactivated levels (isActive: false properly excluded)
 * 4. Verifies database level integration & single authoritative implementation
 */

const assert = require('assert');
const {
  calculateUserLevel,
  buildLevelThresholds,
  getLevelProgress,
  getActiveLevels
} = require('../services/levelService');

// The exact example configuration from user requirements:
const EXAMPLE_TIERS = [
  { levelNumber: 1, name: 'Novice', xpRequired: 100, icon: '🌱', isActive: true },
  { levelNumber: 2, name: 'Explorer', xpRequired: 150, icon: '🧭', isActive: true },
  { levelNumber: 3, name: 'Scout', xpRequired: 250, icon: '🔍', isActive: true },
  { levelNumber: 4, name: 'Pathfinder', xpRequired: 500, icon: '🗺️', isActive: true }
];

async function runLevelEngineTests() {
  console.log('\n======================================================');
  console.log('🎮 AUTHORITATIVE DYNAMIC LEVEL ENGINE TEST SUITE');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // 1. Threshold Building & Dynamic XP Requirements
  // --------------------------------------------------------------------------
  console.log('--- 1. Testing Cumulative Thresholds Calculation ---');
  const thresholds = buildLevelThresholds(EXAMPLE_TIERS);
  assert.strictEqual(thresholds.length, 4, 'Must build exactly 4 thresholds');

  // Level 1: 0–99
  assert.strictEqual(thresholds[0].cumulativeStartXP, 0, 'Level 1 start XP must be 0');
  assert.strictEqual(thresholds[0].cumulativeEndXP, 99, 'Level 1 end XP must be 99');
  assert.strictEqual(thresholds[0].xpRequired, 100, 'Level 1 xpRequired must be 100');

  // Level 2: 100–249
  assert.strictEqual(thresholds[1].cumulativeStartXP, 100, 'Level 2 start XP must be 100');
  assert.strictEqual(thresholds[1].cumulativeEndXP, 249, 'Level 2 end XP must be 249');
  assert.strictEqual(thresholds[1].xpRequired, 150, 'Level 2 xpRequired must be 150');

  // Level 3: 250–499
  assert.strictEqual(thresholds[2].cumulativeStartXP, 250, 'Level 3 start XP must be 250');
  assert.strictEqual(thresholds[2].cumulativeEndXP, 499, 'Level 3 end XP must be 499');
  assert.strictEqual(thresholds[2].xpRequired, 250, 'Level 3 xpRequired must be 250');

  // Level 4: 500–999
  assert.strictEqual(thresholds[3].cumulativeStartXP, 500, 'Level 4 start XP must be 500');
  assert.strictEqual(thresholds[3].cumulativeEndXP, 999, 'Level 4 end XP must be 999');
  assert.strictEqual(thresholds[3].xpRequired, 500, 'Level 4 xpRequired must be 500');
  console.log('✓ Cumulative thresholds verified: 0-99, 100-249, 250-499, 500-999');

  // --------------------------------------------------------------------------
  // 2. Testing 0 XP
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing 0 XP Handling ---');
  const res0 = calculateUserLevel(0, EXAMPLE_TIERS);
  assert.strictEqual(res0.currentLevel, 1, '0 XP must be Level 1');
  assert.strictEqual(res0.levelName, 'Novice');
  assert.strictEqual(res0.currentLevelStartXP, 0);
  assert.strictEqual(res0.currentLevelEndXP, 99);
  assert.strictEqual(res0.nextLevel, 2);
  assert.strictEqual(res0.nextLevelStartXP, 100);
  assert.strictEqual(res0.xpIntoLevel, 0);
  assert.strictEqual(res0.xpRequiredForLevel, 100);
  assert.strictEqual(res0.xpRemaining, 100);
  assert.strictEqual(res0.progressPercentage, 0);
  console.log('✓ 0 XP: Level 1 (0/100 XP, 100 remaining, 0% progress)');

  // --------------------------------------------------------------------------
  // 3. Testing Exact Threshold Transitions
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing Exact Threshold Transitions ---');
  
  // Exact transition to Level 2 (100 XP)
  const res100 = calculateUserLevel(100, EXAMPLE_TIERS);
  assert.strictEqual(res100.currentLevel, 2, '100 XP must transition to Level 2');
  assert.strictEqual(res100.levelName, 'Explorer');
  assert.strictEqual(res100.currentLevelStartXP, 100);
  assert.strictEqual(res100.currentLevelEndXP, 249);
  assert.strictEqual(res100.nextLevel, 3);
  assert.strictEqual(res100.nextLevelStartXP, 250);
  assert.strictEqual(res100.xpIntoLevel, 0);
  assert.strictEqual(res100.xpRequiredForLevel, 150);
  assert.strictEqual(res100.xpRemaining, 150);
  assert.strictEqual(res100.progressPercentage, 0);
  console.log('✓ Exact threshold 100 XP: Level 2 (0/150 XP, 150 remaining, 0% progress)');

  // Exact transition to Level 3 (250 XP)
  const res250 = calculateUserLevel(250, EXAMPLE_TIERS);
  assert.strictEqual(res250.currentLevel, 3, '250 XP must transition to Level 3');
  assert.strictEqual(res250.levelName, 'Scout');
  assert.strictEqual(res250.currentLevelStartXP, 250);
  assert.strictEqual(res250.currentLevelEndXP, 499);
  assert.strictEqual(res250.nextLevel, 4);
  assert.strictEqual(res250.nextLevelStartXP, 500);
  assert.strictEqual(res250.xpIntoLevel, 0);
  assert.strictEqual(res250.xpRequiredForLevel, 250);
  assert.strictEqual(res250.xpRemaining, 250);
  assert.strictEqual(res250.progressPercentage, 0);
  console.log('✓ Exact threshold 250 XP: Level 3 (0/250 XP, 250 remaining, 0% progress)');

  // Exact transition to Level 4 (500 XP)
  const res500 = calculateUserLevel(500, EXAMPLE_TIERS);
  assert.strictEqual(res500.currentLevel, 4, '500 XP must transition to Level 4');
  assert.strictEqual(res500.levelName, 'Pathfinder');
  assert.strictEqual(res500.currentLevelStartXP, 500);
  assert.strictEqual(res500.currentLevelEndXP, 999);
  assert.strictEqual(res500.nextLevel, null);
  assert.strictEqual(res500.nextLevelStartXP, null);
  assert.strictEqual(res500.xpIntoLevel, 0);
  assert.strictEqual(res500.xpRequiredForLevel, 500);
  assert.strictEqual(res500.xpRemaining, 500);
  assert.strictEqual(res500.progressPercentage, 0);
  console.log('✓ Exact threshold 500 XP: Level 4 Max (0/500 XP, 500 remaining, 0% progress)');

  // --------------------------------------------------------------------------
  // 4. Testing One XP Before Threshold
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testing One XP Before Threshold ---');

  // 99 XP (1 XP before Level 2 threshold of 100 XP)
  const res99 = calculateUserLevel(99, EXAMPLE_TIERS);
  assert.strictEqual(res99.currentLevel, 1, '99 XP must remain Level 1');
  assert.strictEqual(res99.levelName, 'Novice');
  assert.strictEqual(res99.currentLevelStartXP, 0);
  assert.strictEqual(res99.currentLevelEndXP, 99);
  assert.strictEqual(res99.nextLevel, 2);
  assert.strictEqual(res99.nextLevelStartXP, 100);
  assert.strictEqual(res99.xpIntoLevel, 99);
  assert.strictEqual(res99.xpRequiredForLevel, 100);
  assert.strictEqual(res99.xpRemaining, 1, 'Exactly 1 XP remaining to next level');
  assert.strictEqual(res99.progressPercentage, 99);
  console.log('✓ One XP before threshold (99 XP): Level 1, xpRemaining = 1, progress = 99%');

  // 249 XP (1 XP before Level 3 threshold of 250 XP)
  const res249 = calculateUserLevel(249, EXAMPLE_TIERS);
  assert.strictEqual(res249.currentLevel, 2, '249 XP must remain Level 2');
  assert.strictEqual(res249.levelName, 'Explorer');
  assert.strictEqual(res249.currentLevelStartXP, 100);
  assert.strictEqual(res249.currentLevelEndXP, 249);
  assert.strictEqual(res249.nextLevel, 3);
  assert.strictEqual(res249.nextLevelStartXP, 250);
  assert.strictEqual(res249.xpIntoLevel, 149);
  assert.strictEqual(res249.xpRequiredForLevel, 150);
  assert.strictEqual(res249.xpRemaining, 1, 'Exactly 1 XP remaining to next level');
  assert.strictEqual(res249.progressPercentage, 99);
  console.log('✓ One XP before threshold (249 XP): Level 2, xpRemaining = 1, progress = 99%');

  // 499 XP (1 XP before Level 4 threshold of 500 XP)
  const res499 = calculateUserLevel(499, EXAMPLE_TIERS);
  assert.strictEqual(res499.currentLevel, 3, '499 XP must remain Level 3');
  assert.strictEqual(res499.levelName, 'Scout');
  assert.strictEqual(res499.currentLevelStartXP, 250);
  assert.strictEqual(res499.currentLevelEndXP, 499);
  assert.strictEqual(res499.nextLevel, 4);
  assert.strictEqual(res499.nextLevelStartXP, 500);
  assert.strictEqual(res499.xpIntoLevel, 249);
  assert.strictEqual(res499.xpRequiredForLevel, 250);
  assert.strictEqual(res499.xpRemaining, 1, 'Exactly 1 XP remaining to next level');
  assert.strictEqual(res499.progressPercentage, 99);
  console.log('✓ One XP before threshold (499 XP): Level 3, xpRemaining = 1, progress = 99%');

  // --------------------------------------------------------------------------
  // 5. Testing One XP After Threshold
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testing One XP After Threshold ---');

  // 101 XP (1 XP after Level 2 threshold of 100 XP)
  const res101 = calculateUserLevel(101, EXAMPLE_TIERS);
  assert.strictEqual(res101.currentLevel, 2, '101 XP must be Level 2');
  assert.strictEqual(res101.levelName, 'Explorer');
  assert.strictEqual(res101.currentLevelStartXP, 100);
  assert.strictEqual(res101.currentLevelEndXP, 249);
  assert.strictEqual(res101.nextLevel, 3);
  assert.strictEqual(res101.nextLevelStartXP, 250);
  assert.strictEqual(res101.xpIntoLevel, 1);
  assert.strictEqual(res101.xpRequiredForLevel, 150);
  assert.strictEqual(res101.xpRemaining, 149);
  assert.strictEqual(res101.progressPercentage, 0);
  console.log('✓ One XP after threshold (101 XP): Level 2, xpIntoLevel = 1, xpRemaining = 149, progress = 0%');

  // 251 XP (1 XP after Level 3 threshold of 250 XP)
  const res251 = calculateUserLevel(251, EXAMPLE_TIERS);
  assert.strictEqual(res251.currentLevel, 3, '251 XP must be Level 3');
  assert.strictEqual(res251.levelName, 'Scout');
  assert.strictEqual(res251.currentLevelStartXP, 250);
  assert.strictEqual(res251.currentLevelEndXP, 499);
  assert.strictEqual(res251.nextLevel, 4);
  assert.strictEqual(res251.nextLevelStartXP, 500);
  assert.strictEqual(res251.xpIntoLevel, 1);
  assert.strictEqual(res251.xpRequiredForLevel, 250);
  assert.strictEqual(res251.xpRemaining, 249);
  assert.strictEqual(res251.progressPercentage, 0);
  console.log('✓ One XP after threshold (251 XP): Level 3, xpIntoLevel = 1, xpRemaining = 249, progress = 0%');

  // --------------------------------------------------------------------------
  // 6. Testing Maximum Level Scenarios
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Testing Maximum Level Scenarios ---');

  // 750 XP (Midway through Level 4: 500-999)
  const res750 = calculateUserLevel(750, EXAMPLE_TIERS);
  assert.strictEqual(res750.currentLevel, 4);
  assert.strictEqual(res750.levelName, 'Pathfinder');
  assert.strictEqual(res750.currentLevelStartXP, 500);
  assert.strictEqual(res750.currentLevelEndXP, 999);
  assert.strictEqual(res750.nextLevel, null);
  assert.strictEqual(res750.nextLevelStartXP, null);
  assert.strictEqual(res750.xpIntoLevel, 250);
  assert.strictEqual(res750.xpRequiredForLevel, 500);
  assert.strictEqual(res750.xpRemaining, 250);
  assert.strictEqual(res750.progressPercentage, 50);
  assert.strictEqual(res750.isMaxLevel, true);
  console.log('✓ Maximum Level Midway (750 XP): Level 4, 50% progress, 250 remaining, isMaxLevel = true');

  // 999 XP (Exact end of Level 4)
  const res999 = calculateUserLevel(999, EXAMPLE_TIERS);
  assert.strictEqual(res999.currentLevel, 4);
  assert.strictEqual(res999.currentLevelStartXP, 500);
  assert.strictEqual(res999.currentLevelEndXP, 999);
  assert.strictEqual(res999.nextLevel, null);
  assert.strictEqual(res999.nextLevelStartXP, null);
  assert.strictEqual(res999.xpIntoLevel, 499);
  assert.strictEqual(res999.xpRequiredForLevel, 500);
  assert.strictEqual(res999.xpRemaining, 1);
  assert.strictEqual(res999.progressPercentage, 99);
  assert.strictEqual(res999.isMaxLevel, true);
  console.log('✓ Maximum Level End (999 XP): Level 4, 99% progress, 1 remaining, isMaxLevel = true');

  // 1000+ XP (Beyond Max Level: overflow)
  const res1500 = calculateUserLevel(1500, EXAMPLE_TIERS);
  assert.strictEqual(res1500.currentLevel, 4);
  assert.strictEqual(res1500.currentLevelStartXP, 500);
  assert.strictEqual(res1500.currentLevelEndXP, 999);
  assert.strictEqual(res1500.nextLevel, null);
  assert.strictEqual(res1500.nextLevelStartXP, null);
  assert.strictEqual(res1500.xpIntoLevel, 1000);
  assert.strictEqual(res1500.xpRequiredForLevel, 500);
  assert.strictEqual(res1500.xpRemaining, 0);
  assert.strictEqual(res1500.progressPercentage, 100);
  assert.strictEqual(res1500.isMaxLevel, true);
  console.log('✓ Maximum Level Overflow (1500 XP): Level 4, 100% progress, 0 remaining, isMaxLevel = true');

  // --------------------------------------------------------------------------
  // 7. Testing No Active Levels
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Testing No Active Levels Handling ---');
  const resEmpty = calculateUserLevel(120, []);
  assert.strictEqual(resEmpty.currentLevel, 1, 'Empty levels must return safe Level 1');
  assert.strictEqual(resEmpty.levelName, 'Novice');
  assert.strictEqual(resEmpty.currentLevelStartXP, 0);
  assert.strictEqual(resEmpty.currentLevelEndXP, 0);
  assert.strictEqual(resEmpty.nextLevel, null);
  assert.strictEqual(resEmpty.nextLevelStartXP, null);
  assert.strictEqual(resEmpty.xpIntoLevel, 0);
  assert.strictEqual(resEmpty.xpRequiredForLevel, 0);
  assert.strictEqual(resEmpty.xpRemaining, 0);
  assert.strictEqual(resEmpty.progressPercentage, 0);
  console.log('✓ No active levels: Handled safely without runtime crashes or NaN errors');

  // --------------------------------------------------------------------------
  // 8. Testing Deactivated Levels Exclusion
  // --------------------------------------------------------------------------
  console.log('\n--- 8. Testing Deactivated Levels Exclusion ---');
  const mixedTiers = [
    { levelNumber: 1, name: 'Novice', xpRequired: 100, isActive: true },
    { levelNumber: 2, name: 'Deactivated Explorer', xpRequired: 150, isActive: false }, // Should be excluded!
    { levelNumber: 3, name: 'Scout', xpRequired: 250, isActive: true }
  ];

  const mixedThresholds = buildLevelThresholds(mixedTiers);
  assert.strictEqual(mixedThresholds.length, 2, 'Only active levels must be included in thresholds');
  assert.strictEqual(mixedThresholds[0].levelNumber, 1);
  assert.strictEqual(mixedThresholds[0].cumulativeStartXP, 0);
  assert.strictEqual(mixedThresholds[0].cumulativeEndXP, 99);

  // Level 3 should immediately follow Level 1 since Level 2 is deactivated:
  assert.strictEqual(mixedThresholds[1].levelNumber, 3);
  assert.strictEqual(mixedThresholds[1].cumulativeStartXP, 100);
  assert.strictEqual(mixedThresholds[1].cumulativeEndXP, 349);

  // User with 120 XP should be placed in Level 3 (100–349), skipping deactivated Level 2
  const resMixed = calculateUserLevel(120, mixedTiers);
  assert.strictEqual(resMixed.currentLevel, 3, 'User must skip deactivated Level 2 and land on Level 3');
  assert.strictEqual(resMixed.levelName, 'Scout');
  assert.strictEqual(resMixed.currentLevelStartXP, 100);
  assert.strictEqual(resMixed.currentLevelEndXP, 349);
  assert.strictEqual(resMixed.xpIntoLevel, 20);
  assert.strictEqual(resMixed.xpRemaining, 230);
  console.log('✓ Deactivated levels: Correctly excluded; active tiers chain seamlessly (Level 1: 0-99 -> Level 3: 100-349)');

  // --------------------------------------------------------------------------
  // 9. Testing Database Active Levels Integration
  // --------------------------------------------------------------------------
  console.log('\n--- 9. Testing Database Active Levels Integration ---');
  const dbLevels = await getActiveLevels();
  assert(Array.isArray(dbLevels) && dbLevels.length > 0, 'Database levels must return non-empty array');
  const liveRes = calculateUserLevel(820, dbLevels);
  assert.strictEqual(typeof liveRes.currentLevel, 'number');
  assert.strictEqual(typeof liveRes.levelName, 'string');
  assert.strictEqual(typeof liveRes.progressPercentage, 'number');
  console.log(`✓ Database levels integration verified: 820 XP -> Level ${liveRes.currentLevel} (${liveRes.levelName}), Progress: ${liveRes.progressPercentage}%`);

  // --------------------------------------------------------------------------
  // 10. Verification of All 10 Required Return Properties
  // --------------------------------------------------------------------------
  console.log('\n--- 10. Verifying All 10 Authoritative Return Keys ---');
  const requiredKeys = [
    'currentLevel',
    'levelName',
    'currentLevelStartXP',
    'currentLevelEndXP',
    'nextLevel',
    'nextLevelStartXP',
    'xpIntoLevel',
    'xpRequiredForLevel',
    'xpRemaining',
    'progressPercentage'
  ];

  for (const key of requiredKeys) {
    assert(key in res100, `Result object must contain authoritative key: "${key}"`);
  }
  console.log(`✓ All 10 required properties present and validated: ${requiredKeys.join(', ')}`);

  console.log('\n======================================================');
  console.log('🎉 ALL DYNAMIC LEVEL ENGINE TESTS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

if (require.main === module) {
  runLevelEngineTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Dynamic Level Engine test failure:\n', err);
      process.exit(1);
    });
}

module.exports = { runLevelEngineTests };
