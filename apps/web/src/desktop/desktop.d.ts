export {};

declare global {
  interface Window {
    careconnectDesktop?: {
      isDesktop: boolean;
      platform: string;
      onCommand: (callback: (name: string) => void) => () => void;
      scheduleReminder: (label: string, minutes: number) => void;
      setMedicationSelected: (selected: boolean) => void;
    };
  }
}