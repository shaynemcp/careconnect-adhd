/**
 * The landing-page chat assistant: opening and closing from the keyboard, the
 * API reply, and the scripted fallback when the API is unavailable.
 * src/config/chatEnv.ts is replaced by jest.chatEnvStub.cjs (Vite-only env).
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatBot from '../components/ChatBot';

const OPEN = 'Need help getting started? Open assistant';
const INPUT = 'Type your question and press Enter to send';

function mockFetch(impl: () => Promise<unknown>) {
  const fn = jest.fn(impl);
  (globalThis as unknown as { fetch: typeof fn }).fetch = fn;
  return fn;
}


/** A reply appears twice: once visibly in the list and once in the polite live region. */
async function expectReply(text: string | RegExp) {
  const conversation = screen.getByLabelText('Conversation');
  const copies = await within(conversation).findAllByText(text);
  expect(copies.filter((el) => !el.classList.contains('sr-only'))).toHaveLength(1);
  expect(copies.filter((el) => el.closest('[aria-live="polite"].sr-only'))).toHaveLength(1);
}

beforeAll(() => {
  // jsdom has no scrollIntoView; the panel scrolls to the newest message.
  Element.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  delete (globalThis as { fetch?: unknown }).fetch;
});

test('the launcher opens the assistant dialog and puts focus in the question box', async () => {
  const user = userEvent.setup();
  render(<ChatBot />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: OPEN }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: INPUT })).toHaveFocus();
});

test('Escape closes the dialog and returns focus to the launcher', async () => {
  const user = userEvent.setup();
  render(<ChatBot />);
  await user.click(screen.getByRole('button', { name: OPEN }));
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: OPEN })).toHaveFocus();
});

test('a question goes to the assistant API with the anon key, and its reply is shown', async () => {
  const fetch = mockFetch(async () => ({ ok: true, json: async () => ({ reply: 'Hello from the API.' }) }));
  const user = userEvent.setup();
  render(<ChatBot />);
  await user.click(screen.getByRole('button', { name: OPEN }));
  await user.type(screen.getByRole('textbox', { name: INPUT }), 'What is CareConnect?{Enter}');

  await expectReply('Hello from the API.');
  expect(within(screen.getByLabelText('Conversation')).getByText('What is CareConnect?')).toBeInTheDocument();
  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://chat.test/functions/v1/chat-assistant');
  expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-anon-key');
  expect(JSON.parse(init.body as string).messages.at(-1)).toEqual({ role: 'user', content: 'What is CareConnect?' });
});

test('when the API fails, a scripted answer is shown, and medical questions are deflected', async () => {
  mockFetch(async () => {
    throw new Error('offline');
  });
  const user = userEvent.setup();
  render(<ChatBot />);
  await user.click(screen.getByRole('button', { name: OPEN }));
  await user.type(screen.getByRole('textbox', { name: INPUT }), 'What dose should I take?{Enter}');
  await expectReply(/not able to give medical, dosage, or clinical advice/);
});

test('an API reply that asks for the fallback uses the scripted answer too', async () => {
  mockFetch(async () => ({ ok: true, json: async () => ({ useFallback: true }) }));
  const user = userEvent.setup();
  render(<ChatBot />);
  await user.click(screen.getByRole('button', { name: OPEN }));
  await user.type(screen.getByRole('textbox', { name: INPUT }), 'How do I sign up?{Enter}');
  await expectReply(/^To sign up, click the 'Sign up' or 'Get started' button/);
});

test('the send button is disabled until there is a question', async () => {
  const user = userEvent.setup();
  render(<ChatBot />);
  await user.click(screen.getByRole('button', { name: OPEN }));
  const send = screen.getByRole('button', { name: 'Send message' });
  expect(send).toBeDisabled();
  await user.type(screen.getByRole('textbox', { name: INPUT }), '   ');
  expect(send).toBeDisabled();
  await user.type(screen.getByRole('textbox', { name: INPUT }), 'hi');
  expect(send).toBeEnabled();
});

// "How do I sign up?" used to match the "what is / how do" rule first and got the
// general description instead of the sign-up steps; same for "How do I log in?".
test.each([
  ['How do I sign up?', /^To sign up, click the 'Sign up' or 'Get started' button/],
  ['How do I log in?', /^If you already have an account, click 'Sign in'/],
  ['What is CareConnect?', /^CareConnect is a daily companion app/],
])('scripted answer for "%s"', async (question, answer) => {
  mockFetch(async () => ({ ok: false, json: async () => ({}) }));
  const user = userEvent.setup();
  render(<ChatBot />);
  await user.click(screen.getByRole('button', { name: OPEN }));
  await user.type(screen.getByRole('textbox', { name: INPUT }), `${question}{Enter}`);
  await expectReply(answer);
});
