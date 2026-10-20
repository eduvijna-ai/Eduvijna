import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const REQUIRED_MATRIX_STEPS = [
  'load_credentials',
  'login_accounts',
  'create_disposable_fixture',
  'phase1_interrupt_checkpoint',
  'phase2_recover_and_persist',
];

export function evaluateMatrixReport(report, runDir) {
  const evaluationFailures = [];
  let status = report.status === 'pending_credentials' ? 'pending_credentials' : 'passed';

  if (report.status === 'failed') {
    status = 'failed';
  }

  for (const stepId of REQUIRED_MATRIX_STEPS) {
    const row = report.steps?.find((s) => s.step === stepId);
    if (!row) {
      status = 'failed';
      evaluationFailures.push(`missing_required_step:${stepId}`);
      continue;
    }
    if (row.status !== 'passed') {
      status = 'failed';
      evaluationFailures.push(`required_step_not_passed:${stepId}`);
    }
  }

  if (!existsSync(join(runDir, 'phase1.ok'))) {
    status = 'failed';
    evaluationFailures.push('missing_marker:phase1.ok');
  }
  if (!existsSync(join(runDir, 'phase2.ok'))) {
    status = 'failed';
    evaluationFailures.push('missing_marker:phase2.ok');
  }

  return { status, evaluationFailures };
}
