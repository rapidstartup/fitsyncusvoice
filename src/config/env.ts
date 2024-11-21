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

export const config = {
  openai: {
    apiKey: getEnvVar('VITE_OPENAI_API_KEY'),
  },
  spotify: {
    clientId: getEnvVar('VITE_SPOTIFY_CLIENT_ID'),
    clientSecret: getEnvVar('VITE_SPOTIFY_CLIENT_SECRET'),
    redirectUri: 'https://fitsyncusvoice.vercel.app/callback',
  },
} as const;

// Add this debug log in development
if (import.meta.env.DEV) {
  console.log('OpenAI API Key exists:', !!config.openai.apiKey);
}