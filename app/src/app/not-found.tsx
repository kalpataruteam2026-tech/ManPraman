'use client';

import { Link } from '@/lib/navigation';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-6 text-center">
      <div className="mx-auto max-w-md space-y-4">
        <div className="text-6xl font-bold font-display text-accent-600">404</div>
        <h1 className="text-2xl font-bold text-ink">Page Not Found</h1>
        <p className="text-sm text-ink-faint">
          The requested page or resource could not be found. Return to the dashboard or home page.
        </p>
        <div className="flex justify-center gap-3 pt-4">
          <Link href="/app" className="btn-accent inline-flex items-center gap-2">
            <Home className="h-4 w-4" /> Go to Dashboard
          </Link>
          <Link href="/" className="btn-ghost inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
