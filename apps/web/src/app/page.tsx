import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, BrainCircuit, ClipboardList, GraduationCap, LineChart, Sparkles, Timer } from 'lucide-react';
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle } from '@edunexa/ui';
import { HeroStats } from '@/components/marketing/hero-stats';
import { SubjectGrid } from '@/components/marketing/subject-grid';
import { NoticeBoard } from '@/components/marketing/notice-board';

export const metadata = {
  title: 'Syllabus-structured learning for Class 10',
};

const features = [
  {
    icon: BookOpen,
    title: 'Structured notes',
    description: 'Syllabus-mapped notes, worked examples, and formulas per topic.',
  },
  {
    icon: Timer,
    title: 'Quizzes & mock exams',
    description: 'Timed assessments with instant feedback and weak-topic detection.',
  },
  {
    icon: LineChart,
    title: 'Progress tracking',
    description: 'Completion, streaks, and subject-level mastery at a glance.',
  },
  {
    icon: Sparkles,
    title: 'Teacher question generation',
    description: 'AI questions generated strictly from approved curriculum content and teacher-approved.',
  },
  {
    icon: BrainCircuit,
    title: 'Study planner',
    description: 'A personalised plan from your exam date and study hours.',
  },
  {
    icon: ClipboardList,
    title: 'Question papers',
    description: 'One-click professional PDF question papers with answer keys.',
  },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
        <div>
          <Badge className="mb-4">
            <GraduationCap className="mr-1 h-3.5 w-3.5" aria-hidden />
            EduNexa · Class 10 full curriculum
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Study the syllabus. Master every topic.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Notes, examples, quizzes, and mock exams organised chapter-by-chapter around the approved
            Class 10 curriculum — with teacher question generation that stays strictly on-syllabus.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg">
              <Link href="/register">Start learning free</Link>
            </Button>
            <Button size="lg" variant="outline">
              <Link href="/curriculum">Browse the curriculum</Link>
            </Button>
          </div>
        </div>
        <div className="relative">
          <div
            className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-primary/10 via-transparent to-transparent"
            aria-hidden
          />
          <Image
            src="/hero-illustration.svg"
            alt="An open textbook with a graduation cap, floating study notes, a progress chart, and sparkles"
            width={640}
            height={480}
            priority
            className="h-auto w-full rounded-2xl border bg-background shadow-lg"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <HeroStats />
      </section>

      <section className="border-t bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Subjects in the Class 10 curriculum</h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Every subject is organised as subjects → chapters → topics, straight from the
                published curriculum.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <Link href="/subjects">View subjects</Link>
              </Button>
              <Button size="sm">
                <Link href="/curriculum">Explore the curriculum</Link>
              </Button>
            </div>
          </div>
          <SubjectGrid />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold">Why EduNexa?</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="mb-2 h-5 w-5 text-primary" aria-hidden />
                <CardTitle>{f.title}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Latest notices</h2>
              <p className="mt-2 text-muted-foreground">
                Exams, results, new notes, and schedule updates for Class 10.
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Link href="/notices">All notices</Link>
            </Button>
          </div>
          <NoticeBoard limit={3} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold">Built for students and teachers</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Students get a guided learning path with progress tracking. Teachers get a question bank, AI
          question generation grounded in approved chapters and topics, and one-click paper export.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button>
            <Link href="/app">Student portal</Link>
          </Button>
          <Button variant="outline">
            <Link href="/teacher">Teacher portal</Link>
          </Button>
        </div>
      </section>
    </>
  );
}