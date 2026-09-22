import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">Contact</h1>
      <p className="mt-3 text-muted-foreground">
        For curriculum questions, school partnerships, or technical support, reach out using the
        channel that fits best.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 text-sm shadow-sm">
          <p className="font-semibold">Support</p>
          <p className="mt-1 text-muted-foreground">support@edunexa.example</p>
        </div>
        <div className="rounded-lg border bg-card p-5 text-sm shadow-sm">
          <p className="font-semibold">Schools</p>
          <p className="mt-1 text-muted-foreground">partners@edunexa.example</p>
        </div>
        <div className="rounded-lg border bg-card p-5 text-sm shadow-sm">
          <p className="font-semibold">Content</p>
          <p className="mt-1 text-muted-foreground">content@edunexa.example</p>
        </div>
      </div>
    </div>
  );
}