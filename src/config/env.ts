console.log('Environment check:', {
  processEnv: !!process.env.VITE_OPENAI_API_KEY,
  metaEnv: !!import.meta.env.VITE_OPENAI_API_KEY,
  combinedKey: !!(process.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY),
});

const getEnvVar = (name: string): string => {
  const value = process.env[name] || import.meta.env[name];
  if (!value) {
    console.warn(`Environment variable ${name} is not set`);
    console.log('Environment details:', {
      variableName: name,
      processEnvKeys: Object.keys(process.env),
      importMetaEnvKeys: Object.keys(import.meta.env),
      processEnvValue: process.env[name]?.substring(0, 4) + '...',
      importMetaEnvValue: import.meta.env[name]?.substring(0, 4) + '...'
    });
  }
  return value || '';
};

// For development testing only - remove in production
const DEV_OPENAI_KEY = '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'; // Replace with your key

export const config = {
  openai: {
    // Use hardcoded key for development, env var for production
    apiKey: import.meta.env.DEV ? DEV_OPENAI_KEY : getEnvVar('VITE_OPENAI_API_KEY'),
  },
  spotify: {
    clientId: getEnvVar('VITE_SPOTIFY_CLIENT_ID'),
    clientSecret: getEnvVar('VITE_SPOTIFY_CLIENT_SECRET'),
    redirectUri: import.meta.env.DEV 
      ? 'http://localhost:5173/callback'
      : 'https://fitsyncusvoice.vercel.app/callback',
  },
} as const;

// Add this debug log in development
if (import.meta.env.DEV) {
  console.log('OpenAI API Key exists:', !!config.openai.apiKey);
  console.log('OpenAI Key length:', config.openai.apiKey.length);
}