import { cookies } from 'next/headers';

export function getAuthStatus() {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('auth');
  
  return {
    isAuthenticated: authCookie?.value === process.env.SITE_PASSWORD
  };
}
