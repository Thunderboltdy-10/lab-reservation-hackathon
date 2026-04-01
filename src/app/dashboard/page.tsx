"use client";

import { differenceInCalendarDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
	AlertCircle,
	Calendar,
	CheckCircle,
	ClipboardCheck,
	Clock,
	FlaskConical,
	History,
	MapPin,
	Package,
	ShieldAlert,
	TestTubeDiagonal,
	Users,
	X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";

const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? "Europe/Madrid";

const formatDate = (date: Date) =>
	formatInTimeZone(date, TIMEZONE, "EEEE, MMMM d");

const formatDateTime = (date: Date) =>
	formatInTimeZone(date, TIMEZONE, "EEE d MMM, HH:mm");

const formatTimeRange = (start: Date, end: Date) =>
	`${formatInTimeZone(start, TIMEZONE, "HH:mm")} - ${formatInTimeZone(
		end,
		TIMEZONE,
		"HH:mm",
	)}`;

const formatAttendanceTone = (value: number) => {
	if (value >= 80) return "default" as const;
	if (value >= 60) return "secondary" as const;
	return "destructive" as const;
};

const getBookingStatusBadge = (status: string) => {
	if (status === "CONFIRMED") {
		return (
			<Badge className="bg-primary text-primary-foreground">
				<CheckCircle className="mr-1 h-3 w-3" />
				Confirmed
			</Badge>
		);
	}

	if (status === "PENDING_APPROVAL") {
		return (
			<Badge className="bg-amber-500 text-white">
				<AlertCircle className="mr-1 h-3 w-3" />
				Pending Approval
			</Badge>
		);
	}

	return (
		<Badge variant="destructive">
			<X className="mr-1 h-3 w-3" />
			Rejected
		</Badge>
	);
};

function MetricCard({
	title,
	value,
	description,
	icon: Icon,
}: {
	title: string;
	value: string | number;
	description: string;
	icon: typeof Calendar;
}) {
	return (
		<Card className="border-border/60 bg-card/85 shadow-sm">
			<CardContent className="flex items-start justify-between gap-4 pt-6">
				<div>
					<p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
						{title}
					</p>
					<p className="mt-2 font-semibold text-3xl">{value}</p>
					<p className="mt-1 text-muted-foreground text-sm">{description}</p>
				</div>
				<div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
					<Icon className="h-5 w-5" />
				</div>
			</CardContent>
		</Card>
	);
}

export default function DashboardPage() {
	const utils = api.useUtils();
	const { data: overview } = api.account.getDashboardOverview.useQuery();
	const { data: bookings } = api.account.getMyBookings.useQuery(undefined, {
		enabled: overview?.user.role === "STUDENT",
	});
	const { data: pendingBookings } = api.account.getPendingBookings.useQuery(
		{},
		{ enabled: overview?.user.role !== "STUDENT" },
	);
	const { data: attendanceQueue } =
		api.attendance.getSessionsNeedingAttendance.useQuery(undefined, {
			enabled: overview?.user.role !== "STUDENT",
		});
	const { data: attendanceHistory } =
		api.attendance.getRecentAttendance.useQuery(
			{ take: 6 },
			{ enabled: overview?.user.role !== "STUDENT" },
		);

	const cancelMutation = api.account.cancelBooking.useMutation();
	const approveMutation = api.account.approveBooking.useMutation();
	const rejectMutation = api.account.rejectBooking.useMutation();
	const reportUsageMutation =
		api.account.reportSessionEquipmentUsage.useMutation();

	const [usageDrafts, setUsageDrafts] = useState<Record<string, number>>({});

	useEffect(() => {
		if (!overview?.student?.pendingUsageReports) return;

		const nextDrafts: Record<string, number> = {};
		for (const session of overview.student.pendingUsageReports) {
			for (const item of session.items) {
				nextDrafts[item.equipmentBookingId] = item.actualUsed ?? item.amount;
			}
		}
		setUsageDrafts(nextDrafts);
	}, [overview?.student?.pendingUsageReports]);

	const isTeacher =
		overview?.user.role === "TEACHER" || overview?.user.role === "ADMIN";

	const outstandingReports = useMemo(
		() => overview?.student?.pendingUsageReports ?? [],
		[overview?.student?.pendingUsageReports],
	);

	const handleCancel = (bookingId: string) => {
		cancelMutation.mutate(
			{ bookingId },
			{
				onSuccess: async () => {
					toast.success("Booking cancelled successfully");
					await Promise.all([
						utils.account.getMyBookings.invalidate(),
						utils.account.getDashboardOverview.invalidate(),
					]);
				},
				onError: (error) => toast.error(error.message),
			},
		);
	};

	const handleApprove = (bookingId: string) => {
		approveMutation.mutate(
			{ bookingId },
			{
				onSuccess: async () => {
					toast.success("Booking approved");
					await Promise.all([
						utils.account.getPendingBookings.invalidate(),
						utils.account.getDashboardOverview.invalidate(),
					]);
				},
				onError: (error) => toast.error(error.message),
			},
		);
	};

	const handleReject = (bookingId: string) => {
		rejectMutation.mutate(
			{ bookingId },
			{
				onSuccess: async () => {
					toast.success("Booking rejected");
					await Promise.all([
						utils.account.getPendingBookings.invalidate(),
						utils.account.getDashboardOverview.invalidate(),
					]);
				},
				onError: (error) => toast.error(error.message),
			},
		);
	};

	const handleUsageSave = (sessionId: string) => {
		const session = outstandingReports.find(
			(entry) => entry.sessionId === sessionId,
		);
		if (!session) return;

		reportUsageMutation.mutate(
			{
				sessionId,
				reports: session.items.map((item) => ({
					equipmentBookingId: item.equipmentBookingId,
					actualUsed: usageDrafts[item.equipmentBookingId] ?? item.amount,
				})),
			},
			{
				onSuccess: async () => {
					toast.success("Equipment usage saved");
					await utils.account.getDashboardOverview.invalidate();
				},
				onError: (error) => toast.error(error.message),
			},
		);
	};

	if (!overview) {
		return (
			<div className="container mx-auto max-w-7xl p-6">
				<Card className="border-border/60">
					<CardContent className="py-16 text-center text-muted-foreground">
						Loading operations centre...
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-7xl p-6">
			<div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(179,220,60,0.28),transparent_35%),linear-gradient(135deg,rgba(0,48,135,0.98),rgba(6,21,54,0.96))] p-8 text-white shadow-2xl shadow-primary/10">
				<div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.08),transparent)] lg:block" />
				<div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-3xl">
						<Badge className="border border-white/20 bg-white/10 text-white hover:bg-white/10">
							{isTeacher ? "Lab Operations Centre" : "Student Control Deck"}
						</Badge>
						<h1 className="mt-4 font-semibold text-4xl tracking-tight lg:text-5xl">
							{isTeacher
								? `Keep ${overview.user.firstName}'s labs running clean, on time, and accountable.`
								: "Track every reservation, seat, and lab item from one place."}
						</h1>
						<p className="mt-4 max-w-2xl text-base text-white/75 lg:text-lg">
							{isTeacher
								? "Pending approvals, attendance backlog, expiring inventory, and usage reconciliation are surfaced before they become operational problems."
								: "Bookings, approvals, attendance, and equipment usage are all visible here so nothing gets missed after a session ends."}
						</p>
					</div>

					<div className="grid min-w-full gap-3 sm:grid-cols-2 lg:min-w-[26rem]">
						{isTeacher ? (
							<>
								<div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
									<div className="text-white/60 text-xs uppercase tracking-[0.22em]">
										Pending approvals
									</div>
									<div className="mt-2 font-semibold text-3xl">
										{overview.teacher?.metrics.pendingApprovalCount ?? 0}
									</div>
								</div>
								<div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
									<div className="text-white/60 text-xs uppercase tracking-[0.22em]">
										Attendance backlog
									</div>
									<div className="mt-2 font-semibold text-3xl">
										{overview.teacher?.metrics.attendanceBacklogCount ?? 0}
									</div>
								</div>
							</>
						) : (
							<>
								<div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
									<div className="text-white/60 text-xs uppercase tracking-[0.22em]">
										Upcoming bookings
									</div>
									<div className="mt-2 font-semibold text-3xl">
										{overview.student?.metrics.upcomingBookingsCount ?? 0}
									</div>
								</div>
								<div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
									<div className="text-white/60 text-xs uppercase tracking-[0.22em]">
										Attendance rate
									</div>
									<div className="mt-2 font-semibold text-3xl">
										{overview.student?.metrics.attendanceRate ?? 0}%
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			</div>

			{overview.user.isBanned && !isTeacher && (
				<Card className="mt-6 border-amber-500/50 bg-amber-50/80 shadow-sm">
					<CardContent className="flex gap-3 pt-6">
						<ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
						<div>
							<p className="font-medium text-amber-900">Restricted account</p>
							<p className="text-amber-800 text-sm">
								Your bookings now require teacher approval.
								{overview.user.banReason
									? ` Reason: ${overview.user.banReason}`
									: ""}
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{isTeacher ? (
				<>
					<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
						<MetricCard
							title="Today"
							value={overview.teacher?.metrics.todaySessionsCount ?? 0}
							description="Sessions scheduled today"
							icon={Calendar}
						/>
						<MetricCard
							title="Approvals"
							value={overview.teacher?.metrics.pendingApprovalCount ?? 0}
							description="Booking requests still waiting"
							icon={AlertCircle}
						/>
						<MetricCard
							title="Attendance"
							value={overview.teacher?.metrics.attendanceBacklogCount ?? 0}
							description="Past sessions not fully marked"
							icon={ClipboardCheck}
						/>
						<MetricCard
							title="Usage"
							value={overview.teacher?.metrics.pendingUsageReportsCount ?? 0}
							description="Student equipment reports missing"
							icon={TestTubeDiagonal}
						/>
						<MetricCard
							title="Expiring"
							value={overview.teacher?.metrics.expiringEquipmentCount ?? 0}
							description="Items expiring within 30 days"
							icon={Package}
						/>
					</div>

					<div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
						<div className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<AlertCircle className="h-4 w-4" />
										Pending Approvals
									</CardTitle>
									<CardDescription>
										Requests from restricted students that still need a
										decision.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									{pendingBookings && pendingBookings.length > 0 ? (
										pendingBookings.slice(0, 6).map((booking) => (
											<div
												key={booking.id}
												className="rounded-2xl border border-border/60 bg-muted/30 p-4"
											>
												<div className="flex flex-wrap items-start justify-between gap-3">
													<div>
														<p className="font-medium">
															{booking.user.firstName} {booking.user.lastName}
														</p>
														<p className="mt-1 text-muted-foreground text-sm">
															{booking.session.lab.name} Lab · Seat{" "}
															{booking.seat.name}
														</p>
														<p className="text-muted-foreground text-sm">
															{formatDate(new Date(booking.session.startAt))} ·{" "}
															{formatTimeRange(
																new Date(booking.session.startAt),
																new Date(booking.session.endAt),
															)}
														</p>
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
											</div>
										))
									) : (
										<div className="rounded-2xl border border-border/70 border-dashed p-6 text-center text-muted-foreground text-sm">
											No approval requests are waiting.
										</div>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<ClipboardCheck className="h-4 w-4" />
										Attendance Queue
									</CardTitle>
									<CardDescription>
										Past sessions that still need attendance completed.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									{attendanceQueue && attendanceQueue.length > 0 ? (
										attendanceQueue.slice(0, 5).map((session) => (
											<Link
												key={session.id}
												href={`/attendance/${session.id}`}
												className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-4 transition hover:border-primary/60 hover:bg-muted/50"
											>
												<div>
													<p className="font-medium">{session.labName} Lab</p>
													<p className="mt-1 text-muted-foreground text-sm">
														{formatDate(new Date(session.startAt))} ·{" "}
														{formatTimeRange(
															new Date(session.startAt),
															new Date(session.endAt),
														)}
													</p>
												</div>
												<Badge variant="outline">
													{session.unmarkedCount} unmarked
												</Badge>
											</Link>
										))
									) : (
										<div className="rounded-2xl border border-border/70 border-dashed p-6 text-center text-muted-foreground text-sm">
											Attendance is fully up to date.
										</div>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<TestTubeDiagonal className="h-4 w-4" />
										Usage Reporting Backlog
									</CardTitle>
									<CardDescription>
										Finished sessions still missing student equipment usage
										reports.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									{overview.teacher?.usageBacklogSessions.length ? (
										overview.teacher.usageBacklogSessions.map((session) => (
											<div
												key={session.id}
												className="rounded-2xl border border-border/60 bg-muted/30 p-4"
											>
												<div className="flex flex-wrap items-center justify-between gap-3">
													<div>
														<p className="font-medium">{session.labName} Lab</p>
														<p className="mt-1 text-muted-foreground text-sm">
															{formatDate(new Date(session.startAt))} ·{" "}
															{formatTimeRange(
																new Date(session.startAt),
																new Date(session.endAt),
															)}
														</p>
													</div>
													<div className="flex flex-wrap gap-2 text-xs">
														<Badge variant="outline">
															{session.missingStudentCount} students missing
														</Badge>
														<Badge variant="outline">
															{session.missingReportCount} reports pending
														</Badge>
													</div>
												</div>
											</div>
										))
									) : (
										<div className="rounded-2xl border border-border/70 border-dashed p-6 text-center text-muted-foreground text-sm">
											No managed sessions are waiting on usage reporting.
										</div>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<History className="h-4 w-4" />
										Recent Equipment Reconciliation
									</CardTitle>
									<CardDescription>
										Compare reserved vs reported usage after sessions finish.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									{overview.teacher?.recentUsageSessions.length ? (
										overview.teacher.recentUsageSessions.map((session) => (
											<div
												key={session.id}
												className="rounded-2xl border border-border/60 bg-muted/30 p-4"
											>
												<div className="flex flex-wrap items-center justify-between gap-3">
													<div>
														<p className="font-medium">{session.labName} Lab</p>
														<p className="mt-1 text-muted-foreground text-sm">
															{formatDateTime(new Date(session.endAt))}
														</p>
													</div>
													<div className="flex flex-wrap gap-2 text-xs">
														<Badge variant="outline">
															Reserved {session.reservedTotal}
														</Badge>
														<Badge variant="outline">
															Used {session.usedTotal}
														</Badge>
														<Badge variant="outline">
															Reports {session.reportedCount}/
															{session.bookingCount}
														</Badge>
													</div>
												</div>
											</div>
										))
									) : (
										<div className="rounded-2xl border border-border/70 border-dashed p-6 text-center text-muted-foreground text-sm">
											No finished sessions with equipment usage yet.
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
										Today's Sessions
									</CardTitle>
									<CardDescription>
										Your schedule for today with booking counts attached.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									{overview.teacher?.todaySessions.length ? (
										overview.teacher.todaySessions.map((session) => (
											<div
												key={session.id}
												className="rounded-2xl border border-border/60 bg-muted/30 p-4"
											>
												<p className="font-medium">{session.labName} Lab</p>
												<p className="mt-1 text-muted-foreground text-sm">
													{formatTimeRange(
														new Date(session.startAt),
														new Date(session.endAt),
													)}
												</p>
												<Badge variant="outline" className="mt-3">
													{session.bookedCount} bookings
												</Badge>
											</div>
										))
									) : (
										<div className="rounded-2xl border border-border/70 border-dashed p-6 text-center text-muted-foreground text-sm">
											No sessions scheduled today.
										</div>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Package className="h-4 w-4" />
										Expiring Inventory
									</CardTitle>
									<CardDescription>
										Inventory items expiring within the next 30 days.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									{overview.teacher?.expiringEquipment.length ? (
										overview.teacher.expiringEquipment.map((item) => {
											const days = item.expirationDate
												? differenceInCalendarDays(
														new Date(item.expirationDate),
														new Date(),
													)
												: null;

											return (
												<div
													key={item.id}
													className="rounded-2xl border border-border/60 bg-muted/30 p-4"
												>
													<div className="flex items-start justify-between gap-3">
														<div>
															<p className="font-medium">{item.name}</p>
															<p className="mt-1 text-muted-foreground text-sm">
																{item.labName} Lab · {item.total}{" "}
																{item.unitType === "ML" ? "mL" : "units"}
															</p>
														</div>
														<Badge
															variant={
																days !== null && days < 7
																	? "destructive"
																	: "outline"
															}
														>
															{days !== null ? `${days} days` : "Scheduled"}
														</Badge>
													</div>
												</div>
											);
										})
									) : (
										<div className="rounded-2xl border border-border/70 border-dashed p-6 text-center text-muted-foreground text-sm">
											No expiring inventory has been flagged.
										</div>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Quick Actions</CardTitle>
								</CardHeader>
								<CardContent className="grid gap-2">
									<Button asChild>
										<Link href="/lab">
											<FlaskConical className="mr-2 h-4 w-4" />
											Manage Lab Sessions
										</Link>
									</Button>
									<Button variant="outline" asChild>
										<Link href="/attendance">
											<ClipboardCheck className="mr-2 h-4 w-4" />
											Open Attendance
										</Link>
									</Button>
									<Button variant="outline" asChild>
										<Link href="/equipment">
											<Package className="mr-2 h-4 w-4" />
											Review Equipment
										</Link>
									</Button>
									<Button variant="outline" asChild>
										<Link href="/students">
											<Users className="mr-2 h-4 w-4" />
											View Student Records
										</Link>
									</Button>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Attendance History</CardTitle>
									<CardDescription>
										Recently completed sessions with attendance already marked.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									{attendanceHistory && attendanceHistory.length > 0 ? (
										attendanceHistory.map((session) => (
											<div
												key={session.id}
												className="rounded-2xl border border-border/60 bg-muted/30 p-4"
											>
												<p className="font-medium">{session.labName} Lab</p>
												<p className="mt-1 text-muted-foreground text-sm">
													{formatDateTime(new Date(session.startAt))}
												</p>
												<div className="mt-3 flex flex-wrap gap-2 text-xs">
													<Badge variant="outline">
														Present {session.present}
													</Badge>
													<Badge variant="outline">
														Absent {session.absent}
													</Badge>
													<Badge variant="outline">
														Excused {session.excused}
													</Badge>
												</div>
											</div>
										))
									) : (
										<div className="rounded-2xl border border-border/70 border-dashed p-6 text-center text-muted-foreground text-sm">
											No attendance history yet.
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</div>
				</>
			) : (
				<>
					<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<MetricCard
							title="Bookings"
							value={overview.student?.metrics.upcomingBookingsCount ?? 0}
							description="Upcoming reservations on your calendar"
							icon={Calendar}
						/>
						<MetricCard
							title="Pending"
							value={overview.student?.metrics.pendingApprovalCount ?? 0}
							description="Bookings still waiting for approval"
							icon={AlertCircle}
						/>
						<MetricCard
							title="Usage Reports"
							value={overview.student?.metrics.pendingUsageReportsCount ?? 0}
							description="Past sessions that still need usage reporting"
							icon={TestTubeDiagonal}
						/>
						<MetricCard
							title="Attendance"
							value={`${overview.student?.metrics.attendanceRate ?? 0}%`}
							description="Present or excused sessions"
							icon={ClipboardCheck}
						/>
					</div>

					<div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
						<div className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<MapPin className="h-4 w-4" />
										Next Booking
									</CardTitle>
									<CardDescription>
										Your next confirmed or pending lab reservation.
									</CardDescription>
								</CardHeader>
								<CardContent>
									{overview.student?.nextBooking ? (
										<div className="rounded-[1.6rem] border border-border/70 bg-muted/30 p-5">
											<div className="flex flex-wrap items-start justify-between gap-4">
												<div>
													<p className="font-medium text-xl">
														{overview.student.nextBooking.labName} Lab
													</p>
													<p className="mt-2 text-muted-foreground text-sm">
														{formatDate(
															new Date(overview.student.nextBooking.startAt),
														)}
													</p>
													<p className="text-muted-foreground text-sm">
														{formatTimeRange(
															new Date(overview.student.nextBooking.startAt),
															new Date(overview.student.nextBooking.endAt),
														)}{" "}
														· Seat {overview.student.nextBooking.seatName}
													</p>
												</div>
												{getBookingStatusBadge(
													overview.student.nextBooking.status,
												)}
											</div>
										</div>
									) : (
										<div className="rounded-2xl border border-border/70 border-dashed p-8 text-center">
											<p className="font-medium text-lg">
												No booking scheduled
											</p>
											<p className="mt-1 text-muted-foreground text-sm">
												Reserve a lab to get started.
											</p>
											<Button className="mt-4" asChild>
												<Link href="/book">Book a Lab</Link>
											</Button>
										</div>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<TestTubeDiagonal className="h-4 w-4" />
										Equipment Usage Reporting
									</CardTitle>
									<CardDescription>
										Record what you actually used after each session. This keeps
										stock and teacher records accurate.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									{outstandingReports.length > 0 ? (
										outstandingReports.map((session) => (
											<div
												key={session.sessionId}
												className="rounded-[1.6rem] border border-border/70 bg-muted/30 p-5"
											>
												<div className="flex flex-wrap items-start justify-between gap-4">
													<div>
														<p className="font-medium text-lg">
															{session.labName} Lab
														</p>
														<p className="mt-1 text-muted-foreground text-sm">
															{formatDate(new Date(session.startAt))} ·{" "}
															{formatTimeRange(
																new Date(session.startAt),
																new Date(session.endAt),
															)}
														</p>
													</div>
													<Button
														size="sm"
														onClick={() => handleUsageSave(session.sessionId)}
														disabled={reportUsageMutation.isPending}
													>
														Save Usage
													</Button>
												</div>

												<div className="mt-4 grid gap-4 md:grid-cols-2">
													{session.items.map((item) => (
														<div
															key={item.equipmentBookingId}
															className="rounded-2xl border border-border/60 bg-background/80 p-4"
														>
															<div className="flex items-start justify-between gap-3">
																<div>
																	<p className="font-medium">
																		{item.equipmentName}
																	</p>
																	<p className="mt-1 text-muted-foreground text-sm">
																		Booked {item.amount}{" "}
																		{item.unitType === "ML" ? "mL" : "units"}
																	</p>
																</div>
																<Badge variant="outline">Required</Badge>
															</div>
															<div className="mt-4 space-y-2">
																<Label htmlFor={item.equipmentBookingId}>
																	Actual used
																</Label>
																<Input
																	id={item.equipmentBookingId}
																	type="number"
																	min={0}
																	max={item.amount}
																	value={
																		usageDrafts[item.equipmentBookingId] ??
																		item.amount
																	}
																	onChange={(event) =>
																		setUsageDrafts((current) => ({
																			...current,
																			[item.equipmentBookingId]: Math.max(
																				0,
																				Math.min(
																					item.amount,
																					Number(event.target.value || 0),
																				),
																			),
																		}))
																	}
																/>
															</div>
														</div>
													))}
												</div>
											</div>
										))
									) : (
										<div className="rounded-2xl border border-border/70 border-dashed p-8 text-center text-muted-foreground text-sm">
											No outstanding equipment reports. Your past sessions are
											fully reconciled.
										</div>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Calendar className="h-4 w-4" />
										Upcoming Bookings
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									{bookings && bookings.length > 0 ? (
										bookings.map((booking) => (
											<div
												key={booking.id}
												className="rounded-[1.6rem] border border-border/70 bg-muted/30 p-5"
											>
												<div className="flex flex-wrap items-start justify-between gap-4">
													<div>
														<p className="font-medium text-lg">
															{booking.session.lab.name} Lab
														</p>
														<p className="mt-1 text-muted-foreground text-sm">
															{formatDate(new Date(booking.session.startAt))} ·{" "}
															{formatTimeRange(
																new Date(booking.session.startAt),
																new Date(booking.session.endAt),
															)}
														</p>
														<div className="mt-3 flex flex-wrap gap-2">
															<Badge variant="outline">
																Seat {booking.seat.name}
															</Badge>
															{booking.equipmentBookings.map((equipment) => (
																<Badge key={equipment.id} variant="secondary">
																	<Package className="mr-1 h-3 w-3" />
																	{equipment.equipment.name} x{equipment.amount}
																</Badge>
															))}
														</div>
													</div>

													<div className="flex flex-col items-end gap-3">
														{getBookingStatusBadge(booking.status)}
														<AlertDialog>
															<AlertDialogTrigger asChild>
																<Button
																	size="sm"
																	variant="outline"
																	className="border-destructive/40 text-destructive"
																>
																	Cancel
																</Button>
															</AlertDialogTrigger>
															<AlertDialogContent>
																<AlertDialogHeader>
																	<AlertDialogTitle>
																		Cancel booking?
																	</AlertDialogTitle>
																	<AlertDialogDescription>
																		This will release your seat and any reserved
																		equipment for {booking.session.lab.name} Lab
																		on{" "}
																		{formatDate(
																			new Date(booking.session.startAt),
																		)}
																		.
																	</AlertDialogDescription>
																</AlertDialogHeader>
																<AlertDialogFooter>
																	<AlertDialogCancel>
																		Keep booking
																	</AlertDialogCancel>
																	<AlertDialogAction
																		className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																		onClick={() => handleCancel(booking.id)}
																	>
																		Cancel booking
																	</AlertDialogAction>
																</AlertDialogFooter>
															</AlertDialogContent>
														</AlertDialog>
													</div>
												</div>
											</div>
										))
									) : (
										<div className="rounded-2xl border border-border/70 border-dashed p-8 text-center text-muted-foreground text-sm">
											No upcoming bookings yet.
										</div>
									)}
								</CardContent>
							</Card>
						</div>

						<div className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<ClipboardCheck className="h-4 w-4" />
										Attendance Snapshot
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{overview.student?.recentAttendance.length ? (
										overview.student.recentAttendance.map((entry) => (
											<div
												key={`${entry.sessionId}-${entry.startAt}`}
												className="rounded-2xl border border-border/60 bg-muted/30 p-4"
											>
												<div className="flex items-center justify-between gap-3">
													<div>
														<p className="font-medium">{entry.labName} Lab</p>
														<p className="mt-1 text-muted-foreground text-sm">
															{formatDateTime(new Date(entry.startAt))}
														</p>
													</div>
													<Badge
														variant={formatAttendanceTone(
															entry.status === "PRESENT" ||
																entry.status === "EXCUSED"
																? 100
																: 0,
														)}
													>
														{entry.status}
													</Badge>
												</div>
											</div>
										))
									) : (
										<div className="rounded-2xl border border-border/70 border-dashed p-6 text-center text-muted-foreground text-sm">
											Attendance history will appear after your first completed
											session.
										</div>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Quick Actions</CardTitle>
								</CardHeader>
								<CardContent className="grid gap-2">
									<Button asChild>
										<Link href="/book/physics">
											<FlaskConical className="mr-2 h-4 w-4" />
											Book Physics/Chemistry
										</Link>
									</Button>
									<Button variant="outline" asChild>
										<Link href="/book/biology">
											<Package className="mr-2 h-4 w-4" />
											Book Biology
										</Link>
									</Button>
									<Button variant="outline" asChild>
										<Link href="/book">
											<Clock className="mr-2 h-4 w-4" />
											Browse Sessions
										</Link>
									</Button>
								</CardContent>
							</Card>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
