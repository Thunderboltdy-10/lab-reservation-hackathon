import { db } from "@/server/db";
import {
	sendBookingConfirmationEmail,
	sendBookingStatusEmail,
	sendTeacherBookingRequestEmail,
} from "@/server/services/email";
import type { Role, EquipmentUnit } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import z from "zod";
import {
	adminProcedure,
	createTRPCRouter,
	privateProcedure,
	teacherProcedure,
} from "../trpc";

const APP_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? "Europe/Madrid";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getTotalSeatsFromConfig = (configJson?: string | null) => {
	if (!configJson) return 0;
	try {
		const parsed = JSON.parse(configJson) as {
			rows?: { name: string; seats: number }[];
			edgeSeat?: boolean;
		};
		if (!parsed?.rows || !Array.isArray(parsed.rows)) return 0;
		const base = parsed.rows.reduce((acc, row) => acc + row.seats, 0);
		return base + (parsed.edgeSeat ? 1 : 0);
	} catch {
		return 0;
	}
};

const getDayWindow = (date: Date) => {
	const dayStart = new Date(date);
	const nextDay = new Date(dayStart.getTime() + DAY_IN_MS);

	return { dayStart, nextDay };
};

const getTimezoneDayWindow = (date: Date, timeZone = APP_TIMEZONE) => {
	const zonedDate = toZonedTime(date, timeZone);
	zonedDate.setHours(0, 0, 0, 0);

	const nextZonedDate = new Date(zonedDate);
	nextZonedDate.setDate(nextZonedDate.getDate() + 1);

	return {
		dayStart: fromZonedTime(zonedDate, timeZone),
		nextDay: fromZonedTime(nextZonedDate, timeZone),
	};
};

const assertBookingWindowOpen = (startAt: Date) => {
	const now = new Date();
	const lockTime = new Date(startAt.getTime() - 15 * 60 * 1000);

	if (now > lockTime) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Bookings are locked 15 minutes before the session starts.",
		});
	}
};

const normalizeEquipmentRequests = (
	equipment?:
		| {
				equipmentId: string;
				amount: number;
		  }[]
		| undefined,
) => {
	if (!equipment?.length) {
		return [];
	}

	const grouped = new Map<string, number>();

	for (const item of equipment) {
		const current = grouped.get(item.equipmentId) ?? 0;
		grouped.set(item.equipmentId, current + item.amount);
	}

	return Array.from(grouped.entries()).map(([equipmentId, amount]) => ({
		equipmentId,
		amount,
	}));
};

const buildManagedSessionWhere = (role: Role, userId: string) =>
	role === "ADMIN" ? {} : { createdById: userId };

const ensureManagedSessionAccess = async ({
	database,
	sessionId,
	userId,
	role,
}: {
	database: typeof db;
	sessionId: string;
	userId: string;
	role: Role;
}) => {
	const session = await database.session.findFirst({
		where: {
			id: sessionId,
			...buildManagedSessionWhere(role, userId),
		},
		select: {
			id: true,
			labId: true,
			startAt: true,
			endAt: true,
			createdById: true,
			lab: { select: { name: true } },
		},
	});

	if (!session) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You can only manage sessions assigned to you.",
		});
	}

	return session;
};

export const authoriseAccountAccess = async (
	accountId: string,
	userId: string,
) => {
	const account = await db.user.findFirst({
		where: {
			id: accountId,
		},
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			role: true,
		},
	});

	if (!account) throw new Error("Account not found");
	return account;
};

