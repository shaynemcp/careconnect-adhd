/**
 * Where the chat assistant's edge function lives, from the Vite build env.
 * Kept in its own module so Jest (CommonJS, no import.meta) can replace it with
 * jest.chatEnvStub.cjs and the ChatBot can be tested.
 */
export const CHAT_EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;
export const CHAT_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
