# AGENTS.md

## Cursor Cloud specific instructions

React Native (Expo) app for "Blair County Resources". The real project lives in the
`agency-app/` subdirectory (the repo-root `package-lock.json` is a 93-byte stub). Run all
`npm`/`expo` commands from `agency-app/`. There are no automated tests or lint configs.

### Running
```
cd agency-app
npx expo start --web --port 8082    # browser target (only viable one in a headless VM)
# or: npx expo start / --android / --ios for a device, simulator, or Expo Go
```
The app reads `EXPO_PUBLIC_API_BASE` (see `agency-app/.env.example`) for the FastAPI backend
URL. Create `agency-app/.env` (gitignored). For the web target on the same host use
`http://localhost:8000`; for a physical device via Expo Go use the machine's LAN IP.

Web support requires `react-dom`, `react-native-web`, and `@expo/metro-runtime` (already in
`package.json`). If missing, add them with `npx expo install react-dom react-native-web @expo/metro-runtime`.

### CORS gotcha (web target only)
The FastAPI backend (`../bcs-fastapi/main.py`) has no CORS middleware, so a browser (web
target) is blocked from calling it and the services/agencies lists come up empty. Native /
Expo Go / simulator targets are NOT subject to browser CORS and work against the backend as
is. To exercise the full stack in a browser you must front the API with CORS handling (e.g.
a proxy) rather than editing the backend, or test via a native target instead.

The backend must be running for search/create to work — see `../bcs-fastapi/AGENTS.md`.
