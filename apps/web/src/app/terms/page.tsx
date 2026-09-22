import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of Use' };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">Terms of Use</h1>
      <div className="mt-6 space-y-4 text-sm text-muted-foreground">
        <p>
          This placeholder outlines the terms under which the Class 10 Learning Platform operates. A
          complete terms page will be published on launch.
        </p>
        <p>
          Students and teachers use the platform for educational purposes. The curriculum content is
          licensed appropriately; copyrighted textbook material is not reproduced without permission.
        </p>
        <p>
          AI-generated questions are suggestions only — they must be reviewed and approved by teachers
          before use. Misuse of shared accounts or attempts to circumvent assessment controls are
          prohibited.
        </p>
      </div>
    </div>
  );
}