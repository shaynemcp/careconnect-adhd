import {
  MEDICATION_FORM_ERRORS,
  READ_ONLY_PICKER_HINT,
  fieldErrorAnnouncement,
  fieldErrorsAnnouncement,
  snackbarAnnouncement,
} from './announcements';

describe('MEDICATION_FORM_ERRORS', () => {
  it('says what to enter and gives an example, not just "Required"', () => {
    for (const message of Object.values(MEDICATION_FORM_ERRORS)) {
      expect(message).toMatch(/^(Enter|Add) /);
      expect(message).toContain(', like ');
    }
  });
});

describe('READ_ONLY_PICKER_HINT', () => {
  it('describes the result of activating, without platform gestures', () => {
    expect(READ_ONLY_PICKER_HINT).toMatch(/^Opens /);
    expect(READ_ONLY_PICKER_HINT).not.toMatch(/tap|click/i);
  });
});

describe('fieldErrorAnnouncement', () => {
  it('prefixes the error with the field label', () => {
    expect(fieldErrorAnnouncement('Dosage', MEDICATION_FORM_ERRORS.dosage)).toBe(
      'Dosage: Enter the dose, like 25 mg',
    );
  });
});

describe('snackbarAnnouncement', () => {
  it('speaks a plain confirmation as-is', () => {
    expect(snackbarAnnouncement('Sample data reset')).toBe('Sample data reset');
  });

  it('names the action when there is one', () => {
    expect(snackbarAnnouncement('Metformin logged at 2:14 PM', 'Undo')).toBe(
      'Metformin logged at 2:14 PM. Undo available',
    );
  });
});

describe('fieldErrorsAnnouncement', () => {
  it('leaves a single error as it is', () => {
    const one = fieldErrorAnnouncement('Where', 'Enter where it is, like Regional Medical');
    expect(fieldErrorsAnnouncement([one])).toBe(one);
  });

  it('counts several errors and speaks each with its label, in order', () => {
    expect(
      fieldErrorsAnnouncement([
        fieldErrorAnnouncement('Appointment', 'Enter what the appointment is'),
        fieldErrorAnnouncement('Where', 'Enter where it is'),
      ]),
    ).toBe('2 errors. Appointment: Enter what the appointment is. Where: Enter where it is');
  });
});