export const accountRouter = createTRPCRouter({
	// ========== User Account Endpoints ==========
	getAccount: privateProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.user.findUnique({
			where: {
				id: ctx.auth.userId,
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				role: true,
				isBanned: true,
			},
		});

		if (!user)
			throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
		return user;
	}),

	// Admin only - get all accounts
	getAccounts: adminProcedure.query(async ({ ctx }) => {
		return await ctx.db.user.findMany({
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				role: true,
				isBanned: true,
				bannedAt: true,
				banReason: true,
			},
			orderBy: {
				role: "asc",
			},
		});
	}),

	// Admin only - update account roles
	updateAccounts: adminProcedure
		.input(
			z.object({
				accounts: z.array(
					z.object({
						id: z.string(),
						role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			for (const account of input.accounts) {
				await ctx.db.user.update({
					where: {
						id: account.id,
					},
					data: {
						role: account.role,
					},
				});
			}
		}),

	// Admin only - update account details (name + role)
	updateAccountDetails: adminProcedure
		.input(
			z.object({
				id: z.string(),
				firstName: z.string().min(1),
				lastName: z.string().min(1),
				role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return await ctx.db.user.update({
				where: { id: input.id },
				data: {
					firstName: input.firstName,
					lastName: input.lastName,
					role: input.role,
				},
			});
		}),

	// Admin only - delete account
	deleteAccount: adminProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Delete related records first
			await ctx.db.equipmentBooking.deleteMany({ where: { userId: input.id } });
			await ctx.db.seatBooking.deleteMany({ where: { userId: input.id } });
			await ctx.db.attendance.deleteMany({ where: { userId: input.id } });
			await ctx.db.session.deleteMany({ where: { createdById: input.id } });

			return await ctx.db.user.delete({ where: { id: input.id } });
		}),

	// ========== Lab Endpoints ==========
	getLabId: privateProcedure
		.input(
			z.object({
				lab: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const lab = await ctx.db.lab.findFirst({
				where: {
					name: {
						contains: input.lab,
						mode: "insensitive",
					},
				},
				select: {
					id: true,
					name: true,
					defaultRowConfig: true,
				},
			});

			if (!lab)
				throw new TRPCError({ code: "NOT_FOUND", message: "Lab not found" });
			return lab;
		}),

	// ========== Session Endpoints ==========
	getSession: privateProcedure
		.input(
			z.object({
				labId: z.string(),
				date: z.date().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			if (!input.date) return [];

			const { dayStart, nextDay } = getDayWindow(input.date);

			const sessions = await ctx.db.session.findMany({
				where: {
					labId: input.labId,
					startAt: {
						gte: dayStart,
						lt: nextDay,
					},
				},
				select: {
					id: true,
					startAt: true,
					endAt: true,
					capacity: true,
					createdBy: true,
				},
				orderBy: {
					startAt: "asc",
				},
			});

			if (sessions.length === 0) return [];
			return sessions;
		}),

	getSessionAll: privateProcedure
		.input(
			z.object({
				date: z.date().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			if (!input.date) return [];

			const { dayStart, nextDay } = getDayWindow(input.date);

			const sessions = await ctx.db.session.findMany({
				where: {
					startAt: {
						gte: dayStart,
						lt: nextDay,
					},
				},
				select: {
					id: true,
					startAt: true,
					endAt: true,
					capacity: true,
					createdBy: true,
					lab: {
						select: {
							id: true,
							name: true,
							defaultRowConfig: true,
						},
					},
				},
				orderBy: {
					startAt: "asc",
				},
			});
			if (sessions.length === 0) return [];
			return sessions;
		}),

	getSessionById: privateProcedure
		.input(z.object({ sessionId: z.string() }))
		.query(async ({ ctx, input }) => {
			const session = await ctx.db.session.findUnique({
				where: { id: input.sessionId },
				select: {
					id: true,
					startAt: true,
					endAt: true,
					lab: { select: { name: true } },
				},
			});
			return session;
		}),

	// Teacher/Admin - create session
	createSession: teacherProcedure
		.input(
			z.object({
				labId: z.string(),
				startAt: z.date(),
				endAt: z.date(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.endAt <= input.startAt) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "End time must be after the start time",
				});
			}

			if (input.endAt.getTime() - input.startAt.getTime() < 5 * 60 * 1000) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Session must be at least 5 minutes long",
				});
			}

			const overlap = await ctx.db.session.findFirst({
				where: {
					labId: input.labId,
					AND: [
						{ startAt: { lt: input.endAt } },
						{ endAt: { gt: input.startAt } },
					],
				},
				select: { id: true },
			});

			if (overlap) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Session overlaps with an existing session",
				});
			}

			const lab = await ctx.db.lab.findUnique({
				where: { id: input.labId },
				select: { defaultRowConfig: true },
			});
			const totalSeats = getTotalSeatsFromConfig(lab?.defaultRowConfig);
			if (totalSeats <= 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Lab seating configuration is invalid",
				});
			}

			return await ctx.db.session.create({
				data: {
					labId: input.labId,
					startAt: input.startAt,
					endAt: input.endAt,
					capacity: totalSeats,
					createdById: ctx.auth.userId,
				},
			});
		}),

	// Teacher/Admin - update session
	updateSession: teacherProcedure
		.input(
			z.object({
				labId: z.string(),
				id: z.string(),
				startAt: z.date(),
				endAt: z.date(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ensureManagedSessionAccess({
				database: ctx.db,
				sessionId: input.id,
				userId: ctx.auth.userId,
				role: ctx.userRole,
			});

			if (input.endAt <= input.startAt) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "End time must be after the start time",
				});
			}

			if (input.endAt.getTime() - input.startAt.getTime() < 5 * 60 * 1000) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Session must be at least 5 minutes long",
				});
			}

			const overlap = await ctx.db.session.findFirst({
				where: {
					labId: input.labId,
					AND: [
						{ startAt: { lt: input.endAt } },
						{ endAt: { gt: input.startAt } },
						{ NOT: { id: input.id } },
					],
				},
				select: { id: true },
			});

			if (overlap) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Session overlaps with an existing session",
				});
			}

			return await ctx.db.session.update({
				where: {
					id: input.id,
				},
				data: {
					startAt: input.startAt,
					endAt: input.endAt,
				},
			});
		}),

	// Teacher/Admin - remove session
	removeSession: teacherProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const session = await ensureManagedSessionAccess({
				database: ctx.db,
				sessionId: input.id,
				userId: ctx.auth.userId,
				role: ctx.userRole,
			});

			const sessionStats = await ctx.db.session.findUnique({
				where: { id: input.id },
				select: {
					endAt: true,
					_count: {
						select: {
							seatBookings: true,
							equipmentBookings: true,
							attendances: true,
						},
					},
				},
			});

			if (
				sessionStats &&
				sessionStats.endAt < new Date() &&
				(sessionStats._count.seatBookings > 0 ||
					sessionStats._count.equipmentBookings > 0 ||
					sessionStats._count.attendances > 0)
			) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Completed sessions with bookings or attendance cannot be deleted because they are part of the lab record.",
				});
			}

			// Delete related attendance records
			await ctx.db.attendance.deleteMany({
				where: { sessionId: input.id },
			});

			// Delete equipment bookings for this session
			await ctx.db.equipmentBooking.deleteMany({
				where: { sessionId: input.id },
			});

			// Delete session equipment
			await ctx.db.sessionEquipment.deleteMany({
				where: { sessionId: input.id },
			});

			// Delete seat bookings
			await ctx.db.seatBooking.deleteMany({
				where: { sessionId: input.id },
			});

			return await ctx.db.session.delete({
				where: { id: input.id },
			});
		}),

	// ========== Seat Endpoints ==========
	getSeatIds: privateProcedure
		.input(
			z.object({
				labId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return await ctx.db.seat.findMany({
				where: {
					labId: input.labId,
					isActive: true,
				},
				select: {
					id: true,
					name: true,
					row: true,
					col: true,
				},
				orderBy: [{ row: "asc" }, { col: "asc" }],
			});
		}),

	getOccupiedSeats: privateProcedure
		.input(
			z.object({
				labId: z.string(),
				sessionId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const seats = await ctx.db.seat.findMany({
				where: {
					labId: input.labId,
				},
			});

			if (seats.length === 0) return [];

			return await ctx.db.seatBooking.findMany({
				where: {
					seatId: {
						in: seats.map((seat) => seat.id),
					},
					sessionId: input.sessionId,
				},
				select: {
					id: true,
					seatId: true,
					sessionId: true,
					userId: true,
					name: true,
					status: true,
					notes: true,
					equipmentBookings: {
						select: {
							equipmentId: true,
							amount: true,
						},
					},
					user: {
						select: {
							firstName: true,
							lastName: true,
							isBanned: true,
						},
					},
				},
			});
		}),

	// Book a seat (students)
	bookSeat: privateProcedure
		.input(
			z.object({
				name: z.string(),
				sessionId: z.string(),
				labId: z.string(),
				notes: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const seatPositionMatch = input.name.match(/^([A-Za-z]+)(\d+)$/);
			const rowName = seatPositionMatch?.[1]?.toUpperCase();
			const colNumber = seatPositionMatch ? Number(seatPositionMatch[2]) : null;

			// Validate against lab config
			const lab = await ctx.db.lab.findUnique({
				where: { id: input.labId },
				select: { defaultRowConfig: true },
			});

			if (lab?.defaultRowConfig) {
				try {
					const config = JSON.parse(lab.defaultRowConfig) as {
						rows: { name: string; seats: number }[];
						edgeSeat: boolean;
					};
					let isValid = false;

					if (input.name === "Edge") {
						isValid = !!config.edgeSeat;
					} else if (rowName && colNumber) {
						const rowConfig = config.rows?.find(
							(r) => r.name.toUpperCase() === rowName,
						);
						if (rowConfig && colNumber <= rowConfig.seats) {
							isValid = true;
						}
					}

					if (!isValid) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Seat ${input.name} is not valid for this lab configuration.`,
						});
					}
				} catch (e) {
					if (e instanceof TRPCError) throw e;
					console.error("Failed to parse lab config for validation:", e);
				}
			}

			const booking = await ctx.db.$transaction(async (tx) => {
				// Check for 15-minute lockout and Lab ID validity
				const sessionCheck = await tx.session.findUnique({
					where: { id: input.sessionId },
					select: { startAt: true, labId: true },
				});

				if (!sessionCheck) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Session not found",
					});
				}

				if (sessionCheck.labId !== input.labId) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Session does not belong to the specified lab",
					});
				}

				assertBookingWindowOpen(sessionCheck.startAt);

				let seat = await tx.seat.findFirst({
					where: {
						labId: input.labId,
						name: input.name,
					},
					select: { id: true },
				});

				if (!seat) {
					seat = await tx.seat.create({
						data: {
							labId: input.labId,
							name: input.name,
							row: rowName ? rowName.charCodeAt(0) - 64 : undefined,
							col: colNumber ?? undefined,
						},
						select: { id: true },
					});
				}

				const existingBooking = await tx.seatBooking.findFirst({
					where: {
						sessionId: input.sessionId,
						userId: ctx.auth.userId,
					},
					select: { id: true },
				});

				if (existingBooking) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "You already have a booking for this session",
					});
				}

				const seatTaken = await tx.seatBooking.findFirst({
					where: {
						sessionId: input.sessionId,
						seatId: seat.id,
					},
					select: { id: true },
				});

				if (seatTaken) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Seat already booked for this session",
					});
				}

				const user = await tx.user.findUnique({
					where: { id: ctx.auth.userId },
					select: { isBanned: true },
				});

				const bookingStatus = user?.isBanned ? "PENDING_APPROVAL" : "CONFIRMED";

				const capacityUpdate = await tx.session.updateMany({
					where: {
						id: input.sessionId,
						capacity: { gt: 0 },
					},
					data: {
						capacity: { decrement: 1 },
					},
				});

				if (capacityUpdate.count === 0) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Session is full",
					});
				}

				return await tx.seatBooking.create({
					data: {
						sessionId: input.sessionId,
						seatId: seat.id,
						userId: ctx.auth.userId,
						name: input.name,
						status: bookingStatus,
						notes: input.notes,
					},
				});
			});

			try {
				const bookingDetails = await ctx.db.seatBooking.findUnique({
					where: { id: booking.id },
					include: {
						user: { select: { email: true, firstName: true, lastName: true } },
						seat: { select: { name: true } },
						session: {
							include: {
								lab: { select: { name: true } },
								createdBy: {
									select: { email: true, firstName: true, lastName: true },
								},
							},
						},
						equipmentBookings: {
							include: { equipment: { select: { name: true } } },
						},
					},
				});

				if (!bookingDetails) {
					return booking;
				}

				await sendBookingConfirmationEmail(
					bookingDetails.user.email,
					`${bookingDetails.user.firstName} ${bookingDetails.user.lastName}`,
					{
						labName: bookingDetails.session.lab.name,
						seatName: bookingDetails.seat.name,
						startAt: bookingDetails.session.startAt,
						endAt: bookingDetails.session.endAt,
						status: bookingDetails.status,
						equipment: bookingDetails.equipmentBookings.map((eb) => ({
							name: eb.equipment.name,
							amount: eb.amount,
						})),
					},
				);

				if (bookingDetails.status === "PENDING_APPROVAL") {
					await sendTeacherBookingRequestEmail(
						bookingDetails.session.createdBy.email,
						`${bookingDetails.session.createdBy.firstName} ${bookingDetails.session.createdBy.lastName}`,
						{
							studentName: `${bookingDetails.user.firstName} ${bookingDetails.user.lastName}`,
							labName: bookingDetails.session.lab.name,
							seatName: bookingDetails.seat.name,
							startAt: bookingDetails.session.startAt,
							endAt: bookingDetails.session.endAt,
						},
					);
				}
			} catch (error) {
				console.error("Failed to send booking email:", error);
			}

			return booking;
		}),

	// Unbook a seat
	unbookSeat: privateProcedure
		.input(
			z.object({
				name: z.string(),
				sessionId: z.string(),
				labId: z.string(),
				isTeacher: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const seatId = await ctx.db.seat.findFirst({
				where: {
					labId: input.labId,
					name: input.name,
				},
				select: {
					id: true,
				},
			});

			if (!seatId)
				throw new TRPCError({ code: "NOT_FOUND", message: "Seat not found" });

			const session = await ctx.db.session.findUnique({
				where: { id: input.sessionId },
				select: { startAt: true },
			});

			if (!session)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Session not found",
				});

			// Check for 15-minute lockout if student
			if (!input.isTeacher) {
				const user = await ctx.db.user.findUnique({
					where: { id: ctx.auth.userId },
					select: { role: true },
				});
				const isAdmin = user?.role === "ADMIN";
				const isTeacher = user?.role === "TEACHER";

				if (!isAdmin && !isTeacher) {
					assertBookingWindowOpen(session.startAt);
				}
			}

			if (input.isTeacher) {
				const user = await ctx.db.user.findUnique({
					where: { id: ctx.auth.userId },
					select: { role: true },
				});

				if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Only teachers can remove other students' bookings",
					});
				}

				await ensureManagedSessionAccess({
					database: ctx.db,
					sessionId: input.sessionId,
					userId: ctx.auth.userId,
					role: user.role,
				});
			}

			const removedBookings = await ctx.db.$transaction(async (tx) => {
				const bookings = await tx.seatBooking.findMany({
					where: {
						sessionId: input.sessionId,
						seatId: seatId.id,
						name: input.name,
						...(input.isTeacher ? {} : { userId: ctx.auth.userId }),
					},
					include: {
						equipmentBookings: true,
						user: { select: { email: true, firstName: true, lastName: true } },
						session: { include: { lab: { select: { name: true } } } },
					},
				});

				if (bookings.length === 0) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Booking not found",
					});
				}

				for (const booking of bookings) {
					for (const eq of booking.equipmentBookings) {
						await tx.sessionEquipment.update({
							where: {
								sessionId_equipmentId: {
									sessionId: booking.sessionId,
									equipmentId: eq.equipmentId,
								},
							},
							data: { reserved: { decrement: eq.amount } },
						});
					}

					await tx.equipmentBooking.deleteMany({
						where: { seatBookingId: booking.id },
					});
				}

				await tx.seatBooking.deleteMany({
					where: {
						sessionId: input.sessionId,
						seatId: seatId.id,
						name: input.name,
						...(input.isTeacher ? {} : { userId: ctx.auth.userId }),
					},
				});

				await tx.session.updateMany({
					where: { id: input.sessionId },
					data: { capacity: { increment: bookings.length } },
				});

				return bookings;
			});

			try {
				for (const booking of removedBookings) {
					await sendBookingStatusEmail(
						booking.user.email,
						`${booking.user.firstName} ${booking.user.lastName}`,
						{
							labName: booking.session.lab.name,
							seatName: booking.name,
							startAt: booking.session.startAt,
							endAt: booking.session.endAt,
						},
						"CANCELLED",
					);
				}
			} catch (error) {
				console.error("Failed to send cancellation email:", error);
			}

			return { success: true };
		}),

	switchSeat: privateProcedure
		.input(
			z.object({
				sessionId: z.string(),
				labId: z.string(),
				newSeatName: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const session = await ctx.db.session.findUnique({
				where: { id: input.sessionId },
				select: { startAt: true, labId: true },
			});

			if (!session)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Session not found",
				});

			if (session.labId !== input.labId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Session does not belong to the specified lab",
				});
			}

			const user = await ctx.db.user.findUnique({
				where: { id: ctx.auth.userId },
				select: { role: true },
			});
			const isAdmin = user?.role === "ADMIN";
			const isTeacher = user?.role === "TEACHER";

			if (!isAdmin && !isTeacher) {
				assertBookingWindowOpen(session.startAt);
			}

			const seatPositionMatch = input.newSeatName.match(/^([A-Za-z]+)(\d+)$/);
			const rowName = seatPositionMatch?.[1]?.toUpperCase();
			const colNumber = seatPositionMatch ? Number(seatPositionMatch[2]) : null;

			// Validate against lab config
			const lab = await ctx.db.lab.findUnique({
				where: { id: input.labId },
				select: { defaultRowConfig: true },
			});

			if (lab?.defaultRowConfig) {
				try {
					const config = JSON.parse(lab.defaultRowConfig) as {
						rows: { name: string; seats: number }[];
						edgeSeat: boolean;
					};
					let isValid = false;

					if (input.newSeatName === "Edge") {
						isValid = !!config.edgeSeat;
					} else if (rowName && colNumber) {
						const rowConfig = config.rows?.find(
							(r) => r.name.toUpperCase() === rowName,
						);
						if (rowConfig && colNumber <= rowConfig.seats) {
							isValid = true;
						}
					}

					if (!isValid) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Seat ${input.newSeatName} is not valid for this lab configuration.`,
						});
					}
				} catch (e) {
					if (e instanceof TRPCError) throw e;
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid lab defaultRowConfig JSON; cannot validate seat",
					});
				}
			}

			return await ctx.db.$transaction(async (tx) => {
				const booking = await tx.seatBooking.findFirst({
					where: {
						sessionId: input.sessionId,
						userId: ctx.auth.userId,
					},
					select: { id: true, seatId: true, name: true },
				});

				if (!booking) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Booking not found",
					});
				}

				if (booking.name === input.newSeatName) {
					return booking;
				}

				let seat = await tx.seat.findFirst({
					where: {
						labId: input.labId,
						name: input.newSeatName,
					},
					select: { id: true },
				});

				if (!seat) {
					seat = await tx.seat.create({
						data: {
							labId: input.labId,
							name: input.newSeatName,
							row: rowName ? rowName.charCodeAt(0) - 64 : undefined,
							col: colNumber ?? undefined,
						},
						select: { id: true },
					});
				}

				const seatTaken = await tx.seatBooking.findFirst({
					where: {
						sessionId: input.sessionId,
						seatId: seat.id,
					},
					select: { id: true },
				});

				if (seatTaken) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Seat already booked for this session",
					});
				}

				return await tx.seatBooking.update({
					where: { id: booking.id },
					data: {
						seatId: seat.id,
						name: input.newSeatName,
					},
				});
			});
		}),

	// Book seat with equipment (combined booking)
	bookSeatWithEquipment: privateProcedure
		.input(
			z.object({
				name: z.string(),
				sessionId: z.string(),
				labId: z.string(),
				equipment: z
					.array(
						z.object({
							equipmentId: z.string(),
							amount: z.number().min(1),
						}),
					)
					.optional(),
				notes: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const seatPositionMatch = input.name.match(/^([A-Za-z]+)(\d+)$/);
			const rowName = seatPositionMatch?.[1]?.toUpperCase();
			const colNumber = seatPositionMatch ? Number(seatPositionMatch[2]) : null;

			// Validate against lab config
			const lab = await ctx.db.lab.findUnique({
				where: { id: input.labId },
				select: { defaultRowConfig: true },
			});

			if (lab?.defaultRowConfig) {
				try {
					const config = JSON.parse(lab.defaultRowConfig) as {
						rows: { name: string; seats: number }[];
						edgeSeat: boolean;
					};
					let isValid = false;

					if (input.name === "Edge") {
						isValid = !!config.edgeSeat;
					} else if (rowName && colNumber) {
						const rowConfig = config.rows?.find(
							(r) => r.name.toUpperCase() === rowName,
						);
						if (rowConfig && colNumber <= rowConfig.seats) {
							isValid = true;
						}
					}

					if (!isValid) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Seat ${input.name} is not valid for this lab configuration.`,
						});
					}
				} catch (e) {
					if (e instanceof TRPCError) throw e;
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid lab defaultRowConfig JSON; cannot validate seat",
					});
				}
			}

			const requestedEquipment = normalizeEquipmentRequests(input.equipment);

			const booking = await ctx.db.$transaction(async (tx) => {
				// Check for 15-minute lockout
				const sessionCheck = await tx.session.findUnique({
					where: { id: input.sessionId },
					select: { startAt: true, labId: true },
				});

				if (!sessionCheck) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Session not found",
					});
				}

				if (sessionCheck.labId !== input.labId) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Session does not belong to the specified lab",
					});
				}

				assertBookingWindowOpen(sessionCheck.startAt);

				let seat = await tx.seat.findFirst({
					where: {
						labId: input.labId,
						name: input.name,
					},
					select: { id: true },
				});

				if (!seat) {
					seat = await tx.seat.create({
						data: {
							labId: input.labId,
							name: input.name,
							row: rowName ? rowName.charCodeAt(0) - 64 : undefined,
							col: colNumber ?? undefined,
						},
						select: { id: true },
					});
				}

				const existingBooking = await tx.seatBooking.findFirst({
					where: {
						sessionId: input.sessionId,
						userId: ctx.auth.userId,
					},
					select: { id: true },
				});

				if (existingBooking) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "You already have a booking for this session",
					});
				}

				const seatTaken = await tx.seatBooking.findFirst({
					where: {
						sessionId: input.sessionId,
						seatId: seat.id,
					},
					select: { id: true },
				});

				if (seatTaken) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Seat already booked for this session",
					});
				}

				const user = await tx.user.findUnique({
					where: { id: ctx.auth.userId },
					select: { isBanned: true },
				});

				const bookingStatus = user?.isBanned ? "PENDING_APPROVAL" : "CONFIRMED";

				if (requestedEquipment.length > 0) {
					for (const eq of requestedEquipment) {
						const sessionEquipment = await tx.sessionEquipment.findUnique({
							where: {
								sessionId_equipmentId: {
									sessionId: input.sessionId,
									equipmentId: eq.equipmentId,
								},
							},
						});

						if (
							!sessionEquipment ||
							sessionEquipment.available - sessionEquipment.reserved < eq.amount
						) {
							throw new TRPCError({
								code: "BAD_REQUEST",
								message: "Not enough equipment available",
							});
						}
					}
				}

				const capacityUpdate = await tx.session.updateMany({
					where: { id: input.sessionId, capacity: { gt: 0 } },
					data: { capacity: { decrement: 1 } },
				});

				if (capacityUpdate.count === 0) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Session is full",
					});
				}

				const seatBooking = await tx.seatBooking.create({
					data: {
						sessionId: input.sessionId,
						seatId: seat.id,
						userId: ctx.auth.userId,
						name: input.name,
						status: bookingStatus,
						notes: input.notes,
					},
				});

				if (requestedEquipment.length > 0) {
					for (const eq of requestedEquipment) {
						await tx.equipmentBooking.create({
							data: {
								userId: ctx.auth.userId,
								sessionId: input.sessionId,
								equipmentId: eq.equipmentId,
								seatBookingId: seatBooking.id,
								amount: eq.amount,
							},
						});

						await tx.sessionEquipment.update({
							where: {
								sessionId_equipmentId: {
									sessionId: input.sessionId,
									equipmentId: eq.equipmentId,
								},
							},
							data: {
								reserved: { increment: eq.amount },
							},
						});
					}
				}

				return seatBooking;
			});

			try {
				const bookingDetails = await ctx.db.seatBooking.findUnique({
					where: { id: booking.id },
					include: {
						user: { select: { email: true, firstName: true, lastName: true } },
						seat: { select: { name: true } },
						session: {
							include: {
								lab: { select: { name: true } },
								createdBy: {
									select: { email: true, firstName: true, lastName: true },
								},
							},
						},
						equipmentBookings: {
							include: { equipment: { select: { name: true } } },
						},
					},
				});

				if (!bookingDetails) {
					return booking;
				}

				await sendBookingConfirmationEmail(
					bookingDetails.user.email,
					`${bookingDetails.user.firstName} ${bookingDetails.user.lastName}`,
					{
						labName: bookingDetails.session.lab.name,
						seatName: bookingDetails.seat.name,
						startAt: bookingDetails.session.startAt,
						endAt: bookingDetails.session.endAt,
						status: bookingDetails.status,
						equipment: bookingDetails.equipmentBookings.map((eb) => ({
							name: eb.equipment.name,
							amount: eb.amount,
						})),
					},
				);

				if (bookingDetails.status === "PENDING_APPROVAL") {
					await sendTeacherBookingRequestEmail(
						bookingDetails.session.createdBy.email,
						`${bookingDetails.session.createdBy.firstName} ${bookingDetails.session.createdBy.lastName}`,
						{
							studentName: `${bookingDetails.user.firstName} ${bookingDetails.user.lastName}`,
							labName: bookingDetails.session.lab.name,
							seatName: bookingDetails.seat.name,
							startAt: bookingDetails.session.startAt,
							endAt: bookingDetails.session.endAt,
						},
					);
				}
			} catch (error) {
				console.error("Failed to send booking email:", error);
			}

			return booking;
		}),

	// Update lab configuration (rows, seats)
	updateLabConfig: teacherProcedure
		.input(
			z.object({
				labId: z.string(),
				config: z.string(), // JSON string
			}),
		)
		.mutation(async ({ ctx, input }) => {
			let parsed: {
				rows?: { name: string; seats: number }[];
				edgeSeat?: boolean;
			};
			try {
				parsed = JSON.parse(input.config);
			} catch (e) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid configuration format (JSON parse failed)",
				});
			}

			// Check for conflicts with existing future bookings
			if (parsed?.rows && Array.isArray(parsed.rows)) {
				const validSeatNames = new Set<string>();
				for (const row of parsed.rows) {
					for (let i = 1; i <= row.seats; i++) {
						validSeatNames.add(`${row.name}${i}`);
					}
				}
				if (parsed.edgeSeat) validSeatNames.add("Edge");

				const futureBookings = await ctx.db.seatBooking.findMany({
					where: {
						session: {
							labId: input.labId,
							startAt: { gte: new Date() },
						},
					},
					select: {
						seat: {
							select: { name: true },
						},
						user: {
							select: { firstName: true, lastName: true },
						},
					},
				});

				const invalidBookings = futureBookings.filter(
					(b) => !validSeatNames.has(b.seat.name),
				);

				if (invalidBookings.length > 0) {
					const conflict = invalidBookings[0];
					throw new TRPCError({
						code: "FORBIDDEN",
						message: `Cannot reduce seats: ${conflict?.user.firstName} ${conflict?.user.lastName} has booked seat ${conflict?.seat.name} in a future session.`,
					});
				}
			}

			const updatedLab = await ctx.db.lab.update({
				where: { id: input.labId },
				data: { defaultRowConfig: input.config },
			});

			try {
				if (!parsed?.rows || !Array.isArray(parsed.rows)) return updatedLab;

				const desiredSeats: {
					name: string;
					row: number | null;
					col: number | null;
				}[] = parsed.rows.flatMap((row, index) => {
					return Array.from({ length: row.seats }).map((_, i) => ({
						name: `${row.name}${i + 1}`,
						row: row.name.toUpperCase().charCodeAt(0) - 64 || index + 1,
						col: i + 1,
					}));
				});

				if (parsed.edgeSeat) {
					desiredSeats.push({ name: "Edge", row: null, col: null });
				}

				const existing = await ctx.db.seat.findMany({
					where: { labId: input.labId },
					select: { name: true },
				});
				const existingNames = new Set(existing.map((s) => s.name));
				const toCreate = desiredSeats.filter(
					(seat) => !existingNames.has(seat.name),
				);

				if (toCreate.length > 0) {
					await ctx.db.seat.createMany({
						data: toCreate.map((seat) => ({
							labId: input.labId,
							name: seat.name,
							row: seat.row ?? undefined,
							col: seat.col ?? undefined,
						})),
						skipDuplicates: true,
					});
				}

				const totalSeats = getTotalSeatsFromConfig(input.config);
				if (totalSeats > 0) {
					const futureSessions = await ctx.db.session.findMany({
						where: {
							labId: input.labId,
							startAt: { gte: new Date() },
						},
						select: {
							id: true,
							_count: { select: { seatBookings: true } },
						},
					});

					for (const session of futureSessions) {
						const remaining = Math.max(
							totalSeats - session._count.seatBookings,
							0,
						);
						await ctx.db.session.update({
							where: { id: session.id },
							data: { capacity: remaining },
						});
					}
				}
			} catch {
				// ignore config parse errors; lab config already updated
			}

			return updatedLab;
		}),

	// ========== Student Booking Management ==========
	getDashboardOverview: privateProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.user.findUnique({
			where: { id: ctx.auth.userId },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
				role: true,
				isBanned: true,
				banReason: true,
			},
		});

		if (!user) {
			throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
		}

		const now = new Date();
		const { dayStart: todayStart, nextDay: todayEnd } =
			getTimezoneDayWindow(now);
		const expiringSoon = new Date(now);
		expiringSoon.setDate(expiringSoon.getDate() + 30);

		const nextBooking = await ctx.db.seatBooking.findFirst({
			where: {
				userId: user.id,
				session: {
					startAt: { gte: now },
				},
			},
			include: {
				session: {
					include: {
						lab: { select: { name: true } },
					},
				},
				seat: { select: { name: true } },
			},
			orderBy: {
				session: { startAt: "asc" },
			},
		});

		const attendanceRecords = await ctx.db.attendance.findMany({
			where: { userId: user.id },
			select: {
				status: true,
				session: {
					select: {
						id: true,
						startAt: true,
						lab: { select: { name: true } },
					},
				},
			},
			orderBy: {
				markedAt: "desc",
			},
			take: 6,
		});

		const pendingUsageRows = await ctx.db.equipmentBooking.findMany({
			where: {
				userId: user.id,
				session: {
					endAt: { lt: now },
				},
			},
			select: {
				id: true,
				amount: true,
				actualUsed: true,
				reportedAt: true,
				equipment: {
					select: {
						name: true,
						unitType: true,
					},
				},
				session: {
					select: {
						id: true,
						startAt: true,
						endAt: true,
						lab: { select: { name: true } },
					},
				},
			},
			orderBy: [
				{
					session: { endAt: "desc" },
				},
				{
					equipment: { name: "asc" },
				},
			],
		});

		const pendingUsageReports = Array.from(
			pendingUsageRows
				.reduce<
					Map<
						string,
						{
							sessionId: string;
							labName: string;
							startAt: Date;
							endAt: Date;
							allReported: boolean;
							items: {
								equipmentBookingId: string;
								equipmentName: string;
								unitType: EquipmentUnit;
								amount: number;
								actualUsed: number | null;
								reportedAt: Date | null;
							}[];
						}
					>
				>((map, booking) => {
					const existing = map.get(booking.session.id) ?? {
						sessionId: booking.session.id,
						labName: booking.session.lab.name,
						startAt: booking.session.startAt,
						endAt: booking.session.endAt,
						allReported: true,
						items: [],
					};

					if (booking.actualUsed === null) {
						existing.allReported = false;
					}

					existing.items.push({
						equipmentBookingId: booking.id,
						equipmentName: booking.equipment.name,
						unitType: booking.equipment.unitType,
						amount: booking.amount,
						actualUsed: booking.actualUsed,
						reportedAt: booking.reportedAt,
					});

					map.set(booking.session.id, existing);
					return map;
				}, new Map())
				.values(),
		).filter((session) => !session.allReported);

		if (user.role === "STUDENT") {
			const attendanceTotal = await ctx.db.attendance.count({
				where: { userId: user.id },
			});
			const attendanceSuccessful = await ctx.db.attendance.count({
				where: {
					userId: user.id,
					status: { in: ["PRESENT", "EXCUSED"] },
				},
			});

			const upcomingBookingsCount = await ctx.db.seatBooking.count({
				where: {
					userId: user.id,
					session: {
						startAt: { gte: now },
					},
				},
			});

			const pendingApprovalCount = await ctx.db.seatBooking.count({
				where: {
					userId: user.id,
					status: "PENDING_APPROVAL",
					session: {
						startAt: { gte: now },
					},
				},
			});

			return {
				user,
				student: {
					metrics: {
						upcomingBookingsCount,
						pendingApprovalCount,
						pendingUsageReportsCount: pendingUsageReports.length,
						attendanceRate:
							attendanceTotal > 0
								? Number(
										(
											(attendanceSuccessful / attendanceTotal) * 100 || 0
										).toFixed(1),
									)
								: 0,
					},
					nextBooking:
						nextBooking && nextBooking.session.startAt >= now
							? {
									id: nextBooking.id,
									seatName: nextBooking.seat.name,
									labName: nextBooking.session.lab.name,
									startAt: nextBooking.session.startAt,
									endAt: nextBooking.session.endAt,
									status: nextBooking.status,
								}
							: null,
					pendingUsageReports,
					recentAttendance: attendanceRecords.map((record) => ({
						sessionId: record.session.id,
						labName: record.session.lab.name,
						startAt: record.session.startAt,
						status: record.status,
					})),
				},
			};
		}

		const managedSessionWhere = buildManagedSessionWhere(user.role, user.id);
		const usageBacklogSessions = await ctx.db.session.findMany({
			where: {
				endAt: { lt: now },
				equipmentBookings: {
					some: {
						actualUsed: null,
					},
				},
				...managedSessionWhere,
			},
			select: {
				id: true,
				startAt: true,
				endAt: true,
				lab: { select: { name: true } },
				equipmentBookings: {
					where: {
						actualUsed: null,
					},
					select: {
						id: true,
						userId: true,
					},
				},
			},
			orderBy: {
				endAt: "desc",
			},
			take: 5,
		});

		const pendingApprovalCount = await ctx.db.seatBooking.count({
			where: {
				status: "PENDING_APPROVAL",
				session: managedSessionWhere,
			},
		});

		const attendanceBacklogSessions = await ctx.db.session.findMany({
			where: {
				endAt: { lt: now },
				...managedSessionWhere,
			},
			select: {
				id: true,
				seatBookings: {
					where: { status: "CONFIRMED" },
					select: { userId: true },
				},
				attendances: {
					select: { userId: true },
				},
			},
			orderBy: {
				endAt: "desc",
			},
			take: 50,
		});

		const attendanceBacklogCount = attendanceBacklogSessions.filter(
			(session) => {
				const booked = new Set(
					session.seatBookings.map((booking) => booking.userId),
				);
				const marked = new Set(
					session.attendances.map((attendance) => attendance.userId),
				);
				return booked.size > marked.size;
			},
		).length;

		const todaySessions = await ctx.db.session.findMany({
			where: {
				startAt: {
					gte: todayStart,
					lt: todayEnd,
				},
				...managedSessionWhere,
			},
			select: {
				id: true,
				startAt: true,
				endAt: true,
				lab: { select: { name: true } },
				_count: {
					select: {
						seatBookings: true,
					},
				},
			},
			orderBy: {
				startAt: "asc",
			},
			take: 6,
		});

		const expiringEquipment = await ctx.db.equipment.findMany({
			where: {
				expirationDate: {
					not: null,
					lte: expiringSoon,
				},
			},
			select: {
				id: true,
				name: true,
				total: true,
				unitType: true,
				expirationDate: true,
				lab: { select: { name: true } },
			},
			orderBy: {
				expirationDate: "asc",
			},
			take: 5,
		});

		const recentUsageSessions = await ctx.db.session.findMany({
			where: {
				endAt: { lt: now },
				equipmentBookings: { some: {} },
				...managedSessionWhere,
			},
			select: {
				id: true,
				startAt: true,
				endAt: true,
				lab: { select: { name: true } },
				equipmentBookings: {
					select: {
						amount: true,
						actualUsed: true,
					},
				},
			},
			orderBy: {
				endAt: "desc",
			},
			take: 4,
		});

		return {
			user,
			teacher: {
				metrics: {
					todaySessionsCount: todaySessions.length,
					pendingApprovalCount,
					attendanceBacklogCount,
					pendingUsageReportsCount: usageBacklogSessions.length,
					expiringEquipmentCount: expiringEquipment.length,
				},
				todaySessions: todaySessions.map((session) => ({
					id: session.id,
					labName: session.lab.name,
					startAt: session.startAt,
					endAt: session.endAt,
					bookedCount: session._count.seatBookings,
				})),
				expiringEquipment: expiringEquipment.map((equipment) => ({
					id: equipment.id,
					name: equipment.name,
					total: equipment.total,
					unitType: equipment.unitType,
					expirationDate: equipment.expirationDate,
					labName: equipment.lab.name,
				})),
				usageBacklogSessions: usageBacklogSessions.map((session) => ({
					id: session.id,
					labName: session.lab.name,
					startAt: session.startAt,
					endAt: session.endAt,
					missingReportCount: session.equipmentBookings.length,
					missingStudentCount: new Set(
						session.equipmentBookings.map((booking) => booking.userId),
					).size,
				})),
				recentUsageSessions: recentUsageSessions.map((session) => {
					const reserved = session.equipmentBookings.reduce(
						(total, booking) => total + booking.amount,
						0,
					);
					const used = session.equipmentBookings.reduce(
						(total, booking) => total + (booking.actualUsed ?? 0),
						0,
					);

					return {
						id: session.id,
						labName: session.lab.name,
						startAt: session.startAt,
						endAt: session.endAt,
						reservedTotal: reserved,
						usedTotal: used,
						reportedCount: session.equipmentBookings.filter(
							(booking) => booking.actualUsed !== null,
						).length,
						bookingCount: session.equipmentBookings.length,
					};
				}),
			},
		};
	}),

	getMyBookings: privateProcedure.query(async ({ ctx }) => {
		return await ctx.db.seatBooking.findMany({
			where: {
				userId: ctx.auth.userId,
				session: {
					startAt: { gte: new Date() },
				},
			},
			include: {
				session: {
					include: {
						lab: { select: { name: true } },
					},
				},
				seat: { select: { name: true, row: true, col: true } },
				equipmentBookings: {
					include: {
						equipment: { select: { name: true } },
					},
				},
			},
			orderBy: {
				session: { startAt: "asc" },
			},
		});
	}),

	cancelBooking: privateProcedure
		.input(z.object({ bookingId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const booking = await ctx.db.seatBooking.findUnique({
				where: { id: input.bookingId },
				include: {
					equipmentBookings: true,
					session: {
						select: {
							startAt: true,
						},
					},
				},
			});

			if (!booking) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Booking not found",
				});
			}

			if (booking.userId !== ctx.auth.userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You can only cancel your own bookings",
				});
			}

			const user = await ctx.db.user.findUnique({
				where: { id: ctx.auth.userId },
				select: { role: true },
			});

			if (user?.role === "STUDENT") {
				assertBookingWindowOpen(booking.session.startAt);
			}

			// Release equipment reservations
			for (const eq of booking.equipmentBookings) {
				await ctx.db.sessionEquipment.update({
					where: {
						sessionId_equipmentId: {
							sessionId: booking.sessionId,
							equipmentId: eq.equipmentId,
						},
					},
					data: { reserved: { decrement: eq.amount } },
				});
			}

			// Delete equipment bookings
			await ctx.db.equipmentBooking.deleteMany({
				where: { seatBookingId: input.bookingId },
			});

			// Delete seat booking
			await ctx.db.seatBooking.delete({
				where: { id: input.bookingId },
			});

			// Increment capacity
			await ctx.db.session.update({
				where: { id: booking.sessionId },
				data: { capacity: { increment: 1 } },
			});

			try {
				const bookingDetails = await ctx.db.session.findUnique({
					where: { id: booking.sessionId },
					include: { lab: { select: { name: true } } },
				});
				if (bookingDetails) {
					const user = await ctx.db.user.findUnique({
						where: { id: booking.userId },
						select: { email: true, firstName: true, lastName: true },
					});
					if (user) {
						await sendBookingStatusEmail(
							user.email,
							`${user.firstName} ${user.lastName}`,
							{
								labName: bookingDetails.lab.name,
								seatName: booking.name,
								startAt: bookingDetails.startAt,
								endAt: bookingDetails.endAt,
							},
							"CANCELLED",
						);
					}
				}
			} catch (error) {
				console.error("Failed to send cancellation email:", error);
			}

			return { success: true };
		}),

	// ========== Pending Booking Approval (Teachers) ==========
	getPendingBookings: teacherProcedure
		.input(z.object({ sessionId: z.string().optional() }))
		.query(async ({ ctx, input }) => {
			return await ctx.db.seatBooking.findMany({
				where: {
					status: "PENDING_APPROVAL",
					session: buildManagedSessionWhere(ctx.userRole, ctx.auth.userId),
					...(input.sessionId ? { sessionId: input.sessionId } : {}),
				},
				include: {
					user: { select: { firstName: true, lastName: true, email: true } },
					session: { include: { lab: { select: { name: true } } } },
					seat: { select: { name: true } },
				},
				orderBy: { createdAt: "desc" },
			});
		}),

	approveBooking: teacherProcedure
		.input(z.object({ bookingId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const existingBooking = await ctx.db.seatBooking.findUnique({
				where: { id: input.bookingId },
				include: {
					session: {
						select: {
							id: true,
							createdById: true,
						},
					},
				},
			});

			if (!existingBooking) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Booking not found",
				});
			}

			await ensureManagedSessionAccess({
				database: ctx.db,
				sessionId: existingBooking.session.id,
				userId: ctx.auth.userId,
				role: ctx.userRole,
			});

			const booking = await ctx.db.seatBooking.update({
				where: { id: input.bookingId },
				data: { status: "CONFIRMED" },
				include: {
					user: { select: { email: true, firstName: true, lastName: true } },
					session: { include: { lab: { select: { name: true } } } },
				},
			});
			try {
				await sendBookingStatusEmail(
					booking.user.email,
					`${booking.user.firstName} ${booking.user.lastName}`,
					{
						labName: booking.session.lab.name,
						seatName: booking.name,
						startAt: booking.session.startAt,
						endAt: booking.session.endAt,
					},
					"APPROVED",
				);
			} catch (error) {
				console.error("Failed to send approval email:", error);
			}
			return booking;
		}),

	updateBookingDetails: privateProcedure
		.input(
			z.object({
				bookingId: z.string(),
				notes: z.string().optional(),
				equipment: z
					.array(
						z.object({
							equipmentId: z.string(),
							amount: z.number().min(1),
						}),
					)
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// 1. Fetch Booking & Session
			const booking = await ctx.db.seatBooking.findUnique({
				where: { id: input.bookingId },
				include: { session: true },
			});

			if (!booking)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Booking not found",
				});

			// 2. Check Permissions (Teacher/Admin or Own Booking)
			const user = await ctx.db.user.findUnique({
				where: { id: ctx.auth.userId },
				select: { role: true },
			});
			const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";

			if (!isTeacher && booking.userId !== ctx.auth.userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not authorized to update this booking",
				});
			}

			// 3. Check Lockout (if student)
			if (!isTeacher) {
				assertBookingWindowOpen(booking.session.startAt);
			}

			const requestedEquipment = normalizeEquipmentRequests(input.equipment);

			// 4. Update Transaction
			await ctx.db.$transaction(async (tx) => {
				// Update Notes
				if (input.notes !== undefined) {
					await tx.seatBooking.update({
						where: { id: input.bookingId },
						data: { notes: input.notes },
					});
				}

				// Update Equipment
				if (input.equipment) {
					// 1. Get old equipment bookings BEFORE deleting
					const oldEquipmentBookings = await tx.equipmentBooking.findMany({
						where: { seatBookingId: input.bookingId },
					});

					// 2. Decrement reserved for old equipment
					for (const eq of oldEquipmentBookings) {
						await tx.sessionEquipment.updateMany({
							where: {
								sessionId: booking.sessionId,
								equipmentId: eq.equipmentId,
							},
							data: { reserved: { decrement: eq.amount } },
						});
					}

					// 3. Delete existing equipment bookings
					await tx.equipmentBooking.deleteMany({
						where: { seatBookingId: input.bookingId },
					});

					// 4. Create new equipment bookings with sessionId AND increment reserved
					if (requestedEquipment.length > 0) {
						for (const e of requestedEquipment) {
							// Check availability first
							const sessionEquipment = await tx.sessionEquipment.findUnique({
								where: {
									sessionId_equipmentId: {
										sessionId: booking.sessionId,
										equipmentId: e.equipmentId,
									},
								},
							});

							if (
								!sessionEquipment ||
								sessionEquipment.available - sessionEquipment.reserved <
									e.amount
							) {
								throw new TRPCError({
									code: "BAD_REQUEST",
									message: "Not enough equipment available",
								});
							}

							// Create equipment booking with sessionId
							await tx.equipmentBooking.create({
								data: {
									seatBookingId: input.bookingId,
									equipmentId: e.equipmentId,
									amount: e.amount,
									userId: booking.userId,
									sessionId: booking.sessionId, // CRITICAL: Include sessionId
								},
							});

							// Increment reserved count
							await tx.sessionEquipment.update({
								where: {
									sessionId_equipmentId: {
										sessionId: booking.sessionId,
										equipmentId: e.equipmentId,
									},
								},
								data: { reserved: { increment: e.amount } },
							});
						}
					}
				}
			});

			return { success: true };
		}),

	rejectBooking: teacherProcedure
		.input(z.object({ bookingId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const bookingToReject = await ctx.db.seatBooking.findUnique({
				where: { id: input.bookingId },
				select: { sessionId: true },
			});

			if (!bookingToReject) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Booking not found",
				});
			}

			await ensureManagedSessionAccess({
				database: ctx.db,
				sessionId: bookingToReject.sessionId,
				userId: ctx.auth.userId,
				role: ctx.userRole,
			});

			const removedBooking = await ctx.db.$transaction(async (tx) => {
				const booking = await tx.seatBooking.findUnique({
					where: { id: input.bookingId },
					include: {
						equipmentBookings: true,
						user: { select: { email: true, firstName: true, lastName: true } },
						session: { include: { lab: { select: { name: true } } } },
					},
				});

				if (!booking) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Booking not found",
					});
				}

				for (const eq of booking.equipmentBookings) {
					await tx.sessionEquipment.update({
						where: {
							sessionId_equipmentId: {
								sessionId: booking.sessionId,
								equipmentId: eq.equipmentId,
							},
						},
						data: { reserved: { decrement: eq.amount } },
					});
				}

				await tx.equipmentBooking.deleteMany({
					where: { seatBookingId: input.bookingId },
				});

				await tx.seatBooking.delete({
					where: { id: input.bookingId },
				});

				await tx.session.update({
					where: { id: booking.sessionId },
					data: { capacity: { increment: 1 } },
				});

				return booking;
			});

			if (removedBooking) {
				try {
					await sendBookingStatusEmail(
						removedBooking.user.email,
						`${removedBooking.user.firstName} ${removedBooking.user.lastName}`,
						{
							labName: removedBooking.session.lab.name,
							seatName: removedBooking.name,
							startAt: removedBooking.session.startAt,
							endAt: removedBooking.session.endAt,
						},
						"REJECTED",
					);
				} catch (error) {
					console.error("Failed to send rejection email:", error);
				}
			}

			return { success: true };
		}),

	// ========== Equipment Endpoints ==========
	// Teacher/Admin - add lab equipment
	addLabEquipment: teacherProcedure
		.input(
			z.object({
				labId: z.string(),
				name: z.string(),
				total: z.number().int().nonnegative(),
				expirationDate: z.date().optional(),
				unitType: z.enum(["UNIT", "ML", "G", "MG", "L", "BOX", "TABLETS"]),
				category: z.string().optional(),
				casNumber: z.string().optional(),
				brand: z.string().optional(),
				location: z.string().optional(),
				sdsLink: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return await ctx.db.equipment.create({
				data: {
					labId: input.labId,
					name: input.name,
					total: input.total,
					unitType: input.unitType,
					expirationDate: input.expirationDate,
					category: input.category,
					casNumber: input.casNumber,
					brand: input.brand,
					location: input.location,
					sdsLink: input.sdsLink,
					createdBy: ctx.auth.userId,
				},
			});
		}),

	getLabEquipment: privateProcedure
		.input(
			z.object({
				labId: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return await ctx.db.equipment.findMany({
				where: input.labId && input.labId !== "all" ? {
					labId: input.labId,
				} : undefined,
				select: {
					id: true,
					name: true,
					total: true,
					unitType: true,
					expirationDate: true,
					createdBy: true,
					category: true,
					casNumber: true,
					brand: true,
					location: true,
					sdsLink: true,
					lab: { select: { name: true } },
				},
				orderBy: {
					category: "asc",
				},
			});
		}),

	// Teacher/Admin - delete lab equipment
	deleteLabEquipment: teacherProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const equipment = await ctx.db.equipment.findUnique({
				where: { id: input.id },
				select: {
					_count: {
						select: {
							sessionAvailability: true,
							bookings: true,
						},
					},
				},
			});

			if (!equipment) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Equipment not found",
				});
			}

			if (
				equipment._count.sessionAvailability > 0 ||
				equipment._count.bookings > 0
			) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Equipment with session allocations or booking history cannot be deleted because it is part of the lab record.",
				});
			}

			// Delete related session equipment first
			await ctx.db.sessionEquipment.deleteMany({
				where: { equipmentId: input.id },
			});

			// Delete related equipment bookings
			await ctx.db.equipmentBooking.deleteMany({
				where: { equipmentId: input.id },
			});

			return await ctx.db.equipment.delete({
				where: { id: input.id },
			});
		}),

	// Teacher/Admin - update lab equipment
	updateLabEquipment: teacherProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().optional(),
				total: z.number().int().nonnegative().optional(),
				unitType: z.enum(["UNIT", "ML", "G", "MG", "L", "BOX", "TABLETS"]).optional(),
				expirationDate: z.date().nullish(),
				category: z.string().optional(),
				casNumber: z.string().optional(),
				brand: z.string().optional(),
				location: z.string().optional(),
				sdsLink: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return await ctx.db.equipment.update({
				where: { id: input.id },
				data: {
					name: input.name,
					total: input.total,
					unitType: input.unitType,
					expirationDate: input.expirationDate,
					category: input.category,
					casNumber: input.casNumber,
					brand: input.brand,
					location: input.location,
					sdsLink: input.sdsLink,
				},
			});
		}),

	getSessionEquipment: privateProcedure
		.input(
			z.object({
				sessionId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return await ctx.db.sessionEquipment.findMany({
				where: {
					sessionId: input.sessionId,
				},
				select: {
					id: true,
					equipmentId: true,
					equipment: {
						select: {
							id: true,
							name: true,
							total: true,
							unitType: true,
							expirationDate: true,
						},
					},
					available: true,
					reserved: true,
				},
			});
		}),

	// Teacher/Admin - update session equipment
	updateSessionEquipment: teacherProcedure
		.input(
			z.object({
				sessionId: z.string(),
				deletedEq: z
					.object({
						id: z.string(),
						available: z.number().min(0),
					})
					.array(),
				addedEq: z
					.object({
						id: z.string(),
						available: z.number().min(0),
					})
					.array(),
				updatedEq: z
					.object({
						id: z.string(),
						available: z.number().min(0),
					})
					.array(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ensureManagedSessionAccess({
				database: ctx.db,
				sessionId: input.sessionId,
				userId: ctx.auth.userId,
				role: ctx.userRole,
			});

			const existingSessionEquipment = await ctx.db.sessionEquipment.findMany({
				where: { sessionId: input.sessionId },
				select: { equipmentId: true, reserved: true },
			});
			const reservedMap = new Map(
				existingSessionEquipment.map((eq) => [eq.equipmentId, eq.reserved]),
			);

			for (const eq of input.deletedEq) {
				const reserved = reservedMap.get(eq.id) ?? 0;
				if (reserved > 0) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Cannot remove equipment with existing reservations",
					});
				}
			}

			for (const eq of input.updatedEq) {
				const reserved = reservedMap.get(eq.id) ?? 0;
				if (eq.available < reserved) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Available amount cannot be less than reserved",
					});
				}
			}

			const equipmentIds = [
				...input.addedEq.map((eq) => eq.id),
				...input.updatedEq.map((eq) => eq.id),
			];

			if (equipmentIds.length > 0) {
				const equipmentTotals = await ctx.db.equipment.findMany({
					where: { id: { in: equipmentIds } },
					select: { id: true, total: true },
				});
				const totalsMap = new Map(
					equipmentTotals.map((eq) => [eq.id, eq.total]),
				);

				for (const eq of [...input.addedEq, ...input.updatedEq]) {
					const total = totalsMap.get(eq.id);
					if (total !== undefined && eq.available > total) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message:
								"Session equipment availability cannot exceed lab inventory",
						});
					}
				}
			}

			await ctx.db.sessionEquipment.deleteMany({
				where: {
					sessionId: input.sessionId,
					equipmentId: {
						in: input.deletedEq.map((eq) => eq.id),
					},
				},
			});

			for (const eq of input.updatedEq) {
				await ctx.db.sessionEquipment.update({
					where: {
						sessionId_equipmentId: {
							sessionId: input.sessionId,
							equipmentId: eq.id,
						},
					},
					data: {
						available: eq.available,
					},
				});
			}

			await ctx.db.sessionEquipment.createMany({
				data: input.addedEq.map((eq) => ({
					sessionId: input.sessionId,
					equipmentId: eq.id,
					available: eq.available,
				})),
			});
		}),

	// ========== Equipment Usage Reporting (Students) ==========
	reportEquipmentUsage: privateProcedure
		.input(
			z.object({
				equipmentBookingId: z.string(),
				actualUsed: z.number().min(0),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const booking = await ctx.db.equipmentBooking.findUnique({
				where: { id: input.equipmentBookingId },
				include: {
					session: {
						select: {
							endAt: true,
						},
					},
				},
			});

			if (!booking) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Equipment booking not found",
				});
			}

			if (booking.userId !== ctx.auth.userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You can only report your own equipment usage",
				});
			}

			if (booking.session.endAt > new Date()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Equipment usage can only be reported after the session has ended.",
				});
			}

			if (input.actualUsed > booking.amount) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Reported usage cannot exceed the amount originally booked.",
				});
			}

			return await ctx.db.equipmentBooking.update({
				where: { id: input.equipmentBookingId },
				data: {
					actualUsed: input.actualUsed,
					reportedAt: new Date(),
				},
			});
		}),

	reportSessionEquipmentUsage: privateProcedure
		.input(
			z.object({
				sessionId: z.string(),
				reports: z
					.array(
						z.object({
							equipmentBookingId: z.string(),
							actualUsed: z.number().min(0),
						}),
					)
					.min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const bookingIds = input.reports.map(
				(report) => report.equipmentBookingId,
			);
			const requestedReports = new Map(
				input.reports.map((report) => [
					report.equipmentBookingId,
					report.actualUsed,
				]),
			);

			const equipmentBookings = await ctx.db.equipmentBooking.findMany({
				where: {
					id: { in: bookingIds },
					userId: ctx.auth.userId,
					sessionId: input.sessionId,
				},
				include: {
					session: {
						select: {
							endAt: true,
						},
					},
				},
			});

			if (equipmentBookings.length !== bookingIds.length) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Some equipment usage records could not be updated.",
				});
			}

			const sessionEndAt = equipmentBookings[0]?.session.endAt;
			if (!sessionEndAt || sessionEndAt > new Date()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Equipment usage can only be reported after the session has ended.",
				});
			}

			for (const booking of equipmentBookings) {
				const actualUsed = requestedReports.get(booking.id);
				if (actualUsed === undefined) {
					continue;
				}

				if (actualUsed > booking.amount) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"Reported usage cannot exceed the amount originally booked.",
					});
				}
			}

			await ctx.db.$transaction(
				equipmentBookings.map((booking) =>
					ctx.db.equipmentBooking.update({
						where: { id: booking.id },
						data: {
							actualUsed:
								requestedReports.get(booking.id) ?? booking.actualUsed,
							reportedAt: new Date(),
						},
					}),
				),
			);

			return { success: true, updated: equipmentBookings.length };
		}),

	getMyEquipmentBookings: privateProcedure
		.input(z.object({ sessionId: z.string() }))
		.query(async ({ ctx, input }) => {
			return await ctx.db.equipmentBooking.findMany({
				where: {
					userId: ctx.auth.userId,
					sessionId: input.sessionId,
				},
				include: {
					equipment: { select: { name: true } },
				},
			});
		}),

	// Teacher/Admin - correct a student's reported equipment usage
	correctEquipmentUsage: teacherProcedure
		.input(
			z.object({
				equipmentBookingId: z.string(),
				correctedUsed: z.number().min(0),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const booking = await ctx.db.equipmentBooking.findUnique({
				where: { id: input.equipmentBookingId },
				include: {
					session: { select: { id: true, createdById: true } },
				},
			});

			if (!booking) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Equipment booking not found",
				});
			}

			await ensureManagedSessionAccess({
				database: ctx.db,
				sessionId: booking.session.id,
				userId: ctx.auth.userId,
				role: ctx.userRole,
			});

			if (input.correctedUsed > booking.amount) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Corrected usage cannot exceed the amount originally booked.",
				});
			}

			const updated = await ctx.db.equipmentBooking.update({
				where: { id: input.equipmentBookingId },
				data: {
					...(booking.actualUsed === null
						? {
								actualUsed: input.correctedUsed,
								reportedAt: new Date(),
							}
						: {}),
					correctedUsed: input.correctedUsed,
					correctedBy: ctx.auth.userId,
					correctedAt: new Date(),
				},
			});

			// Send in-app notification to student
			try {
				await ctx.db.notification.create({
					data: {
						userId: booking.userId,
						type: "USAGE_CORRECTED",
						title: "Equipment Usage Corrected",
						message: `A teacher has corrected your equipment usage report.`,
						link: "/dashboard",
					},
				});
			} catch {
				// notification failure is non-fatal
			}

			return updated;
		}),

	// Get session equipment usage summary (for teacher review)
	getSessionUsageSummary: teacherProcedure
		.input(z.object({ sessionId: z.string() }))
		.query(async ({ ctx, input }) => {
			await ensureManagedSessionAccess({
				database: ctx.db,
				sessionId: input.sessionId,
				userId: ctx.auth.userId,
				role: ctx.userRole,
			});

			return await ctx.db.equipmentBooking.findMany({
				where: { sessionId: input.sessionId },
				include: {
					user: { select: { firstName: true, lastName: true, email: true } },
					equipment: { select: { name: true, unitType: true } },
				},
				orderBy: [
					{ user: { lastName: "asc" } },
					{ equipment: { name: "asc" } },
				],
			});
		}),
});
