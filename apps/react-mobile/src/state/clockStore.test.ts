import { FixedClock, kDemoInstant, SystemClock } from '../core/utils/clock';
import { defaultAppSettings } from '../models/serialization';
import { startClockTicking, stopClockTicking, useClockStore } from './clockStore';
import { useSettingsStore } from './settingsStore';

const TICK_MS = 30_000;

beforeEach(() => {
  jest.useFakeTimers();
  useSettingsStore.setState({ ...defaultAppSettings(), hydrated: true });
  useClockStore.setState({ clock: new SystemClock(), now: new Date(2026, 0, 1) });
});

afterEach(() => {
  stopClockTicking();
  jest.useRealTimers();
});

describe('clock implementations', () => {
  it('SystemClock reads the current time', () => {
    jest.setSystemTime(new Date(2026, 8, 21, 9, 30));
    expect(new SystemClock().now()).toEqual(new Date(2026, 8, 21, 9, 30));
  });

  it('FixedClock.at builds a fixed instant from a 1-indexed month', () => {
    expect(FixedClock.at(2026, 8, 25, 14, 14).now()).toEqual(kDemoInstant);
  });
});

describe('useClockStore', () => {
  it('setClock swaps the clock and refreshes now immediately', () => {
    useClockStore.getState().setClock(FixedClock.at(2026, 3, 4, 5, 6));
    expect(useClockStore.getState().now).toEqual(new Date(2026, 2, 4, 5, 6));
  });

  it('refresh reads the wall clock when the demo clock is off', () => {
    jest.setSystemTime(new Date(2026, 8, 21, 12, 0));
    useClockStore.getState().refresh();
    expect(useClockStore.getState().now).toEqual(new Date(2026, 8, 21, 12, 0));
  });

  it('freezes at the demo instant when the demo clock is on', () => {
    useSettingsStore.setState({ demoClock: true });
    useClockStore.getState().refresh();
    expect(useClockStore.getState().now).toEqual(kDemoInstant);
  });

  it('switching the demo clock on and off takes effect immediately', () => {
    jest.setSystemTime(new Date(2026, 8, 21, 12, 0));
    useSettingsStore.setState({ demoClock: true });
    expect(useClockStore.getState().now).toEqual(kDemoInstant);
    useSettingsStore.setState({ demoClock: false });
    expect(useClockStore.getState().now).toEqual(new Date(2026, 8, 21, 12, 0));
  });
});

describe('clock ticking', () => {
  it('refreshes now every 30 seconds while a system clock is in use', () => {
    jest.setSystemTime(new Date(2026, 8, 21, 12, 0));
    startClockTicking();
    jest.setSystemTime(new Date(2026, 8, 21, 12, 5));
    jest.advanceTimersByTime(TICK_MS);
    // Fake timers also move the system clock forward by the 30 s that passed.
    expect(useClockStore.getState().now).toEqual(new Date(2026, 8, 21, 12, 5, 30));
  });

  it('does not refresh a fixed clock on each tick', () => {
    useClockStore.setState({
      clock: FixedClock.at(2026, 8, 25, 14, 14),
      now: new Date(2000, 0, 1),
    });
    startClockTicking();
    jest.advanceTimersByTime(TICK_MS * 2);
    // A FixedClock never changes, so the tick leaves `now` untouched.
    expect(useClockStore.getState().now).toEqual(new Date(2000, 0, 1));
  });

  it('starting twice keeps a single timer, and stopping clears it', () => {
    startClockTicking();
    startClockTicking();
    expect(jest.getTimerCount()).toBe(1);
    stopClockTicking();
    expect(jest.getTimerCount()).toBe(0);
    // Stopping again is harmless.
    stopClockTicking();
  });
});
