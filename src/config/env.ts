export const config = {
  openai: {
    apiKey: process.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY || '',
  },
  spotify: {
    clientId: process.env.VITE_SPOTIFY_CLIENT_ID || import.meta.env.VITE_SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.VITE_SPOTIFY_CLIENT_SECRET || import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || '',
    redirectUri: 'https://fitsyncusvoice.vercel.app/callback',
  },
} as const;