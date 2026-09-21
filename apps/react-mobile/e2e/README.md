# react-mobile end-to-end flows (Maestro)

Eight Maestro flows that drive the real app on an Android emulator or device.
They cover sign-in, session persistence, the route guard, marking a dose taken
with undo, the add-medication and add-appointment forms, the caregiver tabs and
sign-out. Flows live in `flows/`; shared steps live in `subflows/` (Maestro only
runs the files directly inside the folder you point it at, so helpers are kept
out of `flows/`).

## Status

The flows were written against the current source (testIDs, visible strings and
navigation) and the YAML parses, but **they have not been run yet**. The first
run on an emulator may need small selector tweaks. Known fragile spots:

- `subflows/enable-demo-clock.yaml` taps the Demo clock switch by position
  (`88%,50%` of the row) because the row is one accessible View wrapping a
  `Switch`.
- `05-add-medication.yaml` and `06-add-appointment.yaml` accept the native
  Android time and date dialogs with `(?i)ok`; the button text differs slightly
  between Android versions.
- `08-deep-link-guard.yaml` needs a build that registers the `careconnect://`
  scheme (any dev-client or release build does; Expo Go does not).

## Run

1. Install Maestro: https://docs.maestro.dev/getting-started/installing-maestro
2. Start an Android emulator (API 34 is a good default) or plug in a device.
3. Build and install the app so the package is `test.careconnect.mobile`
   (from `app.json`). Expo Go will not work, because its package id is different:

   ```
   cd apps/react-mobile
   npx expo run:android
   ```

4. Run everything, or a single flow:

   ```
   npm run e2e
   maestro test e2e/flows/04-mark-dose-taken-and-undo.yaml
   maestro test --include-tags smoke e2e/flows
   ```

Each flow starts with `clearState: true`, so they are independent and can run
in any order. Flow 04 turns on the demo clock (Tuesday, August 25, 2:14 PM) so
the sample data, and the "Atorvastatin is overdue" story, is the same on any day.

Maestro writes screenshots and logs to `~/.maestro/tests/`; attach the folder to
a bug report when a flow fails.
