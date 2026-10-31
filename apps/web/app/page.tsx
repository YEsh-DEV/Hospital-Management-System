import { redirect } from 'next/navigation';

// Fresh app launch always goes to login — not dashboard.
// Active session handling is done by the login page itself.
export default function Home() {
  redirect('/login');
}
