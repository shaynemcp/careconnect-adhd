import { useEffect, useRef, useState } from 'react';
import { act, render, screen } from '@testing-library/react';
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

// Dialogs opened from the desktop menu or a shortcut have no trigger button
// and do not move focus when they open (#46). The harness opens the dialog
// from a window event, the way the Electron menu command arrives.
const MENU_SKIP = 'test:menu-skip';

function MenuHarness({ removeLink = false }: { removeLink?: boolean }) {
  const [open, setOpen] = useState(false);
  const [showLink, setShowLink] = useState(true);
  useEffect(() => {
    const onMenu = () => {
      if (removeLink) setShowLink(false);
      setOpen(true);
    };
    window.addEventListener(MENU_SKIP, onMenu);
    return () => window.removeEventListener(MENU_SKIP, onMenu);
  }, [removeLink]);
  return (
    <main id="main-content" tabIndex={-1} aria-label="Main content">
      {showLink && <a href="#today">Today&apos;s plan</a>}
      <ConfirmDialog
        open={open}
        title="Skip Evening medications?"
        confirmLabel="Skip dose"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </main>
  );
}

const menuSkip = () => act(() => { window.dispatchEvent(new Event(MENU_SKIP)); });

describe('ConfirmDialog without a trigger button (#46)', () => {
  test('does not move focus on first render while closed', () => {
    render(<MenuHarness />);
    expect(document.body).toHaveFocus();
  });

  test('Escape returns focus to what had it before the dialog opened', async () => {
    render(<MenuHarness />);
    const link = screen.getByRole('link', { name: "Today's plan" });
    link.focus();
    menuSkip();
    expect(screen.getByRole('dialog', { name: 'Skip Evening medications?' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(link).toHaveFocus();
  });

  test('falls back to the main content when that element is gone', async () => {
    render(<MenuHarness removeLink />);
    screen.getByRole('link', { name: "Today's plan" }).focus();
    menuSkip(); // the command removes the focused link as the dialog opens
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('main', { name: 'Main content' })).toHaveFocus();
  });

  test('never returns focus to an element inside aria-hidden', async () => {
    render(
      <>
        <div aria-hidden="true">
          <button tabIndex={-1}>hidden</button>
        </div>
        <MenuHarness />
      </>,
    );
    screen.getByText('hidden').focus();
    menuSkip();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByText('hidden')).not.toHaveFocus();
    expect(screen.getByRole('main', { name: 'Main content' })).toHaveFocus();
  });
});
