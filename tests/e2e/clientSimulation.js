import { runMasterE2ERunner } from './master_e2e_runner.js';
runMasterE2ERunner().then((res) => { process.exit(res.success ? 0 : 1); });
