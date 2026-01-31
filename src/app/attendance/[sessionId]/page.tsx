"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatInTimeZone } from "date-fns-tz";
import {
  ArrowLeft,
  Check,
  X,
  Clock,
  Users,
  MapPin,
  Calendar,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? "Europe/Madrid";

const formatDate = (date: Date) => {
  return formatInTimeZone(date, TIMEZONE, "EEEE, MMMM d, yyyy");
};

const formatTime = (date: Date) => {
  return formatInTimeZone(date, TIMEZONE, "HH:mm");
};

type AttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED";

export default function SessionAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [localAttendance, setLocalAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: attendanceData, refetch } =
    api.attendance.getSessionAttendance.useQuery(
      { sessionId },
      {
        onSuccess: (data) => {
          // Initialize local state with existing attendance
          const initial: Record<string, AttendanceStatus> = {};
          data.students.forEach((student) => {
            if (student.attendance) {
              initial[student.user.id] = student.attendance.status;
            }
          });
          setLocalAttendance(initial);
        },
      }
    );

  const markBulkMutation = api.attendance.markBulkAttendance.useMutation();

  const handleStatusChange = (userId: string, status: AttendanceStatus) => {
    setLocalAttendance((prev) => ({ ...prev, [userId]: status }));
    setHasChanges(true);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (!attendanceData) return;
    const newAttendance: Record<string, AttendanceStatus> = {};
    attendanceData.students.forEach((student) => {
      newAttendance[student.user.id] = status;
    });
    setLocalAttendance(newAttendance);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!attendanceData) return;

    const attendances = Object.entries(localAttendance).map(([userId, status]) => ({
      userId,
      status,
    }));

    markBulkMutation.mutate(
      { sessionId, attendances },
      {
        onSuccess: () => {
          toast.success("Attendance saved successfully");
          setHasChanges(false);
          refetch();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const getStatusColor = (status: AttendanceStatus | undefined) => {
    switch (status) {
      case "PRESENT":
        return "bg-primary text-primary-foreground";
      case "ABSENT":
        return "bg-destructive text-destructive-foreground";
      case "EXCUSED":
        return "bg-amber-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (!attendanceData) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  const { session, students, totalPresent, totalAbsent, totalExcused } =
    attendanceData;

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/attendance">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Attendance
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-semibold text-2xl">
              {session?.lab.name} Lab Attendance
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {session && formatDate(new Date(session.startAt))}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {session && formatTime(new Date(session.startAt))} -{" "}
                {session && formatTime(new Date(session.endAt))}
              </span>
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || markBulkMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {markBulkMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground text-sm">Total</span>
            </div>
            <p className="mt-1 font-semibold text-2xl">{students.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground text-sm">Present</span>
            </div>
            <p className="mt-1 font-semibold text-2xl text-primary">
              {totalPresent}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-destructive" />
              <span className="text-muted-foreground text-sm">Absent</span>
            </div>
            <p className="mt-1 font-semibold text-2xl text-destructive">
              {totalAbsent}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground text-sm">Excused</span>
            </div>
            <p className="mt-1 font-semibold text-2xl text-amber-500">
              {totalExcused}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => handleMarkAll("PRESENT")}>
          <Check className="mr-1 h-3 w-3" />
          Mark All Present
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleMarkAll("ABSENT")}>
          <X className="mr-1 h-3 w-3" />
          Mark All Absent
        </Button>
      </div>

      {/* Student list */}
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>
            Click on a student's status to change it
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No students registered for this session
            </p>
          ) : (
            <div className="space-y-2">
              {students.map((student) => {
                const currentStatus = localAttendance[student.user.id];

                return (
                  <div
                    key={student.seatBookingId}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{student.seatName}</Badge>
                      <div>
                        <p className="font-medium">
                          {student.user.firstName} {student.user.lastName}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {student.user.email}
                        </p>
                      </div>
                      {student.user.isBanned && (
                        <Badge variant="destructive" className="text-xs">
                          Restricted
                        </Badge>
                      )}
                    </div>
                    <Select
                      value={currentStatus ?? ""}
                      onValueChange={(value) =>
                        handleStatusChange(
                          student.user.id,
                          value as AttendanceStatus
                        )
                      }
                    >
                      <SelectTrigger
                        className={`w-32 ${getStatusColor(currentStatus)}`}
                      >
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRESENT">
                          <span className="flex items-center gap-2">
                            <Check className="h-3 w-3" />
                            Present
                          </span>
                        </SelectItem>
                        <SelectItem value="ABSENT">
                          <span className="flex items-center gap-2">
                            <X className="h-3 w-3" />
                            Absent
                          </span>
                        </SelectItem>
                        <SelectItem value="EXCUSED">
                          <span className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            Excused
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
