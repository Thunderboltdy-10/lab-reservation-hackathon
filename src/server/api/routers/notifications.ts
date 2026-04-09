import { TRPCError } from "@trpc/server";
import z from "zod";
import { createTRPCRouter, privateProcedure, teacherProcedure } from "../trpc";

export const notificationsRouter = createTRPCRouter({
	getUnread: privateProcedure.query(async ({ ctx }) => {
		return await ctx.db.notification.findMany({
			where: {
				userId: ctx.auth.userId,
				read: false,
			},
			orderBy: { createdAt: "desc" },
			take: 20,
		});
	}),

	getAll: privateProcedure
		.input(
			z.object({
				take: z.number().min(1).max(50).optional(),
			}).optional(),
		)
		.query(async ({ ctx, input }) => {
			return await ctx.db.notification.findMany({
				where: { userId: ctx.auth.userId },
				orderBy: { createdAt: "desc" },
				take: input?.take ?? 30,
			});
		}),

	getUnreadCount: privateProcedure.query(async ({ ctx }) => {
		const count = await ctx.db.notification.count({
			where: {
				userId: ctx.auth.userId,
				read: false,
			},
		});
		return { count };
	}),

	markRead: privateProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const notification = await ctx.db.notification.findUnique({
				where: { id: input.id },
				select: { userId: true },
			});

			if (!notification) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found" });
			}

			if (notification.userId !== ctx.auth.userId) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
			}

			return await ctx.db.notification.update({
				where: { id: input.id },
				data: { read: true },
			});
		}),

	markAllRead: privateProcedure.mutation(async ({ ctx }) => {
		await ctx.db.notification.updateMany({
			where: { userId: ctx.auth.userId, read: false },
			data: { read: true },
		});
		return { success: true };
	}),

	// Teacher: send low stock notification to all teachers
	notifyLowStock: teacherProcedure
		.input(
			z.object({
				equipmentId: z.string(),
				equipmentName: z.string(),
				currentStock: z.number(),
				threshold: z.number(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const teachers = await ctx.db.user.findMany({
				where: { role: { in: ["TEACHER", "ADMIN"] } },
				select: { id: true },
			});

			await ctx.db.notification.createMany({
				data: teachers.map((t) => ({
					userId: t.id,
					type: "EQUIPMENT_LOW_STOCK" as const,
					title: "Low Stock Alert",
					message: `${input.equipmentName} is running low: ${input.currentStock} remaining (threshold: ${input.threshold})`,
					link: "/equipment",
				})),
			});

			return { success: true };
		}),
});

// Helper to create a notification (used by other routers)
export const createNotification = async ({
	db,
	userId,
	type,
	title,
	message,
	link,
}: {
	db: Parameters<Parameters<typeof privateProcedure.query>[0]>[0]["ctx"]["db"];
	userId: string;
	type:
		| "SESSION_REMINDER"
		| "BOOKING_CONFIRMED"
		| "BOOKING_APPROVED"
		| "BOOKING_REJECTED"
		| "BOOKING_CANCELLED"
		| "ATTENDANCE_NEEDED"
		| "USAGE_REPORT_NEEDED"
		| "EQUIPMENT_LOW_STOCK"
		| "USAGE_CORRECTED";
	title: string;
	message: string;
	link?: string;
}) => {
	try {
		await db.notification.create({
			data: { userId, type, title, message, link },
		});
	} catch {
		// Notification failure should never block main operations
	}
};
