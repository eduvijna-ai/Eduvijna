import { existsSync } from 'node:fs';
import { spawnSync, execSync } from 'node:child_process';

function javaMajorFromHome(javaHome) {
  if (!javaHome) return null;
  const javaExe = `${javaHome.replace(/[/\\]+$/, '')}\\bin\\java.exe`;
  if (!existsSync(javaExe)) return null;
  const ver = spawnSync(javaExe, ['-version'], { encoding: 'utf8' });
  const text = `${ver.stdout || ''}${ver.stderr || ''}`;
  const m = /version "(\d+)/.exec(text);
  return m ? Number(m[1]) : null;
}

/** Maestro 2.x requires Java 17+. Prefer JDK 17+ even when JAVA_HOME points at older JDK. */
export function resolveMaestroJavaHome() {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(process.env.JAVA_HOME);
  try {
    const lines = execSync('where java', { encoding: 'utf8', shell: true })
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    for (const javaPath of lines) {
      const home = javaPath.replace(/\\bin\\java\.exe$/i, '').replace(/\\bin\\java$/i, '');
      if (home) candidates.push(home);
    }
  } catch {
    /* optional */
  }
  candidates.push('C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.17.10-hotspot');

  const seen = new Set();
  for (const home of candidates) {
    const key = home.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const major = javaMajorFromHome(home);
    if (major != null && major >= 17) return home;
  }
  return process.env.JAVA_HOME || null;
}
