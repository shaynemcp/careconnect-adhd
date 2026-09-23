import React from "react";
import { Alert, Platform } from "react-native";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { renderWithProviders } from "../../test-utils";
import { FixedClock } from "../../core/utils/clock";
import { seedCareData } from "../../data/mockData";
import { emptyAppointmentDraft } from "../../models/types";
import { useCareDataStore } from "../../state/careDataStore";
import { useClockStore } from "../../state/clockStore";
import { useDraftStore } from "../../state/draftStore";
import { AppointmentFormScreen } from "./AppointmentFormScreen";

const SEED_DAY = new Date(2026, 7, 25, 14, 14);

const mockGoBack = jest.fn();
let mockParams: { editingId?: string } | undefined;

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));

function resetStores() {
  useClockStore.getState().setClock(new FixedClock(SEED_DAY));
  useCareDataStore.getState().hydrate(seedCareData(SEED_DAY));
  useDraftStore.setState({
    appointmentDraft: emptyAppointmentDraft(),
    appointmentAutosave: "idle",
  });
  mockParams = undefined;
}

beforeEach(() => {
  mockGoBack.mockClear();
  resetStores();
});

// updateAppointmentDraft schedules a debounced autosave; clearing the draft
// cancels it so no timer outlives the test (issue #5, leaked timers).
afterEach(async () => {
  jest.restoreAllMocks();
  await useDraftStore.getState().clearAppointmentDraft();
});

