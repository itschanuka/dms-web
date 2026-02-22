import { redirect } from 'next/navigation';

// Root "/" → always redirect to login
// Middleware will redirect to /admin if already authenticated
export default function RootPage() {
  redirect('/login');
}
