'use client';

import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Skeleton,
} from '@edunexa/ui';
import { ArrowUpRight, Flame, Library, Timer } from 'lucide-react';
import { getSession } from '@/lib/api';
import { useSubjects } from '@/lib/queries';

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useSubjects();
  const subjects = data?.items ?? [];
  const firstName = getSession()?.user.fullName?.trim().split(/\s+/)[0];

  const stats = [
    { icon: Library, label: 'Subjects available', value: subjects.length || '—' },
    { icon: Timer, label: 'Quizzes ready', value: '3' },
    { icon: Flame, label: 'Study streak', value: '6 days' },
  ];

  return (
    <div className="space-y-12">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          Student dashboard
        </p>
        <h1 className="text-5xl md:text-6xl">
          Welcome back{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-lg text-muted-foreground">
          Here is what is happening in your study plan today.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-5xl font-semibold">{stat.value}</CardTitle>
                <stat.icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <CardDescription className="text-sm">{stat.label}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-2xl">Overall progress</CardTitle>
            <CardDescription>Across all subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={72} aria-label="72 percent complete" className="h-2.5" />
            <p className="mt-3 text-sm text-muted-foreground">72% complete · demo analytics</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-2xl">Up next</CardTitle>
          </CardHeader>
          <CardContent>
            {subjects[0] ? (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">{subjects[0].name}</p>
                  <p className="text-sm text-muted-foreground">
                    First subject in the published curriculum
                  </p>
                </div>
                <Button className="w-full">
                  <Link href={`/app/subjects/${subjects[0].id}`} className="flex items-center gap-2">
                    Continue learning
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No published subjects yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">Subjects</CardTitle>
            <CardDescription>Live from the curriculum API</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Link href="/app/subjects">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)
          ) : isError ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subjects found. Start the API and run the seed.
            </p>
          ) : (
            <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
              {subjects.map((subject) => (
                <Link key={subject.id} href={`/app/subjects/${subject.id}`} className="group block">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium transition-colors group-hover:text-primary">
                      {subject.name}
                    </span>
                    <span className="text-muted-foreground">
                      {subject._count?.chapters ?? 0} chapters
                    </span>
                  </div>
                  <Progress value={0} aria-label={`${subject.name} progress`} className="bg-secondary" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-2xl">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <p>• Mathematics Quiz — Friday</p>
            <p>• Science Test — next Tuesday</p>
            <p>
              <Badge variant="outline">2 this week</Badge>
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-2xl">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <p>• Completed Algebra</p>
            <p>• Scored 8/10 in Physics quiz</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}