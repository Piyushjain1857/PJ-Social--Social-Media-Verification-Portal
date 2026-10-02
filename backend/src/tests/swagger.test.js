const assert = require('assert');

const API_BASE = 'http://localhost:5001/api';

async function testSwagger() {
  console.log('\n======================================================');
  console.log('📖 Testing Swagger UI & OpenAPI Specification');
  console.log('======================================================\n');

  // 1. Test Swagger HTML endpoint
  console.log('--- 1. Testing GET /api/docs/ ---');
  const docsRes = await fetch(`${API_BASE}/docs/`);
  assert.strictEqual(docsRes.status, 200, 'Swagger UI should return 200 OK');
  const html = await docsRes.text();
  assert.ok(html.includes('swagger-ui'), 'Swagger UI HTML must contain swagger-ui');
  assert.ok(html.includes('PJ Social'), 'Swagger UI must contain custom title/branding');
  console.log('✓ /api/docs/ successfully serves interactive Swagger UI HTML');

  // 2. Test OpenAPI JSON specification
  console.log('\n--- 2. Testing GET /api/docs/json ---');
  const jsonRes = await fetch(`${API_BASE}/docs/json`);
  assert.strictEqual(jsonRes.status, 200, 'Swagger JSON should return 200 OK');
  const spec = await jsonRes.json();
  assert.strictEqual(spec.openapi, '3.0.0');
  assert.ok(spec.info && spec.info.title.includes('PJ Social'));
  assert.ok(spec.paths['/gamification/me'], 'OpenAPI spec must document /gamification/me');
  assert.ok(spec.paths['/gamification/me/rank'], 'OpenAPI spec must document /gamification/me/rank');
  assert.ok(spec.paths['/gamification/me/chart'], 'OpenAPI spec must document /gamification/me/chart');
  assert.ok(spec.paths['/gamification/me/rank-history'], 'OpenAPI spec must document /gamification/me/rank-history');
  assert.ok(spec.components.securitySchemes.BearerAuth, 'OpenAPI spec must document BearerAuth JWT');
  console.log(`✓ /api/docs/json serves valid OpenAPI 3.0 specification (${Object.keys(spec.paths).length} endpoints documented)`);

  // 3. Test Top-level /docs redirect
  console.log('\n--- 3. Testing GET /docs Redirect ---');
  const redirectRes = await fetch('http://localhost:5001/docs', { redirect: 'manual' });
  assert.strictEqual(redirectRes.status, 302, '/docs should redirect to /api/docs');
  console.log('✓ /docs redirects to /api/docs');

  console.log('\n======================================================');
  console.log('🎉 ALL SWAGGER DOCUMENTATION TESTS PASSED!');
  console.log('======================================================\n');
}

testSwagger()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Swagger test failed:', err);
    process.exit(1);
  });
