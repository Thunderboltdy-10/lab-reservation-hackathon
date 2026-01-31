"use client";

import React from "react";
import Link from "next/link";
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
  Calendar,
  Clock,
  MapPin,
  Package,
  X,
  CheckCircle,
  AlertCircle,
  ClipboardCheck,
  Users,
  FlaskConical,
  History,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? "Europe/Madrid";

const formatDate = (date: Date) => {
  return formatInTimeZone(date, TIMEZONE, "EEEE, MMMM d");
};

const formatTime = (date: Date) => {
  return formatInTimeZone(date, TIMEZONE, "HH:mm");
};

export default function DashboardPage() {
  const { data: account } = api.account.getAccount.useQuery();
  const { data: bookings, refetch } = api.account.getMyBookings.useQuery();
  const isTeacher = account?.role === "TEACHER" || account?.role === "ADMIN";
  const { data: pendingBookings, refetch: refetchPending } =
    api.account.getPendingBookings.useQuery({}, { enabled: isTeacher });
  const { data: attendanceQueue } =
    api.attendance.getSessionsNeedingAttendance.useQuery(undefined, {
      enabled: isTeacher,
    });
  const { data: attendanceHistory } =
    api.attendance.getRecentAttendance.useQuery({ take: 6 }, { enabled: isTeacher });
  const { data: myAttendance } =
    api.attendance.getMyAttendanceHistory.useQuery(undefined, { enabled: !isTeacher });
  const { data: todaySessions } = api.account.getSessionAll.useQuery(
    { date: new Date() },
    { enabled: isTeacher }
  );
  const cancelMutation = api.account.cancelBooking.useMutation();
  const approveMutation = api.account.approveBooking.useMutation();
  const rejectMutation = api.account.rejectBooking.useMutation();

  const handleCancel = (bookingId: string) => {
    cancelMutation.mutate(
      { bookingId },
      {
        onSuccess: () => {
          toast.success("Booking cancelled successfully");
          refetch();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <Badge className="bg-primary text-primary-foreground">
            <CheckCircle className="mr-1 h-3 w-3" />
            Confirmed
          </Badge>
        );
      case "PENDING_APPROVAL":
        return (
          <Badge variant="secondary" className="bg-amber-500 text-white">
            <AlertCircle className="mr-1 h-3 w-3" />
            Pending Approval
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <X className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleApprove = (bookingId: string) => {
    approveMutation.mutate(
      { bookingId },
      {
        onSuccess: () => {
          toast.success("Booking approved");
          refetchPending();
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const handleReject = (bookingId: string) => {
    rejectMutation.mutate(
      { bookingId },
      {
        onSuccess: () => {
          toast.success("Booking rejected");
          refetchPending();
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-semibold text-3xl">
          Welcome back, {account?.firstName}
        </h1>
        <p className="text-muted-foreground">
          {isTeacher
            ? "Manage sessions, approvals, and attendance in one place."
            : "Manage your upcoming lab sessions and bookings."}
        </p>
      </div>

      {account?.isBanned && !isTeacher && (
        <Card className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Account Restricted
              </p>
              <p className="text-amber-700 text-sm dark:text-amber-300">
                Your bookings require teacher approval. Reason:{" "}
                {account.isBanned ? "Pending review" : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isTeacher ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Pending Approvals
                </CardTitle>
                <CardDescription>
                  {pendingBookings?.length ?? 0} booking requests waiting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingBookings && pendingBookings.length > 0 ? (
                  pendingBookings.slice(0, 6).map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">
                          {booking.user.firstName} {booking.user.lastName}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {booking.session.lab.name} Lab · Seat{" "}
                          {booking.seat.name} ·{" "}
                          {formatDate(new Date(booking.session.startAt))} ·{" "}
                          {formatTime(new Date(booking.session.startAt))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(booking.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(booking.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-sm">
                    No pending approval requests.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Attendance Needed
                </CardTitle>
                <CardDescription>
                  {attendanceQueue?.length ?? 0} sessions waiting for attendance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {attendanceQueue && attendanceQueue.length > 0 ? (
                  attendanceQueue.slice(0, 5).map((session) => (
                    <Link
                      key={session.id}
                      href={`/attendance/${session.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 transition hover:border-primary/60 hover:bg-muted/50"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">
                          {session.labName} Lab
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {formatDate(new Date(session.startAt))} ·{" "}
                          {formatTime(new Date(session.startAt))} —{" "}
                          {formatTime(new Date(session.endAt))}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {session.unmarkedCount} unmarked
                      </Badge>
                    </Link>
                  ))
                ) : (
                  <div className="text-muted-foreground text-sm">
                    Attendance is up to date.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Attendance History
                </CardTitle>
                <CardDescription>
                  Recent sessions with recorded attendance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {attendanceHistory && attendanceHistory.length > 0 ? (
                  attendanceHistory.map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{session.labName} Lab</div>
                        <div className="text-muted-foreground text-sm">
                          {formatDate(new Date(session.startAt))} ·{" "}
                          {formatTime(new Date(session.startAt))}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">Present: {session.present}</Badge>
                        <Badge variant="outline">Absent: {session.absent}</Badge>
                        <Badge variant="outline">Excused: {session.excused}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-sm">
                    No attendance history yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Today&apos;s Sessions
                </CardTitle>
                <CardDescription>
                  {todaySessions?.filter((session) => new Date(session.startAt) >= new Date()).length ?? 0} sessions scheduled
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {todaySessions && todaySessions.length > 0 ? (
                  todaySessions
                    .filter((session) => new Date(session.startAt) >= new Date())
                    .slice(0, 5)
                    .map((session) => (
                      <div
                        key={session.id}
                        className="rounded-lg border border-border/60 bg-muted/30 p-3"
                      >
                        <div className="font-medium">
                          {session.lab.name} Lab
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {formatTime(new Date(session.startAt))} —{" "}
                          {formatTime(new Date(session.endAt))}
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-muted-foreground text-sm">
                    No sessions later today.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Lab Shortcuts
                </CardTitle>
                <CardDescription>
                  Jump directly to lab layouts and bookings
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button asChild>
                  <a href="/lab/physics">Physics/Chemistry Lab</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/lab/biology">Biology Lab</a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button asChild>
                  <a href="/lab">
                    <FlaskConical className="mr-2 h-4 w-4" />
                    Manage Labs
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/attendance">
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Take Attendance
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/equipment">
                    <Package className="mr-2 h-4 w-4" />
                    Manage Equipment
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/students">
                    <Users className="mr-2 h-4 w-4" />
                    Student Management
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-xl">Upcoming Bookings</h2>
              <Badge variant="outline">{bookings?.length ?? 0} bookings</Badge>
            </div>

            {!bookings || bookings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="font-medium text-lg">No upcoming bookings</h3>
                  <p className="mt-1 text-muted-foreground">
                    Book a lab session to get started
                  </p>
                  <Button className="mt-4" asChild>
                    <a href="/book">Book a Lab</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="stagger-children space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {booking.session.lab.name} Lab
                          </CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(new Date(booking.session.startAt))}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(new Date(booking.session.startAt))} -{" "}
                              {formatTime(new Date(booking.session.endAt))}
                            </span>
                          </CardDescription>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Seat {booking.seat.name}</Badge>
                          </div>
                          {booking.equipmentBookings.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {booking.equipmentBookings.map((eq) => (
                                <Badge
                                  key={eq.id}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  <Package className="mr-1 h-3 w-3" />
                                  {eq.equipment.name} x{eq.amount}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <X className="mr-1 h-4 w-4" />
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel your booking for{" "}
                                {booking.session.lab.name} Lab on{" "}
                                {formatDate(new Date(booking.session.startAt))}? This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancel(booking.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Cancel Booking
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button asChild>
                  <a href="/book/physics">Book Physics Lab</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/book/biology">Book Biology Lab</a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Attendance Summary
                </CardTitle>
                <CardDescription>Your recent attendance records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {myAttendance && myAttendance.stats.totalSessions > 0 ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">Present: {myAttendance.stats.present}</Badge>
                      <Badge variant="outline">Absent: {myAttendance.stats.absent}</Badge>
                      <Badge variant="outline">Excused: {myAttendance.stats.excused}</Badge>
                      <Badge variant="secondary">
                        Rate: {Math.round(myAttendance.attendanceRate)}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {myAttendance.attendanceRecords.slice(0, 3).map((record) => (
                        <div
                          key={record.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm"
                        >
                          <div>
                            <div className="font-medium">{record.session.lab.name} Lab</div>
                            <div className="text-muted-foreground text-xs">
                              {formatDate(new Date(record.session.startAt))} ·{" "}
                              {formatTime(new Date(record.session.startAt))}
                            </div>
                          </div>
                          <Badge variant="outline">{record.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    No attendance records yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
