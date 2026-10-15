/**
 * UI logout + signed-out verification (no API session probes).
 */
export function isLoginScreen(xml) {
  return (
    /login-email-input|resource-id="login-email-input"/.test(xml) ||
    /hint="Email or Username"/.test(xml) ||
    /content-desc="Sign in"/.test(xml)
  );
}

export function isProtectedAppShell(xml) {
  if (isLoginScreen(xml)) return false;
  return (
    /Demo School|content-desc="Assessments"|content-desc="Open navigation menu"/.test(xml) &&
    !/Invalid credentials/i.test(xml)
  );
}

function tapText(adb, xml, text) {
  const m = new RegExp(`text="${text}"[^>]*bounds="([^"]+)"`, 'i').exec(xml);
  if (!m) return false;
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
  adb(`shell input tap ${(Number(c[1]) + Number(c[3])) / 2 | 0} ${(Number(c[2]) + Number(c[4])) / 2 | 0}`);
  return true;
}

function tapContentDesc(adb, xml, desc) {
  const m = new RegExp(`content-desc="${desc}"[^>]*bounds="([^"]+)"`, 'i').exec(xml);
  if (!m) return false;
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
  adb(`shell input tap ${(Number(c[1]) + Number(c[3])) / 2 | 0} ${(Number(c[2]) + Number(c[4])) / 2 | 0}`);
  return true;
}

function confirmLogoutAlert(adb, xml) {
  const btn =
    /text="Logout"[^>]*resource-id="android:id\/button1"[^>]*bounds="([^"]+)"/i.exec(xml) ||
    /resource-id="android:id\/button1"[^>]*bounds="([^"]+)"/i.exec(xml);
  if (!btn) return false;
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(btn[1]);
  adb(`shell input tap ${(Number(c[1]) + Number(c[3])) / 2 | 0} ${(Number(c[2]) + Number(c[4])) / 2 | 0}`);
  return true;
}

/** Tap header profile control (rightmost header icon cluster). */
export function tapHeaderProfile(adb, xml) {
  const cands = [];
  const re = /<node[^>]*clickable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const x1 = Number(m[1]);
    const y1 = Number(m[2]);
    const x2 = Number(m[3]);
    const y2 = Number(m[4]);
    if (y1 < 90 || y2 > 290 || x1 < 600) continue;
    cands.push({
      x1,
      y1,
      x2,
      y2,
      midX: ((x1 + x2) / 2) | 0,
      midY: ((y1 + y2) / 2) | 0,
    });
  }
  cands.sort((a, b) => b.midX - a.midX);
  const profile = cands[0];
  if (profile) {
    adb(`shell input tap ${profile.midX} ${profile.midY}`);
    return true;
  }
  adb('shell input tap 987 185');
  return true;
}

function profileScreenVisible(xml) {
  return /text="Logout"/.test(xml) || (/text="Edit"/.test(xml) && /Profile|full_name|@/i.test(xml));
}

/** Open Profile from main shell (create / notifications / avatar — avatar is rightmost). */
export function openProfileFromShell(h) {
  let xml = h.dumpUi();
  for (let attempt = 0; attempt < 4; attempt++) {
    if (profileScreenVisible(xml)) return { ok: true, xml };
    const cands = [];
    const re = /<node[^>]*clickable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*>/gi;
    let m;
    while ((m = re.exec(xml))) {
      const x1 = Number(m[1]);
      const y1 = Number(m[2]);
      const x2 = Number(m[3]);
      const y2 = Number(m[4]);
      if (y1 < 90 || y2 > 290 || x1 < 600) continue;
      cands.push({ midX: ((x1 + x2) / 2) | 0, midY: ((y1 + y2) / 2) | 0, x1 });
    }
    cands.sort((a, b) => b.x1 - a.x1);
    const tryOrder = cands.slice(0, 3);
    for (const tap of tryOrder) {
      h.adb(`shell input tap ${tap.midX} ${tap.midY}`);
      h.sleep(3500);
      xml = h.dumpUi();
      if (profileScreenVisible(xml)) return { ok: true, xml };
    }
    tapHeaderProfile(h.adb, xml);
    h.sleep(3500);
    xml = h.dumpUi();
    if (profileScreenVisible(xml)) return { ok: true, xml };
  }
  return { ok: false, xml };
}

