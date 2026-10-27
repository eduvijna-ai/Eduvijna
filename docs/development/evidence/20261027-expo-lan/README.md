# Evidence — 2026-10-27 Expo LAN + emulator

Captured during environment setup (no app bug fixes).

| Artifact | Notes |
|----------|--------|
| `emulator-live.png` | Expo Go splash; banner **Loading from 10.147.219.97:8082…** |
| `emulator-eduvijna-screen.png` / `emulator-eduvijna-final.png` / `emulator-postbundle.png` / `screen-*.png` | Emulator framebuffer during Mode A loads |
| `emulator-modeb-metro-live.png` | Emulator while Mode B Metro (`--dev-client`) was serving |
| `*.xml` | UIAutomator dumps (Expo Go / EduVijna text) |

Metro probes (Windows + emulator `nc`): `packager-status:running` on `127.0.0.1:8082`, `10.147.219.97:8082`, and from emulator via `10.0.2.2` and LAN IP.

Full report: `docs/development/EXPO_LAN_EMULATOR_SETUP_20261027.md`
