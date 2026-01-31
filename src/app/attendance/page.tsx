"use client";

import React, { useMemo, useState } from "react";
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
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const { data: sessionsNeedingAttendance } =
    api.attendance.getSessionsNeedingAttendance.useQuery();
  const { data: upcomingSessions } = api.attendance.getAttendanceSessions.useQuery(
    { scope: "upcoming", take: 30 }
  );
  const { data: pastSessions } = api.attendance.getAttendanceSessions.useQuery(
    { scope: "past", take: 30 }
  );

  const needsAttentionIds = useMemo(
    () => new Set(sessionsNeedingAttendance?.map((s) => s.id) ?? []),
    [sessionsNeedingAttendance]
  );

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="font-semibold text-3xl">Attendance</h1>
        <p className="mt-1 text-muted-foreground">
          Mark and manage student attendance for lab sessions
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-xl">
              <ClipboardCheck className="h-5 w-5" />
              Sessions
            </h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={scope === "upcoming" ? "default" : "outline"}
                onClick={() => setScope("upcoming")}
              >
                Upcoming
              </Button>
              <Button
                size="sm"
                variant={scope === "past" ? "default" : "outline"}
                onClick={() => setScope("past")}
              >
                Past
              </Button>
            </div>
          </div>

          {scope === "upcoming" ? (
            <div className="space-y-3">
              {upcomingSessions && upcomingSessions.length > 0 ? (
                upcomingSessions.map((session) => (
                  <Card key={session.id} className="transition-all hover:shadow-md">
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
                        <Badge variant="outline">
                          <Users className="mr-1 h-3 w-3" />
                          {session.totalBooked} booked
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-muted-foreground text-sm">
                          Attendance opens after the session ends.
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/attendance/${session.id}`}>
                            View
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="font-medium text-lg">No upcoming sessions</h3>
                    <p className="mt-1 text-muted-foreground">
                      New sessions will appear here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {pastSessions && pastSessions.length > 0 ? (
                pastSessions.map((session) => (
                  <Card
                    key={session.id}
                    className={`transition-all hover:shadow-md ${needsAttentionIds.has(session.id) ? "border-amber-500/60" : ""}`}
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
                        {needsAttentionIds.has(session.id) ? (
                          <Badge variant="secondary" className="bg-amber-500 text-white">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Needs attention
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Users className="mr-1 h-3 w-3" />
                            {session.totalBooked} booked
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">Present: {session.present}</Badge>
                          <Badge variant="outline">Absent: {session.absent}</Badge>
                          <Badge variant="outline">Excused: {session.excused}</Badge>
                        </div>
                        <Button asChild size="sm">
                          <Link href={`/attendance/${session.id}`}>
                            Review Attendance
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <ClipboardCheck className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="font-medium text-lg">No past sessions</h3>
                    <p className="mt-1 text-muted-foreground">
                      Past sessions will show here once completed.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
