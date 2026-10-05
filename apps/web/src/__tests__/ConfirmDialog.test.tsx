import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '../components/ConfirmDialog';

function Harness({ onConfirm = jest.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={trigger} onClick={() => setOpen(true)}>Delete medication</button>
      <ConfirmDialog
        open={open}
        title="Delete medication?"
        description="This cannot be undone."
        confirmLabel="Yes, delete"
        triggerRef={trigger}
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  test('is a labelled modal dialog with its description', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete medication' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete medication?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
  });

  test('moves focus into the dialog and keeps Tab inside it', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete medication' }));
    const close = screen.getByRole('button', { name: 'Close dialog' });
    const confirm = screen.getByRole('button', { name: 'Yes, delete' });
    expect(close).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    expect(confirm).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(confirm).toHaveFocus();
  });

  test('Escape closes it and returns focus to the button that opened it', async () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Delete medication' });
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test('Cancel and the backdrop close it without confirming', async () => {
    const onConfirm = jest.fn();
    render(<Harness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete medication' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Delete medication' }));
    await userEvent.click(screen.getByRole('presentation'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('the confirm button calls onConfirm', async () => {
    const onConfirm = jest.fn();
    render(<Harness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete medication' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
