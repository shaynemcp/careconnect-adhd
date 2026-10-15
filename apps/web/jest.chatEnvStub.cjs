// Test stand-in for src/config/chatEnv.ts, which reads import.meta.env (Vite only).
module.exports = { CHAT_EDGE_URL: 'https://chat.test/functions/v1/chat-assistant', CHAT_ANON_KEY: 'test-anon-key' };