/** Lets the async draft load/save that starts on mount finish inside act(). */
function settle() {
  return act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** The "Date & time" field on step 2 is one button (its inner text box is hidden from screen readers). */
function dateTimeButton() {
  return screen.getByRole("button", { name: /^Date & time/ });
}

/** Taps the read-only "Date & time" field on step 2, which opens the native picker. */
function openDatePicker() {
  fireEvent.press(dateTimeButton());
}

function fillStepOne(title = "Dentist — cleaning", where = "Bright Smiles") {
  fireEvent.changeText(screen.getByTestId("appointment-title"), title);
  fireEvent.changeText(screen.getByTestId("appointment-location"), where);
  fireEvent.press(screen.getByTestId("form-continue"));
}

/**
 * Drives the mocked native picker through its date step then its time step.
 * On iOS, onChange only updates the wheel's live value — it doesn't advance
 * or commit on its own (careconnect-adhd#1, see AppointmentFormScreen.tsx) —
 * so this presses the Next/Done control after each stage when it's
 * rendered (iOS only; Android's single dialog still commits on the change
 * itself).
 */
function pickDateTime(date: Date, time: Date) {
  fireEvent(
    screen.getByTestId("mock-datetimepicker"),
    "change",
    { type: "set" },
    date,
  );
  if (screen.queryByTestId("picker-confirm")) {
    fireEvent.press(screen.getByTestId("picker-confirm"));
  }
  fireEvent(
    screen.getByTestId("mock-datetimepicker"),
    "change",
    { type: "set" },
    time,
  );
  if (screen.queryByTestId("picker-confirm")) {
    fireEvent.press(screen.getByTestId("picker-confirm"));
  }
}

describe("AppointmentFormScreen — edit flow", () => {
  it("shows a missing state when the appointment being edited no longer exists", () => {
    mockParams = { editingId: "deleted-appointment" };

    renderWithProviders(<AppointmentFormScreen />);

    expect(
      screen.getByText("This appointment is no longer in your list."),
    ).toBeTruthy();
    expect(screen.queryByTestId("form-continue")).toBeNull();
  });
});

describe("AppointmentFormScreen — add flow", () => {
  it("starts on step 1 with an empty form and no delete action", () => {
    renderWithProviders(<AppointmentFormScreen />);

    expect(screen.getByText("Add Appointment")).toBeTruthy();
    expect(screen.getByText("Step 1 of 2 — What & where")).toBeTruthy();
    expect(screen.getByText("Continue")).toBeTruthy();
    expect(screen.queryByTestId("delete-appointment")).toBeNull();
  });

  it("requires a title and a location before leaving step 1", () => {
    renderWithProviders(<AppointmentFormScreen />);

    fireEvent.press(screen.getByTestId("form-continue"));

    expect(
      screen.getByText(
        "Enter what the appointment is, like Dentist — cleaning",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Enter where it is, like Regional Medical"),
    ).toBeTruthy();
    expect(screen.getByText("Step 1 of 2 — What & where")).toBeTruthy();
  });

  it("treats whitespace-only answers as empty", () => {
    renderWithProviders(<AppointmentFormScreen />);

    fireEvent.changeText(screen.getByTestId("appointment-title"), "   ");
    fireEvent.changeText(screen.getByTestId("appointment-location"), "   ");
    fireEvent.press(screen.getByTestId("form-continue"));

    expect(
      screen.getByText(
        "Enter what the appointment is, like Dentist — cleaning",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Enter where it is, like Regional Medical"),
    ).toBeTruthy();
  });

  it("clears each error as soon as that field is edited", () => {
    renderWithProviders(<AppointmentFormScreen />);
    fireEvent.press(screen.getByTestId("form-continue"));

    fireEvent.changeText(screen.getByTestId("appointment-title"), "Dentist");
    expect(
      screen.queryByText(
        "Enter what the appointment is, like Dentist — cleaning",
      ),
    ).toBeNull();
    expect(
      screen.getByText("Enter where it is, like Regional Medical"),
    ).toBeTruthy();

    fireEvent.changeText(
      screen.getByTestId("appointment-location"),
      "Bright Smiles",
    );
    expect(
      screen.queryByText("Enter where it is, like Regional Medical"),
    ).toBeNull();
  });

  it("advances to step 2 and asks for a date and time before saving", () => {
    renderWithProviders(<AppointmentFormScreen />);
    fillStepOne();

    expect(
      screen.getByText("Step 2 of 2 — Date, time & companion"),
    ).toBeTruthy();
    expect(screen.getByText("Save appointment")).toBeTruthy();

    fireEvent.press(screen.getByTestId("form-continue"));

    expect(screen.getByText("Choose the date and time")).toBeTruthy();
    expect(useCareDataStore.getState().data.appointments).toHaveLength(3);
  });

  it("walks what & where -> date & time -> save, creating the appointment", async () => {
    renderWithProviders(<AppointmentFormScreen />);
    fillStepOne("Dentist — cleaning", "  Bright Smiles  ");

    openDatePicker();
    pickDateTime(new Date(2026, 8, 3), new Date(2000, 0, 1, 15, 45));

    // The picked date and time show in the field, and the picker has closed.
    expect(screen.queryByTestId("mock-datetimepicker")).toBeNull();
    expect(screen.queryByText("Choose the date and time")).toBeNull();

    fireEvent.changeText(
      screen.getByTestId("appointment-companion"),
      "  Renee  ",
    );
    fireEvent.press(screen.getByTestId("form-continue"));

    await waitFor(() => {
      const created = useCareDataStore
        .getState()
        .data.appointments.find((a) => a.title === "Dentist — cleaning");
      expect(created).toBeDefined();
      expect(created?.locationName).toBe("Bright Smiles");
      expect(created?.companionName).toBe("Renee");
      expect(created?.startsAt).toEqual(new Date(2026, 8, 3, 15, 45));
    });
    expect(useCareDataStore.getState().data.appointments).toHaveLength(4);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(useDraftStore.getState().appointmentDraft.title).toBe("");
  });

  it("records no companion when the field is left blank", async () => {
    renderWithProviders(<AppointmentFormScreen />);
    fillStepOne("Eye exam", "Vision Center");
    openDatePicker();
    pickDateTime(new Date(2026, 8, 4), new Date(2000, 0, 1, 9, 0));

    fireEvent.press(screen.getByTestId("form-continue"));

    await waitFor(() => {
      const created = useCareDataStore
        .getState()
        .data.appointments.find((a) => a.title === "Eye exam");
      expect(created).toBeDefined();
      expect(created?.companionName ?? null).toBeNull();
    });
  });

  it("goes back a step instead of leaving the form when not on step 1", () => {
    renderWithProviders(<AppointmentFormScreen />);
    fillStepOne();
    expect(
      screen.getByText("Step 2 of 2 — Date, time & companion"),
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId("form-back"));

    expect(screen.getByText("Step 1 of 2 — What & where")).toBeTruthy();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it("leaves the form when Back is pressed on step 1", () => {
    renderWithProviders(<AppointmentFormScreen />);

    fireEvent.press(screen.getByTestId("form-back"));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it("keeps a half-typed draft when the form is reopened", () => {
    useDraftStore.setState({
      appointmentDraft: {
        ...emptyAppointmentDraft(),
        title: "Half-typed visit",
      },
    });

    renderWithProviders(<AppointmentFormScreen />);

    expect(screen.getByDisplayValue("Half-typed visit")).toBeTruthy();
  });
});

describe("AppointmentFormScreen — date & time picker", () => {
  function reachStepTwo() {
    renderWithProviders(<AppointmentFormScreen />);
    fillStepOne();
  }

  it("shows the date picker first, then the time picker once Next is pressed", () => {
    reachStepTwo();
    expect(screen.queryByTestId("mock-datetimepicker")).toBeNull();

    openDatePicker();
    expect(screen.getByTestId("mock-datetimepicker").props.mode).toBe("date");

    // On iOS the wheel's onChange only updates its live value — it doesn't
    // advance on its own (#1) — so scrolling alone leaves the date step up.
    fireEvent(
      screen.getByTestId("mock-datetimepicker"),
      "change",
      { type: "set" },
      new Date(2026, 8, 3),
    );
    expect(screen.getByTestId("mock-datetimepicker").props.mode).toBe("date");

    fireEvent.press(screen.getByTestId("picker-confirm"));
    expect(screen.getByTestId("mock-datetimepicker").props.mode).toBe("time");
  });

  it("uses the spinner on iOS and the default dialog on Android", () => {
    reachStepTwo();
    openDatePicker();
    expect(screen.getByTestId("mock-datetimepicker").props.display).toBe(
      "spinner",
    );

    jest.replaceProperty(Platform, "OS", "android");
    fireEvent(
      screen.getByTestId("mock-datetimepicker"),
      "change",
      { type: "dismissed" },
      undefined,
    );
    openDatePicker();
    expect(screen.getByTestId("mock-datetimepicker").props.display).toBe(
      "default",
    );
  });

  it("starts the picker from the current draft time when one is already set", () => {
    reachStepTwo();
    openDatePicker();
    pickDateTime(new Date(2026, 8, 3), new Date(2000, 0, 1, 15, 45));

    openDatePicker();

    expect(screen.getByTestId("mock-datetimepicker").props.value).toEqual(
      new Date(2026, 8, 3, 15, 45),
    );
  });

  it("closes the picker without changing anything when the date step is dismissed", () => {
    reachStepTwo();
    openDatePicker();

    fireEvent(
      screen.getByTestId("mock-datetimepicker"),
      "change",
      { type: "dismissed" },
      undefined,
    );

    expect(screen.queryByTestId("mock-datetimepicker")).toBeNull();
    fireEvent.press(screen.getByTestId("form-continue"));
    expect(screen.getByText("Choose the date and time")).toBeTruthy();
  });

  it("closes the picker without setting a time when the time step is dismissed", () => {
    reachStepTwo();
    openDatePicker();
    fireEvent(
      screen.getByTestId("mock-datetimepicker"),
      "change",
      { type: "set" },
      new Date(2026, 8, 3),
    );

    fireEvent(
      screen.getByTestId("mock-datetimepicker"),
      "change",
      { type: "dismissed" },
      undefined,
    );

    expect(screen.queryByTestId("mock-datetimepicker")).toBeNull();
    expect(useDraftStore.getState().appointmentDraft.startsAt).toBeUndefined();
  });

  it("closes the picker when the date step returns no selection", () => {
    reachStepTwo();
    openDatePicker();

    fireEvent(
      screen.getByTestId("mock-datetimepicker"),
      "change",
      { type: "set" },
      undefined,
    );

    expect(screen.queryByTestId("mock-datetimepicker")).toBeNull();
  });

  it("clears the date error once a date and time have been chosen", () => {
    reachStepTwo();
    fireEvent.press(screen.getByTestId("form-continue"));
    expect(screen.getByText("Choose the date and time")).toBeTruthy();

    openDatePicker();
    pickDateTime(new Date(2026, 8, 3), new Date(2000, 0, 1, 10, 30));

    expect(screen.queryByText("Choose the date and time")).toBeNull();
  });

  // careconnect-adhd#1 (see apps/react-mobile/e2e/RESULTS.md, E2E-4): on iOS
  // the spinner fires onChange on every scroll tick, not once on release —
  // these simulate that real stream of ticks, not just one synthetic event
  // standing in for "the user finished scrolling" like `pickDateTime` does,
  // to guard against regressing to the old implicit-commit-on-any-change
  // behavior that silently saved a mid-scroll value.
  it("keeps nothing but the final tick's date, however many ticks the wheel reports", () => {
    reachStepTwo();
    openDatePicker();

    // Three scroll ticks landing on three different dates before the wheel
    // settles — only the last one, confirmed with Next, should count.
    fireEvent(screen.getByTestId("mock-datetimepicker"), "change", { type: "set" }, new Date(2026, 8, 1));
    fireEvent(screen.getByTestId("mock-datetimepicker"), "change", { type: "set" }, new Date(2026, 8, 10));
    fireEvent(screen.getByTestId("mock-datetimepicker"), "change", { type: "set" }, new Date(2026, 8, 3));
    expect(screen.getByTestId("mock-datetimepicker").props.mode).toBe("date");
    fireEvent.press(screen.getByTestId("picker-confirm"));

    fireEvent(screen.getByTestId("mock-datetimepicker"), "change", { type: "set" }, new Date(2000, 0, 1, 8, 0));
    fireEvent(screen.getByTestId("mock-datetimepicker"), "change", { type: "set" }, new Date(2000, 0, 1, 9, 45));
    fireEvent.press(screen.getByTestId("picker-confirm"));

    expect(useDraftStore.getState().appointmentDraft.startsAt).toEqual(new Date(2026, 8, 3, 9, 45));
  });

  it("never commits a value the wheel only passed through before Cancel", () => {
    reachStepTwo();
    openDatePicker();

    fireEvent(screen.getByTestId("mock-datetimepicker"), "change", { type: "set" }, new Date(2026, 8, 3));
    fireEvent.press(screen.getByTestId("picker-cancel"));

    expect(screen.queryByTestId("mock-datetimepicker")).toBeNull();
    expect(useDraftStore.getState().appointmentDraft.startsAt).toBeUndefined();
    fireEvent.press(screen.getByTestId("form-continue"));
    expect(screen.getByText("Choose the date and time")).toBeTruthy();
  });
});

describe("AppointmentFormScreen — edit flow (existing appointment)", () => {
  it("pre-fills the draft from the existing appointment", async () => {
    mockParams = { editingId: "appt-alvarez" };

    renderWithProviders(<AppointmentFormScreen />);
    await settle();

    expect(screen.getByText("Edit Appointment")).toBeTruthy();
    expect(
      screen.getByDisplayValue("Dr. Alvarez — Cardiology follow-up"),
    ).toBeTruthy();
    expect(screen.getByDisplayValue("Regional Medical")).toBeTruthy();
    expect(screen.getByTestId("delete-appointment")).toBeTruthy();
  });

  it("shows the saved date, time and companion on step 2 with a Save changes button", async () => {
    mockParams = { editingId: "appt-alvarez" };
    renderWithProviders(<AppointmentFormScreen />);
    await settle();

    fireEvent.press(screen.getByTestId("form-continue"));

    expect(screen.getByDisplayValue("Renee")).toBeTruthy();
    expect(screen.getByText("Save changes")).toBeTruthy();
    expect(dateTimeButton().props.accessibilityLabel).not.toMatch(/Choose the date and time/);
  });

  it("replaces a stale draft from a different appointment", async () => {
    useDraftStore.setState({
      appointmentDraft: {
        ...emptyAppointmentDraft(),
        editingId: "appt-pt",
        title: "Stale title",
      },
    });
    mockParams = { editingId: "appt-alvarez" };

    renderWithProviders(<AppointmentFormScreen />);
    await settle();

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Dr. Alvarez — Cardiology follow-up"),
      ).toBeTruthy();
    });
    expect(screen.queryByDisplayValue("Stale title")).toBeNull();
  });

  it("updates the existing appointment instead of creating a new one", async () => {
    mockParams = { editingId: "appt-alvarez" };
    renderWithProviders(<AppointmentFormScreen />);
    await settle();
    const original = useCareDataStore
      .getState()
      .data.appointments.find((a) => a.id === "appt-alvarez");

    fireEvent.changeText(
      screen.getByTestId("appointment-title"),
      "  Cardiology recheck  ",
    );
    fireEvent.press(screen.getByTestId("form-continue"));
    fireEvent.press(screen.getByTestId("form-continue"));

    await waitFor(() => {
      const updated = useCareDataStore
        .getState()
        .data.appointments.find((a) => a.id === "appt-alvarez");
      expect(updated?.title).toBe("Cardiology recheck");
    });
    const appointments = useCareDataStore.getState().data.appointments;
    expect(appointments).toHaveLength(3);
    const updated = appointments.find((a) => a.id === "appt-alvarez");
    expect(updated?.startsAt).toEqual(original?.startsAt);
    expect(updated?.locationName).toBe("Regional Medical");
    expect(updated?.companionName).toBe("Renee");
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it("clears the companion when the field is emptied on save", async () => {
    mockParams = { editingId: "appt-alvarez" };
    renderWithProviders(<AppointmentFormScreen />);
    await settle();
    fireEvent.press(screen.getByTestId("form-continue"));

    fireEvent.changeText(screen.getByTestId("appointment-companion"), "   ");
    fireEvent.press(screen.getByTestId("form-continue"));

    await waitFor(() => {
      const updated = useCareDataStore
        .getState()
        .data.appointments.find((a) => a.id === "appt-alvarez");
      expect(updated?.companionName ?? null).toBeNull();
    });
  });

  it("opens an appointment that never had a companion with an empty companion field", async () => {
    mockParams = { editingId: "appt-chen" };
    renderWithProviders(<AppointmentFormScreen />);
    await settle();

    fireEvent.press(screen.getByTestId("form-continue"));

    expect(screen.getByTestId("appointment-companion").props.value).toBe("");
  });
});

describe("AppointmentFormScreen — delete", () => {
  async function pressDelete() {
    mockParams = { editingId: "appt-pt" };
    renderWithProviders(<AppointmentFormScreen />);
    await settle();
    fireEvent.press(screen.getByTestId("delete-appointment"));
  }

  it("asks for confirmation naming the appointment before deleting", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);

    await pressDelete();

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe("Delete this appointment?");
    expect(alertSpy.mock.calls[0][1]).toContain("Physical therapy");
    expect(useCareDataStore.getState().data.appointments).toHaveLength(3);
  });

  it("keeps the appointment when the user cancels", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    await pressDelete();

    const buttons = alertSpy.mock.calls[0][2] ?? [];
    const cancel = buttons.find((b) => b.text === "Cancel");
    cancel?.onPress?.();

    expect(useCareDataStore.getState().data.appointments).toHaveLength(3);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it("removes the appointment and leaves the form when the user confirms", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    await pressDelete();

    const buttons = alertSpy.mock.calls[0][2] ?? [];
    const confirm = buttons.find((b) => b.text === "Delete");
    await act(async () => {
      confirm?.onPress?.();
      // Let the delete -> clear draft -> go back promise chain settle in act.
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    await waitFor(() => {
      expect(
        useCareDataStore
          .getState()
          .data.appointments.some((a) => a.id === "appt-pt"),
      ).toBe(false);
    });
    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
  });
});
