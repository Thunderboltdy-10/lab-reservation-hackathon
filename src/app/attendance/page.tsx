"use client";

import React from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatInTimeZone } from "date-fns-tz";
import {
  ClipboardCheck,
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? "Europe/Madrid";

const formatDate = (date: Date) => {
  return formatInTimeZone(date, TIMEZONE, "EEEE, MMMM d, yyyy");
};

const formatTime = (date: Date) => {
  return formatInTimeZone(date, TIMEZONE, "HH:mm");
};

export default function AttendancePage() {
  const { data: sessionsNeedingAttendance } =
    api.attendance.getSessionsNeedingAttendance.useQuery();

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="font-semibold text-3xl">Attendance</h1>
        <p className="mt-1 text-muted-foreground">
          Mark and manage student attendance for lab sessions
        </p>
      </div>

      <div className="space-y-6">
        {/* Sessions needing attendance */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-xl">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Pending Attendance
          </h2>

          {!sessionsNeedingAttendance ||
          sessionsNeedingAttendance.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardCheck className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="font-medium text-lg">All caught up!</h3>
                <p className="mt-1 text-muted-foreground">
                  No sessions are waiting for attendance to be marked
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="stagger-children space-y-3">
              {sessionsNeedingAttendance.map((session) => (
                <Card
                  key={session.id}
                  className="transition-all hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <MapPin className="h-4 w-4" />
                          {session.labName} Lab
                        </CardTitle>
                        <CardDescription className="mt-1 flex flex-wrap items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(new Date(session.startAt))}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(new Date(session.startAt))} -{" "}
                            {formatTime(new Date(session.endAt))}
                          </span>
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        <Users className="mr-1 h-3 w-3" />
                        {session.unmarkedCount} unmarked
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-muted-foreground text-sm">
                        {session.totalMarked} of {session.totalBooked} students
                        marked
                      </div>
                      <Button asChild size="sm">
                        <Link href={`/attendance/${session.id}`}>
                          Mark Attendance
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
