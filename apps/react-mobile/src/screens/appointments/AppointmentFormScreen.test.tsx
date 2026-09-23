import React from "react";
import { screen } from "@testing-library/react-native";

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
