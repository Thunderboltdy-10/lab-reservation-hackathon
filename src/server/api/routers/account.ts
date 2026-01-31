import { db } from "@/server/db";
import {
  createTRPCRouter,
  privateProcedure,
  teacherProcedure,
  adminProcedure,
} from "../trpc";
import z from "zod";
import { TRPCError } from "@trpc/server";

export const authoriseAccountAccess = async (
  accountId: string,
  userId: string
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
          })
        ),
      })
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

  // Admin only - delete account
  deleteAccount: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
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
      })
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
      })
    )
    .query(async ({ ctx, input }) => {
      if (!input.date) return [];

      const nextDay = new Date(input.date.getTime() + 24 * 60 * 60 * 1000);

      const sessions = await ctx.db.session.findMany({
        where: {
          labId: input.labId,
          startAt: {
            gte: input.date,
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
      })
    )
    .query(async ({ ctx, input }) => {
      if (!input.date) return [];

      const nextDay = new Date(input.date.getTime() + 24 * 60 * 60 * 1000);

      const sessions = await ctx.db.session.findMany({
        where: {
          startAt: {
            gte: input.date,
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
              name: true,
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

  // Teacher/Admin - create session
  createSession: teacherProcedure
    .input(
      z.object({
        labId: z.string(),
        startAt: z.date(),
        endAt: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const overlap = await ctx.db.session.findFirst({
        where: {
          labId: input.labId,
          AND: [{ startAt: { lte: input.endAt } }, { endAt: { gte: input.startAt } }],
        },
        select: { id: true },
      });

      if (overlap) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Session overlaps with an existing session",
        });
      }

      return await ctx.db.session.create({
        data: {
          labId: input.labId,
          startAt: input.startAt,
          endAt: input.endAt,
          capacity: 10,
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const overlap = await ctx.db.session.findFirst({
        where: {
          labId: input.labId,
          AND: [
            { startAt: { lte: input.endAt } },
            { endAt: { gte: input.startAt } },
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
      })
    )
    .mutation(async ({ ctx, input }) => {
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
      })
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
      })
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
      })
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

      if (!seatId) throw new TRPCError({ code: "NOT_FOUND", message: "Seat not found" });

      // Check if user is banned
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.auth.userId },
        select: { isBanned: true },
      });

      // Determine booking status based on ban status
      const bookingStatus = user?.isBanned ? "PENDING_APPROVAL" : "CONFIRMED";

      await ctx.db.session.updateMany({
        where: {
          id: input.sessionId,
        },
        data: {
          capacity: {
            decrement: 1,
          },
        },
      });

      return await ctx.db.seatBooking.create({
        data: {
          sessionId: input.sessionId,
          seatId: seatId.id,
          userId: ctx.auth.userId,
          name: input.name,
          status: bookingStatus,
        },
      });
    }),

  // Unbook a seat
  unbookSeat: privateProcedure
    .input(
      z.object({
        name: z.string(),
        sessionId: z.string(),
        labId: z.string(),
        isTeacher: z.boolean(),
      })
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

      if (!seatId) throw new TRPCError({ code: "NOT_FOUND", message: "Seat not found" });

      // Verify teacher role if isTeacher flag is set
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
      }

      await ctx.db.session.updateMany({
        where: {
          id: input.sessionId,
        },
        data: {
          capacity: {
            increment: 1,
          },
        },
      });

      return await ctx.db.seatBooking.deleteMany({
        where: {
          sessionId: input.sessionId,
          seatId: seatId.id,
          name: input.name,
          ...(input.isTeacher ? {} : { userId: ctx.auth.userId }),
        },
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
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const seatId = await ctx.db.seat.findFirst({
        where: {
          labId: input.labId,
          name: input.name,
        },
        select: { id: true },
      });

      if (!seatId) throw new TRPCError({ code: "NOT_FOUND", message: "Seat not found" });

      // Check if user is banned
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.auth.userId },
        select: { isBanned: true },
      });

      const bookingStatus = user?.isBanned ? "PENDING_APPROVAL" : "CONFIRMED";

      // Create seat booking
      const seatBooking = await ctx.db.seatBooking.create({
        data: {
          sessionId: input.sessionId,
          seatId: seatId.id,
          userId: ctx.auth.userId,
          name: input.name,
          status: bookingStatus,
        },
      });

      // Update capacity
      await ctx.db.session.updateMany({
        where: { id: input.sessionId },
        data: { capacity: { decrement: 1 } },
      });

      // Create equipment bookings if provided
      if (input.equipment && input.equipment.length > 0) {
        for (const eq of input.equipment) {
          // Verify equipment availability
          const sessionEquipment = await ctx.db.sessionEquipment.findUnique({
            where: {
              sessionId_equipmentId: {
                sessionId: input.sessionId,
                equipmentId: eq.equipmentId,
              },
            },
          });

          if (!sessionEquipment || sessionEquipment.available - sessionEquipment.reserved < eq.amount) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Not enough equipment available",
            });
          }

          // Create equipment booking
          await ctx.db.equipmentBooking.create({
            data: {
              userId: ctx.auth.userId,
              sessionId: input.sessionId,
              equipmentId: eq.equipmentId,
              seatBookingId: seatBooking.id,
              amount: eq.amount,
            },
          });

          // Update reserved count
          await ctx.db.sessionEquipment.update({
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
    }),

  // Update lab configuration (rows, seats)
  updateLabConfig: teacherProcedure
    .input(
      z.object({
        labId: z.string(),
        config: z.string(), // JSON string
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.lab.update({
        where: { id: input.labId },
        data: { defaultRowConfig: input.config },
      });
    }),

  // ========== Student Booking Management ==========
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
        include: { equipmentBookings: true },
      });

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      if (booking.userId !== ctx.auth.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only cancel your own bookings",
        });
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

      return { success: true };
    }),

  // ========== Pending Booking Approval (Teachers) ==========
  getPendingBookings: teacherProcedure
    .input(z.object({ sessionId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.seatBooking.findMany({
        where: {
          status: "PENDING_APPROVAL",
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
      return await ctx.db.seatBooking.update({
        where: { id: input.bookingId },
        data: { status: "CONFIRMED" },
      });
    }),

  rejectBooking: teacherProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.seatBooking.findUnique({
        where: { id: input.bookingId },
        include: { equipmentBookings: true },
      });

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
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

      // Update booking status
      await ctx.db.seatBooking.update({
        where: { id: input.bookingId },
        data: { status: "REJECTED" },
      });

      // Increment capacity
      await ctx.db.session.update({
        where: { id: booking.sessionId },
        data: { capacity: { increment: 1 } },
      });

      return { success: true };
    }),

  // ========== Equipment Endpoints ==========
  // Teacher/Admin - add lab equipment
  addLabEquipment: teacherProcedure
    .input(
      z.object({
        labId: z.string(),
        name: z.string(),
        total: z.number(),
        expirationDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.equipment.create({
        data: {
          labId: input.labId,
          name: input.name,
          total: input.total,
          expirationDate: input.expirationDate,
          createdBy: ctx.auth.userId,
        },
      });
    }),

  getLabEquipment: privateProcedure
    .input(
      z.object({
        labId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.equipment.findMany({
        where: {
          labId: input.labId,
        },
        select: {
          id: true,
          name: true,
          total: true,
          expirationDate: true,
          createdBy: true,
        },
        orderBy: {
          total: "desc",
        },
      });
    }),

  // Teacher/Admin - delete lab equipment
  deleteLabEquipment: teacherProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
        total: z.number().optional(),
        expirationDate: z.date().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.equipment.update({
        where: { id: input.id },
        data: {
          name: input.name,
          total: input.total,
          expirationDate: input.expirationDate,
        },
      });
    }),

  getSessionEquipment: privateProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
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
            available: z.number(),
          })
          .array(),
        addedEq: z
          .object({
            id: z.string(),
            available: z.number(),
          })
          .array(),
        updatedEq: z
          .object({
            id: z.string(),
            available: z.number(),
          })
          .array(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.equipmentBooking.findUnique({
        where: { id: input.equipmentBookingId },
      });

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Equipment booking not found" });
      }

      if (booking.userId !== ctx.auth.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only report your own equipment usage",
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
});
