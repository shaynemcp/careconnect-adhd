/** The recovery screen a render error shows instead of a blank page (A11 Part 1). */
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import ErrorBoundary from '../components/ErrorBoundary';

expect.extend(toHaveNoViolations);

function Broken(): never {
  throw new Error('chunk failed to load');
}

let consoleError: jest.SpyInstance;
beforeEach(() => {
  // React and the boundary both log the caught error; keep the test output readable.
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

test('renders its children when nothing goes wrong', () => {
  render(
    <ErrorBoundary>
      <p>Today's schedule</p>
    </ErrorBoundary>,
  );
  expect(screen.getByText("Today's schedule")).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('a render error shows an announced recovery message with focus on its heading', () => {
  render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>,
  );
  const alert = screen.getByRole('alert', { name: 'Something went wrong' });
  expect(alert).toHaveTextContent('Your information is safe on this device');
  expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Reload the page' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: "Go to today's home" })).toHaveAttribute('href', '/app');
  expect(consoleError).toHaveBeenCalledWith(
    'CareConnect hit an error it could not recover from:',
    expect.objectContaining({ message: 'chunk failed to load' }),
    expect.any(String),
  );
});

test('the recovery message has no axe violations', async () => {
  const { container } = render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>,
  );
  expect(
    await axe(container, { rules: { 'color-contrast': { enabled: false } } }),
  ).toHaveNoViolations();
});

test('moving to another route clears the error so the next screen renders', async () => {
  function Harness() {
    const [path, setPath] = useState('/app/memories');
    return (
      <>
        <button type="button" onClick={() => setPath('/app/medications')}>
          Medicines
        </button>
        <ErrorBoundary resetKey={path}>{path === '/app/memories' ? <Broken /> : <p>Medicines screen</p>}</ErrorBoundary>
      </>
    );
  }
  render(<Harness />);
  expect(screen.getByRole('alert')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Medicines' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByText('Medicines screen')).toBeInTheDocument();
});
