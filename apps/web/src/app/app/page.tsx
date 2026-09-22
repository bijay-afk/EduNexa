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
import { useSubjects } from '@/lib/queries';

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useSubjects();
  const subjects = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">Here is what is happening in your study plan today.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overall progress</CardTitle>
          <CardDescription>Across all subjects</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={72} aria-label="72 percent complete" />
          <p className="mt-2 text-sm text-muted-foreground">72% complete · demo analytics</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Continue learning</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <div>
              {subjects[0] ? (
                <>
                  <p className="font-medium">{subjects[0].name}</p>
                  <p className="text-sm text-muted-foreground">
                    First subject in the published curriculum
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No published subjects yet.</p>
              )}
            </div>
            {subjects[0] ? (
              <Button className="shrink-0">
                <Link href={`/app/subjects/${subjects[0].id}`}>Open</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subjects</CardTitle>
          <CardDescription>Live from the curriculum API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-9" />)
          ) : isError ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subjects found. Start the API and run the seed.
            </p>
          ) : (
            subjects.map((subject) => (
              <Link key={subject.id} href={`/app/subjects/${subject.id}`} className="block">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{subject.name}</span>
                  <span className="text-muted-foreground">
                    {subject._count?.chapters ?? 0} chapters
                  </span>
                </div>
                <Progress value={0} aria-label={`${subject.name} progress`} className="bg-secondary" />
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Mathematics Quiz — Friday</p>
            <p>• Science Test — next Tuesday</p>
            <p>
              <Badge variant="outline">2 this week</Badge>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Completed Algebra</p>
            <p>• Scored 8/10 in Physics quiz</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}