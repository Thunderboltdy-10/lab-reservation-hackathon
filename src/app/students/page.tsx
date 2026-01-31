"use client";

import React, { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Users,
  Search,
  Ban,
  CheckCircle,
  User,
  Calendar,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [studentToBan, setStudentToBan] = useState<{
    id: string;
    name: string;
    isBanned: boolean;
  } | null>(null);

  const { data: students, refetch } =
    api.attendance.getAllStudentsWithAttendance.useQuery();

  const { data: studentHistory } = api.attendance.getStudentHistory.useQuery(
    { userId: selectedStudent ?? "" },
    { enabled: !!selectedStudent }
  );

  const banMutation = api.attendance.updateBanStatus.useMutation();

  const handleBanToggle = () => {
    if (!studentToBan) return;

    banMutation.mutate(
      {
        userId: studentToBan.id,
        isBanned: !studentToBan.isBanned,
        banReason: !studentToBan.isBanned ? banReason : undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            studentToBan.isBanned
              ? "Student restrictions removed"
              : "Student has been restricted"
          );
          setIsBanDialogOpen(false);
          setStudentToBan(null);
          setBanReason("");
          refetch();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const filteredStudents = students?.filter((student) => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const email = student.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="font-semibold text-3xl">Student Management</h1>
        <p className="mt-1 text-muted-foreground">
          View student attendance history and manage restrictions
        </p>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">
          <Users className="mr-1 h-3 w-3" />
          {filteredStudents?.length ?? 0} students
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Student list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>All Students</CardTitle>
              <CardDescription>
                Click on a student to view their attendance history
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Attendance</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents?.map((student) => (
                    <TableRow
                      key={student.id}
                      className={`cursor-pointer transition-colors ${
                        selectedStudent === student.id ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelectedStudent(student.id)}
                    >
                      <TableCell className="font-medium">
                        {student.firstName} {student.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.email}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            parseFloat(student.attendanceRate as string) >= 80
                              ? "default"
                              : parseFloat(student.attendanceRate as string) >= 60
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {student.attendanceRate === "N/A"
                            ? "N/A"
                            : `${student.attendanceRate}%`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {student.isBanned ? (
                          <Badge variant="destructive">
                            <Ban className="mr-1 h-3 w-3" />
                            Restricted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-primary">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog
                          open={
                            isBanDialogOpen && studentToBan?.id === student.id
                          }
                          onOpenChange={(open) => {
                            setIsBanDialogOpen(open);
                            if (!open) {
                              setStudentToBan(null);
                              setBanReason("");
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant={student.isBanned ? "outline" : "ghost"}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStudentToBan({
                                  id: student.id,
                                  name: `${student.firstName} ${student.lastName}`,
                                  isBanned: student.isBanned,
                                });
                                setIsBanDialogOpen(true);
                              }}
                            >
                              {student.isBanned ? (
                                <>
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Unban
                                </>
                              ) : (
                                <>
                                  <Ban className="mr-1 h-3 w-3" />
                                  Restrict
                                </>
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent onClick={(e) => e.stopPropagation()}>
                            <DialogHeader>
                              <DialogTitle>
                                {studentToBan?.isBanned
                                  ? "Remove Restrictions"
                                  : "Restrict Student"}
                              </DialogTitle>
                              <DialogDescription>
                                {studentToBan?.isBanned
                                  ? `Remove booking restrictions for ${studentToBan?.name}?`
                                  : `Restricted students will need teacher approval for their bookings.`}
                              </DialogDescription>
                            </DialogHeader>
                            {!studentToBan?.isBanned && (
                              <div className="py-4">
                                <Label htmlFor="reason">
                                  Reason for Restriction
                                </Label>
                                <Textarea
                                  id="reason"
                                  value={banReason}
                                  onChange={(e) => setBanReason(e.target.value)}
                                  placeholder="Enter reason for restricting this student..."
                                  className="mt-2"
                                />
                              </div>
                            )}
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setIsBanDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleBanToggle}
                                variant={
                                  studentToBan?.isBanned
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {studentToBan?.isBanned
                                  ? "Remove Restrictions"
                                  : "Restrict Student"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Student details panel */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Student Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedStudent || !studentHistory ? (
                <p className="py-8 text-center text-muted-foreground">
                  Select a student to view their details
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {studentHistory.user.firstName}{" "}
                      {studentHistory.user.lastName}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {studentHistory.user.email}
                    </p>
                  </div>

                  {studentHistory.user.isBanned && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                      <div className="flex items-center gap-2 font-medium text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        Account Restricted
                      </div>
                      {studentHistory.user.banReason && (
                        <p className="mt-1 text-destructive/80 text-sm">
                          {studentHistory.user.banReason}
                        </p>
                      )}
                      {studentHistory.user.bannedAt && (
                        <p className="mt-1 text-destructive/60 text-xs">
                          Since{" "}
                          {format(
                            new Date(studentHistory.user.bannedAt),
                            "PP"
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <TrendingUp className="h-3 w-3" />
                        Attendance Rate
                      </div>
                      <p className="mt-1 font-semibold text-xl">
                        {studentHistory.attendanceRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Calendar className="h-3 w-3" />
                        Total Sessions
                      </div>
                      <p className="mt-1 font-semibold text-xl">
                        {studentHistory.stats.totalSessions}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-primary/10 p-2 text-center">
                      <p className="font-semibold text-primary text-lg">
                        {studentHistory.stats.present}
                      </p>
                      <p className="text-muted-foreground text-xs">Present</p>
                    </div>
                    <div className="rounded-lg bg-destructive/10 p-2 text-center">
                      <p className="font-semibold text-destructive text-lg">
                        {studentHistory.stats.absent}
                      </p>
                      <p className="text-muted-foreground text-xs">Absent</p>
                    </div>
                    <div className="rounded-lg bg-amber-500/10 p-2 text-center">
                      <p className="font-semibold text-amber-600 text-lg">
                        {studentHistory.stats.excused}
                      </p>
                      <p className="text-muted-foreground text-xs">Excused</p>
                    </div>
                  </div>

                  {studentHistory.attendanceRecords.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium text-sm">
                        Recent Attendance
                      </h4>
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {studentHistory.attendanceRecords
                          .slice(0, 5)
                          .map((record) => (
                            <div
                              key={record.id}
                              className="flex items-center justify-between rounded border p-2 text-sm"
                            >
                              <span className="text-muted-foreground">
                                {record.session.lab.name} -{" "}
                                {format(new Date(record.markedAt), "PP")}
                              </span>
                              <Badge
                                variant={
                                  record.status === "PRESENT"
                                    ? "default"
                                    : record.status === "EXCUSED"
                                    ? "secondary"
                                    : "destructive"
                                }
                                className="text-xs"
                              >
                                {record.status}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
