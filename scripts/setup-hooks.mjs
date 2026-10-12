import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const gitDir = new URL('../.git', import.meta.url);

if (!existsSync(gitDir)) {
  // Not a git checkout (e.g. Docker build context) - nothing to configure.
  process.exit(0);
}

try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
    stdio: 'inherit',
  });
} catch {
  // Never fail installation because git hooks could not be configured.
}
