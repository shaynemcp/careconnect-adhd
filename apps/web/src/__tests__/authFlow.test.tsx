/**
 * Routing and the demo auth flow through the real <App />: the route guards
 * (ProtectedRoute, RoleRoute, AuthRoute), sign-up and sign-in validation, the
 * role chooser, and the legacy path redirects. Accounts live in localStorage.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

function start(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

async function signUp(user: ReturnType<typeof userEvent.setup>, email = 'margaret@example.test') {
  await user.type(await screen.findByRole('textbox', { name: /^Your name/ }), 'Margaret Test');
  await user.type(screen.getByRole('textbox', { name: /^Email address/ }), email);
  await user.type(screen.getByLabelText(/^Password/), 'secret1');
  await user.type(screen.getByLabelText(/^Confirm password/), 'secret1');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

beforeEach(() => {
  localStorage.clear();
});

describe('route guards', () => {
  test('an unknown address goes to the landing page', async () => {
    start('/no-such-page');
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  test('the app requires a signed-in user: /app without one goes to the landing page', async () => {
    start('/app/medications');
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  test('the role chooser requires a signed-in user', async () => {
    start('/role');
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });
});

describe('sign up', () => {
  test('an empty form shows every field error and the summary', async () => {
    const user = userEvent.setup();
    start('/signup');
    await user.click(await screen.findByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Please correct the errors below to continue.')).toBeInTheDocument();
    for (const message of [
      'Please enter your name.',
      'Please enter your email address.',
      'Please create a password.',
      'Please confirm your password.',
    ]) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
  });

  test('a bad email, a short password and a mismatch each say what to fix', async () => {
    const user = userEvent.setup();
    start('/signup');
    await user.type(await screen.findByRole('textbox', { name: /^Your name/ }), 'M');
    await user.type(screen.getByRole('textbox', { name: /^Email address/ }), 'not-an-email');
    await user.type(screen.getByLabelText(/^Password/), '123');
    await user.type(screen.getByLabelText(/^Confirm password/), '456');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 6 characters.')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
  });

  test('sign up, choose the caregiver role, and land on the caregiver Dashboard', async () => {
    const user = userEvent.setup();
    start('/signup');
    await signUp(user);
    await waitFor(() => expect(window.location.pathname).toBe('/role'));
    await user.click(await screen.findByRole('button', { name: /I am the Caregiver/ }));
    await waitFor(() => expect(window.location.pathname).toBe('/app'));
    await waitFor(() => expect(document.title).toBe('Dashboard - CareConnect'));
  });

  test('the same email cannot sign up twice', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      'careconnect_users',
      JSON.stringify([{ id: 'u1', name: 'Margaret Test', email: 'margaret@example.test' }]),
    );
    start('/signup');
    await signUp(user, 'Margaret@Example.test'); // case does not matter
    expect(
      await screen.findByText('An account with this email already exists. Try signing in instead.'),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/signup');
  });
});

describe('sign in', () => {
  test('an empty form asks for the email and password', async () => {
    const user = userEvent.setup();
    start('/signin');
    await user.click(await screen.findByRole('button', { name: /^Sign in$/ }));
    expect(screen.getByText('Please enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Please enter your password.')).toBeInTheDocument();
  });

  test('an unknown email is refused with a clear next step', async () => {
    const user = userEvent.setup();
    start('/signin');
    await user.type(await screen.findByRole('textbox', { name: /^Email address/ }), 'nobody@example.test');
    await user.type(screen.getByLabelText(/^Password/), 'whatever');
    await user.click(screen.getByRole('button', { name: /^Sign in$/ }));
    expect(await screen.findByText("We couldn't find an account with that email. Please sign up first.")).toBeInTheDocument();
  });

  test('a returning user signs in, picks a role, and a signed-in user is sent past the sign-in page', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      'careconnect_users',
      JSON.stringify([{ id: 'u1', name: 'Margaret Test', email: 'margaret@example.test' }]),
    );
    start('/signin');
    await user.type(await screen.findByRole('textbox', { name: /^Email address/ }), 'margaret@example.test');
    await user.type(screen.getByLabelText(/^Password/), 'anything');
    await user.click(screen.getByRole('button', { name: /^Sign in$/ }));
    await waitFor(() => expect(window.location.pathname).toBe('/role'));
    await user.click(await screen.findByRole('button', { name: /I am the Care Recipient/ }));
    await waitFor(() => expect(window.location.pathname).toBe('/app'));
    await waitFor(() => expect(document.title).toBe('Home - CareConnect'));
  });
});

describe('legacy paths', () => {
  test('/medications from older links goes to /app/medications (then the guard applies)', async () => {
    localStorage.setItem(
      'careconnect_session',
      JSON.stringify({ user: { id: 'u1', name: 'Margaret Test', email: 'margaret@example.test' }, role: 'patient' }),
    );
    start('/medications');
    await waitFor(() => expect(window.location.pathname).toBe('/app/medications'));
    expect(await screen.findByRole('heading', { name: 'Medicines', level: 1 })).toBeInTheDocument();
  });
});