function escapeTransientRoutes(h) {
  let xml = h.dumpUi();
  for (let i = 0; i < 8; i += 1) {
    if (isLoginScreen(xml)) return xml;
    if (isProtectedAppShell(xml) && !/Validating quiz|No Quiz Available/i.test(xml)) return xml;
    h.adb('shell input keyevent 4');
    h.sleep(900);
    xml = h.dumpUi();
  }
  if (/Validating quiz|No Quiz Available|Quiz Results|60%/.test(xml) && !isLoginScreen(xml)) {
    h.adb('shell am force-stop com.eduvijna.app');
    h.sleep(1000);
    h.adb('shell monkey -p com.eduvijna.app -c android.intent.category.LAUNCHER 1');
    h.sleep(5500);
    xml = h.dumpUi();
  }
  return xml;
}

/**
 * @param {{ adb, sleep, dumpUi, dismissPostLoginInterstitials?, authenticatedMarker? }} h
 */
export function performUiLogout(h) {
  const steps = [];
  h.adb('shell am force-stop com.eduvijna.app');
  h.sleep(800);
  h.adb('shell monkey -p com.eduvijna.app -c android.intent.category.LAUNCHER 1');
  h.sleep(5500);
  let xml = escapeTransientRoutes(h);
  if (h.dismissPostLoginInterstitials?.(xml)) {
    h.sleep(1500);
    xml = h.dumpUi();
  }
  if (isLoginScreen(xml)) {
    steps.push({ step: 'already_on_login' });
    h.adb('shell monkey -p com.eduvijna.app -c android.intent.category.LAUNCHER 1');
    h.sleep(3500);
    xml = h.dumpUi();
    const relaunchLogin = isLoginScreen(xml) && /package="com\.eduvijna\.app"/.test(xml);
    steps.push({
      step: 'relaunch_while_signed_out',
      relaunchLogin,
      protectedLeak: isProtectedAppShell(xml),
    });
    if (!relaunchLogin || isProtectedAppShell(xml)) {
      return { ok: false, reason: 'signed_out_relaunch_failed', steps, xml };
    }
    h.adb('shell input keyevent 4');
    h.sleep(1200);
    xml = h.dumpUi();
    const leftApp = !/package="com\.eduvijna\.app"/.test(xml) || isLoginScreen(xml);
    steps.push({
      step: 'back_from_login',
      leftAppWithoutProtectedShell: leftApp && !isProtectedAppShell(xml),
    });
    if (isProtectedAppShell(xml)) {
      return { ok: false, reason: 'back_reopened_protected_content', steps, xml };
    }
    return { ok: true, alreadySignedOut: true, steps };
  }
  if (!isProtectedAppShell(xml)) {
    h.sleep(3000);
    xml = h.dumpUi();
  }
  tapContentDesc(h.adb, xml, 'Home') || tapContentDesc(h.adb, xml, 'Go to main dashboard');
  h.sleep(2500);
  xml = h.dumpUi();
  steps.push({ step: 'home_tab' });

  const profileNav = openProfileFromShell(h);
  xml = profileNav.xml;
  steps.push({
    step: 'profile_screen',
    profileNavOk: profileNav.ok,
    hasLogout: /text="Logout"/.test(xml),
  });

  if (!profileNav.ok || !/text="Logout"/.test(xml)) {
    return { ok: false, reason: 'logout_control_not_found', steps, xml };
  }
  tapText(h.adb, xml, 'Logout');
  h.sleep(1200);
  xml = h.dumpUi();
  confirmLogoutAlert(h.adb, xml) || tapText(h.adb, xml, 'Logout');
  h.sleep(4000);
  xml = h.dumpUi();
  steps.push({ step: 'after_logout_confirm', loginVisible: isLoginScreen(xml) });

  if (!isLoginScreen(xml)) {
    return { ok: false, reason: 'login_screen_not_visible_after_logout', steps, xml };
  }
  h.adb('shell monkey -p com.eduvijna.app -c android.intent.category.LAUNCHER 1');
  h.sleep(3500);
  xml = h.dumpUi();
  const relaunchLogin = isLoginScreen(xml) && /package="com\.eduvijna\.app"/.test(xml);
  steps.push({
    step: 'relaunch_after_logout',
    relaunchLogin,
    protectedLeak: isProtectedAppShell(xml),
  });
  if (!relaunchLogin || isProtectedAppShell(xml)) {
    return { ok: false, reason: 'session_persisted_after_logout', steps, xml };
  }
  h.adb('shell input keyevent 4');
  h.sleep(1200);
  xml = h.dumpUi();
  const leftApp = !/package="com\.eduvijna\.app"/.test(xml) || isLoginScreen(xml);
  steps.push({ step: 'back_from_login', leftAppWithoutProtectedShell: leftApp && !isProtectedAppShell(xml) });
  if (isProtectedAppShell(xml)) {
    return { ok: false, reason: 'back_reopened_protected_content', steps, xml };
  }
  return { ok: true, steps, xml };
}
