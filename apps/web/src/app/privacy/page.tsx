import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <div className="mt-6 space-y-4 text-sm text-muted-foreground">
        <p>
          This placeholder summarises the privacy commitments for the Class 10 Learning Platform.
          A full policy will be published on launch.
        </p>
        <p>
          We collect only the data needed to run the learning product: account details, progress,
          quiz and exam attempts, bookmarks, and study-plan preferences. Student and teacher
          performance data is visible only to the relevant account and its authorised teachers.
        </p>
        <p>
          Passwords are stored hashed, sessions are secured, and we never sell personal data. Content
          you upload or generate is governed by the Terms of Use.
        </p>
      </div>
    </div>
  );
}