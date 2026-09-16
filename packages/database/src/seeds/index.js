/**
 * DenaNeya v2.0 - Master Seeder Entry Point
 */

'use strict';

const { runSeed } = require('./seedRunner.js');
const catalog = require('./gatewayCatalog.seed.js');
const fixtures = require('./demoFixtures.seed.js');

if (require.main === module) {
  runSeed(null, { clean: true, seedAll52: true })
    .then((res) => {
      console.log('[Seeder] Completed:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seeder] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = {
  runSeed,
  catalog,
  fixtures
};
