import { db } from "@/server/db";
import {
	getSessionsNeedingReminders,
	getSessionsNeedingUsageReports,
	sendStudentReminderEmail,
	sendTeacherSummaryEmail,
	sendUsageReportRequestEmail,
} from "@/server/services/email";
import { NextResponse } from "next/server";

// This route should be called by a cron job (e.g., Vercel Cron, every 5 minutes)
// For Vercel Cron, add to vercel.json:
// { "crons": [{ "path": "/api/cron/session-reminders", "schedule": "*/5 * * * *" }] }

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds max for this route

export async function GET(request: Request) {
	// Verify cron secret to prevent unauthorized access
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { studentReminders, teacherReminders } =
			await getSessionsNeedingReminders();

		const results = {
			studentEmailsSent: 0,
			teacherEmailsSent: 0,
			errors: [] as string[],
		};

		// Send student reminders (3 hours before)
		for (const session of studentReminders) {
			let sessionHasErrors = false;

			for (const booking of session.seatBookings) {
				try {
					const equipment = booking.equipmentBookings.map((eb) => ({
						name: eb.equipment.name,
						amount: eb.amount,
					}));

					await sendStudentReminderEmail(
						booking.user.email,
						`${booking.user.firstName} ${booking.user.lastName}`,
						{
							labName: session.lab.name,
							seatName: booking.seat.name,
							startAt: session.startAt,
							endAt: session.endAt,
							equipment: equipment.length > 0 ? equipment : undefined,
						},
					);
					results.studentEmailsSent++;
				} catch (error) {
					sessionHasErrors = true;
					results.errors.push(
						`Failed to send student reminder to ${booking.user.email}: ${error}`,
					);
				}
			}

			if (!sessionHasErrors) {
				await db.session.update({
					where: { id: session.id },
					data: { studentReminderSentAt: new Date() },
				});
			}
		}

		// Send teacher summaries (15 minutes before)
		for (const session of teacherReminders) {
			try {
				// Aggregate equipment needs
				const equipmentMap = new Map<string, number>();
				const students = session.seatBookings.map((booking) => {
					const equipment = booking.equipmentBookings.map((eb) => {
						const current = equipmentMap.get(eb.equipment.name) ?? 0;
						equipmentMap.set(eb.equipment.name, current + eb.amount);
						return {
							name: eb.equipment.name,
							amount: eb.amount,
						};
					});

					return {
						name: `${booking.user.firstName} ${booking.user.lastName}`,
						seatName: booking.seat.name,
						notes: booking.notes ?? null,
						equipment: equipment.length > 0 ? equipment : undefined,
					};
				});

				const totalEquipmentNeeds = Array.from(equipmentMap.entries()).map(
					([name, totalAmount]) => ({ name, totalAmount }),
				);

				await sendTeacherSummaryEmail(
					session.createdBy.email,
					`${session.createdBy.firstName} ${session.createdBy.lastName}`,
					{
						sessionId: session.id,
						labName: session.lab.name,
						startAt: session.startAt,
						endAt: session.endAt,
						students,
						totalEquipmentNeeds,
					},
				);
				results.teacherEmailsSent++;
				await db.session.update({
					where: { id: session.id },
					data: { teacherReminderSentAt: new Date() },
				});
			} catch (error) {
				results.errors.push(
					`Failed to send teacher summary to ${session.createdBy.email}: ${error}`,
				);
			}
		}

		// Send usage report requests for recently ended sessions
		const pendingUsageReports = await getSessionsNeedingUsageReports();

		// Group by user + session to send one email per student per session
		const usageGroupKey = (r: (typeof pendingUsageReports)[number]) =>
			`${r.userId}__${r.sessionId}`;
		const usageGroups = new Map<string, (typeof pendingUsageReports)[number][]>();
		for (const row of pendingUsageReports) {
			const key = usageGroupKey(row);
			const group = usageGroups.get(key) ?? [];
			group.push(row);
			usageGroups.set(key, group);
		}

		const usageEmailsSent = { count: 0 };
		for (const group of usageGroups.values()) {
			const first = group[0];
			if (!first) continue;
			// Only send once — use a notification to prevent repeat sends
			const alreadyNotified = await db.notification.findFirst({
				where: {
					userId: first.userId,
					type: "USAGE_REPORT_NEEDED",
					message: { contains: first.sessionId },
				},
			});
			if (alreadyNotified) continue;

			try {
				await sendUsageReportRequestEmail(
					first.user.email,
					`${first.user.firstName} ${first.user.lastName}`,
					{
						labName: first.session.lab.name,
						startAt: first.session.startAt,
						endAt: first.session.endAt,
						equipmentItems: group.map((r) => ({
							name: r.equipment.name,
							amount: r.amount,
						})),
					},
				);

				// Create in-app notification so we know we've sent it
				await db.notification.create({
					data: {
						userId: first.userId,
						type: "USAGE_REPORT_NEEDED",
						title: "Usage Report Required",
						message: `Please report your equipment usage for your session in ${first.session.lab.name}. SessionId: ${first.sessionId}`,
						link: "/dashboard",
					},
				});

				usageEmailsSent.count++;
			} catch (error) {
				results.errors.push(
					`Failed to send usage report request to ${first.user.email}: ${error}`,
				);
			}
		}

		console.log("Cron job completed:", { ...results, usageEmailsSent: usageEmailsSent.count });

		return NextResponse.json({
			success: true,
			...results,
			usageEmailsSent: usageEmailsSent.count,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Cron job failed:", error);
		return NextResponse.json(
			{ error: "Internal server error", details: String(error) },
			{ status: 500 },
		);
	}
}
