import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  getNextMedicationDose,
  markNextMedicationDose,
  skipNextMedicationDose,
  undoLastDoseChange,
} from '../data/scheduleStore';
import {
  getMedications,
  saveMedications,
  toggleMedicationRemindersPaused,
} from '../data/medsStore';
import { appendActivityEvent } from '../data/caregiverStore';
import type { ScheduleItem } from '../types';
import { formatDoseTime } from './formatDoseTime';

/** True if any text field on the page has something typed in it. */
function hasUnsavedInput(): boolean {
  return Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'main input:not([type=checkbox]):not([type=radio]):not([type=hidden]), main textarea',
    ),
  ).some((el) => el.value.trim() !== '');
}

export default function DesktopIntegration() {
  const navigate = useNavigate();
  const [skipDose, setSkipDose] = useState<ScheduleItem | null>(null);
  const [desktopStatus, setDesktopStatus] = useState<string | null>(null);
  const { pathname } = useLocation();

  // A message is about the page it was shown on, so don't carry it to the next one.
  useEffect(() => {
    setDesktopStatus(null);
  }, [pathname]);
  const [medicationToDelete, setMedicationToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!window.careconnectDesktop?.isDesktop) return;

    function handleCommand(command: string) {
      switch (command) {
        case 'open-medication': {
          const selectedMedId = sessionStorage.getItem(
            'careconnect_desktop_selected_medication',
          );

          if (selectedMedId) {
            const medicationCard = document.getElementById(
              `medication-${selectedMedId}`,
            );

            medicationCard?.focus();
          }

          break;
        }
        case 'edit-medication': {
          const selectedMedId = sessionStorage.getItem(
            'careconnect_desktop_selected_medication',
          );

          if (selectedMedId) {
            navigate(
              `/app/manage-medications?edit=${encodeURIComponent(selectedMedId)}`,
            );
          }

          break;
        }
        case 'duplicate-medication': {
          const selectedMedId = sessionStorage.getItem(
            'careconnect_desktop_selected_medication',
          );

          if (!selectedMedId) break;

          const medications = getMedications();
          const selectedMedication = medications.find(
            (medication) => medication.id === selectedMedId,
          );

          if (!selectedMedication) break;

          const duplicate = {
            ...selectedMedication,
            id: `med-${Date.now()}`,
            name: `${selectedMedication.name} Copy`,
          };

          saveMedications([...medications, duplicate]);
          navigate('/app/manage-medications');

          break;
        }
        case 'delete-medication': {
          const selectedMedId = sessionStorage.getItem(
            'careconnect_desktop_selected_medication',
          );

          if (selectedMedId) {
            setMedicationToDelete(selectedMedId);
          }

          break;
        }
        case 'pause-reminders': {
          const selectedMedId = sessionStorage.getItem(
            'careconnect_desktop_selected_medication',
          );

          if (selectedMedId) {
            const paused = toggleMedicationRemindersPaused(selectedMedId);
            const medication = getMedications().find(
              (item) => item.id === selectedMedId,
            );

            if (medication) {
              setDesktopStatus(
                paused
                  ? `Reminders paused for ${medication.name}.`
                  : `Reminders resumed for ${medication.name}.`,
              );
            }
          }

          break;
        }

        case 'share-with-caregiver': {
          const selectedMedId = sessionStorage.getItem(
            'careconnect_desktop_selected_medication',
          );

          if (!selectedMedId) break;

          const medication = getMedications().find(
            (item) => item.id === selectedMedId,
          );

          if (medication) {
            appendActivityEvent({
              kind: 'med_shared',
              label: `Shared ${medication.name} with caregiver`,
              timestamp: new Date().toISOString(),
            });

            setDesktopStatus(
              `${medication.name} shared with caregiver.`,
            );
          }

          break;
        }

        case 'mark-next-dose-taken': {
          const dose = markNextMedicationDose();

          if (dose) {
            window.dispatchEvent(new Event('careconnect:schedule-updated'));
            setDesktopStatus(`${dose.label} marked as taken.`);
          } else {
            setDesktopStatus('No medication doses left to mark today.');
          }

          break;
        }

        case 'skip-next-dose': {
          const dose = getNextMedicationDose();

          if (dose) {
            setSkipDose(dose);
          } else {
            setDesktopStatus('No medication doses left to skip today.');
          }

          break;
        }

        case 'remind-in-10-minutes': {
          const dose = getNextMedicationDose();

          if (dose) {
            window.careconnectDesktop?.scheduleReminder(dose.label, 10);
            setDesktopStatus(`Reminder set for ${dose.label} in 10 minutes.`);
          }

          break;
        }

        case 'undo-dose-change': {
          const dose = undoLastDoseChange();

          if (dose) {
            window.dispatchEvent(new Event('careconnect:schedule-updated'));
            setDesktopStatus(`Undid the last change to ${dose.label}.`);
          } else {
            setDesktopStatus('There is no dose change to undo.');
          }

          break;
        }

        case 'edit-schedule':
          navigate('/app/schedule');
          break;

        case 'call-caregiver':
          window.location.href = 'tel:07700900456';
          break;

        case 'focus-search': {
          // Edit > Find (Ctrl+F). Focus the medicine search if it is on screen; otherwise
          // open Medications, which focuses it on arrival.
          const search = document.getElementById('medication-search');
          if (search) {
            search.focus();
          } else if (hasUnsavedInput()) {
            // Leaving would throw away what was typed (a medication or appointment form,
            // a caregiver note draft), so stay and say why.
            setDesktopStatus('Save or clear what you typed before searching medicines.');
          } else {
            navigate('/app/medications', { state: { focusSearch: true } });
          }
          break;
        }

        default:
          break;
      }
    }

    const unsubscribe = window.careconnectDesktop?.onCommand(handleCommand);

    return () => {
      unsubscribe?.();
    };
  }, [navigate]);

  return (
  <>
    {/* Always in the page, so screen readers are listening before the first message arrives. */}
    <div
      role="status"
      aria-live="polite"
      className={
        desktopStatus
          ? 'fixed bottom-4 right-4 z-50 rounded-lg bg-neutral-800 px-4 py-3 text-white shadow-lg'
          : 'sr-only'
      }
    >
      {desktopStatus}
    </div>

    <ConfirmDialog
      open={skipDose !== null}
      title={skipDose ? `Skip ${skipDose.label}?` : 'Skip dose?'}
      description={
        skipDose
          ? `This will skip the scheduled dose at ${formatDoseTime(skipDose.time)}.`
          : undefined
      }
      confirmLabel="Skip dose"
      cancelLabel="Cancel"
      onConfirm={() => {
        const skipped = skipNextMedicationDose();

        if (skipped) {
          appendActivityEvent({
            kind: 'med_skipped',
            label: `Skipped ${skipped.label} scheduled for ${skipped.time}`,
            timestamp: new Date().toISOString(),
          });

          window.dispatchEvent(new Event('careconnect:schedule-updated'));
          setDesktopStatus(`${skipped.label} skipped.`);
        }

        setSkipDose(null);
      }}
      onCancel={() => setSkipDose(null)}
    />
    <ConfirmDialog
      open={medicationToDelete !== null}
      title="Delete medication?"
      description={
        medicationToDelete
          ? `Are you sure you want to delete ${
              getMedications().find(
                (medication) => medication.id === medicationToDelete,
              )?.name ?? 'this medication'
            }? This cannot be undone.`
          : undefined
      }
      confirmLabel="Yes, delete"
      cancelLabel="Cancel"
      onConfirm={() => {
        if (medicationToDelete) {
          const medications = getMedications();
          const medication = medications.find(
            (item) => item.id === medicationToDelete,
          );

          saveMedications(
            medications.filter((item) => item.id !== medicationToDelete),
          );
          window.dispatchEvent(new Event('careconnect:medications-updated'));

          sessionStorage.removeItem(
            'careconnect_desktop_selected_medication',
          );
          window.careconnectDesktop?.setMedicationSelected(false);

          setDesktopStatus(
            medication
              ? `${medication.name} deleted.`
              : 'Medication deleted.',
          );
        }

        setMedicationToDelete(null);
      }}
      onCancel={() => setMedicationToDelete(null)}
    />
  </>
);
}