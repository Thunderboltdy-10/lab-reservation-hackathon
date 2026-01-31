import {
  createTRPCRouter,
  privateProcedure,
  teacherProcedure,
} from "../trpc";
import z from "zod";
import { TRPCError } from "@trpc/server";

export const attendanceRouter = createTRPCRouter({
  getRecentAttendance: teacherProcedure
    .input(
      z
        .object({
          take: z.number().min(1).max(20).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const take = input?.take ?? 5;
      const sessions = await ctx.db.session.findMany({
        where: {
          attendances: { some: {} },
        },
        include: {
          lab: { select: { name: true } },
          attendances: { select: { status: true } },
        },
        orderBy: { startAt: "desc" },
        take,
      });

      return sessions.map((session) => {
        const present = session.attendances.filter((a) => a.status === "PRESENT").length;
        const absent = session.attendances.filter((a) => a.status === "ABSENT").length;
        const excused = session.attendances.filter((a) => a.status === "EXCUSED").length;
        return {
          id: session.id,
          labName: session.lab.name,
          startAt: session.startAt,
          endAt: session.endAt,
          present,
          absent,
          excused,
        };
      });
    }),

  getAttendanceSessions: teacherProcedure
    .input(
      z.object({
        scope: z.enum(["upcoming", "past"]),
        take: z.number().min(1).max(50).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const take = input.take ?? 20;
      const where =
        input.scope === "upcoming"
          ? { startAt: { gte: now } }
          : { endAt: { lt: now } };

      const sessions = await ctx.db.session.findMany({
        where,
        include: {
          lab: { select: { name: true } },
          seatBookings: { select: { id: true } },
          attendances: { select: { status: true } },
        },
        orderBy: { startAt: input.scope === "upcoming" ? "asc" : "desc" },
        take,
      });

      return sessions.map((session) => ({
        id: session.id,
        labName: session.lab.name,
        startAt: session.startAt,
        endAt: session.endAt,
        totalBooked: session.seatBookings.length,
        present: session.attendances.filter((a) => a.status === "PRESENT").length,
        absent: session.attendances.filter((a) => a.status === "ABSENT").length,
        excused: session.attendances.filter((a) => a.status === "EXCUSED").length,
      }));
    }),
  // Get attendance for a specific session
  getSessionAttendance: teacherProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get all students who booked seats for this session
      const seatBookings = await ctx.db.seatBooking.findMany({
        where: {
          sessionId: input.sessionId,
          status: "CONFIRMED",
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isBanned: true,
            },
          },
          seat: { select: { name: true } },
        },
      });

      // Get existing attendance records for this session
      const attendanceRecords = await ctx.db.attendance.findMany({
        where: { sessionId: input.sessionId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          markedByUser: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      // Get session details
      const session = await ctx.db.session.findUnique({
        where: { id: input.sessionId },
        include: {
          lab: { select: { name: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
      });

      // Create a map of existing attendance records
      const attendanceMap = new Map(
        attendanceRecords.map((a) => [a.userId, a])
      );

      // Build combined list with booking and attendance info
      const students = seatBookings.map((booking) => ({
        seatBookingId: booking.id,
        seatName: booking.seat.name,
        user: booking.user,
        attendance: attendanceMap.get(booking.userId) ?? null,
      }));

      return {
        session,
        students,
        totalBooked: seatBookings.length,
        totalPresent: attendanceRecords.filter((a) => a.status === "PRESENT").length,
        totalAbsent: attendanceRecords.filter((a) => a.status === "ABSENT").length,
        totalExcused: attendanceRecords.filter((a) => a.status === "EXCUSED").length,
      };
    }),

  // Mark attendance for a student
  markAttendance: teacherProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
        status: z.enum(["PRESENT", "ABSENT", "EXCUSED"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.attendance.upsert({
        where: {
          userId_sessionId: {
            userId: input.userId,
            sessionId: input.sessionId,
          },
        },
        update: {
          status: input.status,
          markedBy: ctx.auth.userId,
          markedAt: new Date(),
          notes: input.notes,
        },
        create: {
          userId: input.userId,
          sessionId: input.sessionId,
          status: input.status,
          markedBy: ctx.auth.userId,
          notes: input.notes,
        },
      });
    }),

  // Bulk mark attendance for all students in a session
  markBulkAttendance: teacherProcedure
    .input(
      z.object({
        sessionId: z.string(),
        attendances: z.array(
          z.object({
            userId: z.string(),
            status: z.enum(["PRESENT", "ABSENT", "EXCUSED"]),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = [];
      for (const attendance of input.attendances) {
        const result = await ctx.db.attendance.upsert({
          where: {
            userId_sessionId: {
              userId: attendance.userId,
              sessionId: input.sessionId,
            },
          },
          update: {
            status: attendance.status,
            markedBy: ctx.auth.userId,
            markedAt: new Date(),
            notes: attendance.notes,
          },
          create: {
            userId: attendance.userId,
            sessionId: input.sessionId,
            status: attendance.status,
            markedBy: ctx.auth.userId,
            notes: attendance.notes,
          },
        });
        results.push(result);
      }
      return results;
    }),

  // Get attendance history for a specific student
  getStudentHistory: teacherProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isBanned: true,
          bannedAt: true,
          banReason: true,
        },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const attendanceRecords = await ctx.db.attendance.findMany({
        where: { userId: input.userId },
        include: {
          session: {
            include: {
              lab: { select: { name: true } },
            },
          },
          markedByUser: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { markedAt: "desc" },
      });

      const stats = {
        totalSessions: attendanceRecords.length,
        present: attendanceRecords.filter((a) => a.status === "PRESENT").length,
        absent: attendanceRecords.filter((a) => a.status === "ABSENT").length,
        excused: attendanceRecords.filter((a) => a.status === "EXCUSED").length,
      };

      return {
        user,
        attendanceRecords,
        stats,
        attendanceRate:
          stats.totalSessions > 0
            ? ((stats.present + stats.excused) / stats.totalSessions) * 100
            : 0,
      };
    }),

  // Get my own attendance history (for students)
  getMyAttendanceHistory: privateProcedure.query(async ({ ctx }) => {
    const attendanceRecords = await ctx.db.attendance.findMany({
      where: { userId: ctx.auth.userId },
      include: {
        session: {
          include: {
            lab: { select: { name: true } },
          },
        },
      },
      orderBy: { markedAt: "desc" },
    });

    const stats = {
      totalSessions: attendanceRecords.length,
      present: attendanceRecords.filter((a) => a.status === "PRESENT").length,
      absent: attendanceRecords.filter((a) => a.status === "ABSENT").length,
      excused: attendanceRecords.filter((a) => a.status === "EXCUSED").length,
    };

    return {
      attendanceRecords,
      stats,
      attendanceRate:
        stats.totalSessions > 0
          ? ((stats.present + stats.excused) / stats.totalSessions) * 100
          : 0,
    };
  }),

  // Update ban status for a student
  updateBanStatus: teacherProcedure
    .input(
      z.object({
        userId: z.string(),
        isBanned: z.boolean(),
        banReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          isBanned: input.isBanned,
          bannedAt: input.isBanned ? new Date() : null,
          bannedBy: input.isBanned ? ctx.auth.userId : null,
          banReason: input.isBanned ? input.banReason : null,
        },
      });
    }),

  // Get all students with attendance summary
  getAllStudentsWithAttendance: teacherProcedure.query(async ({ ctx }) => {
    const students = await ctx.db.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isBanned: true,
        bannedAt: true,
        banReason: true,
        attendances: {
          select: { status: true },
        },
        seatBookings: {
          select: { id: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return students.map((student) => ({
      ...student,
      totalBookings: student.seatBookings.length,
      totalSessions: student.attendances.length,
      presentCount: student.attendances.filter((a) => a.status === "PRESENT").length,
      absentCount: student.attendances.filter((a) => a.status === "ABSENT").length,
      excusedCount: student.attendances.filter((a) => a.status === "EXCUSED").length,
      attendanceRate:
        student.attendances.length > 0
          ? (
              (student.attendances.filter(
                (a) => a.status === "PRESENT" || a.status === "EXCUSED"
              ).length /
                student.attendances.length) *
              100
            ).toFixed(1)
          : "N/A",
    }));
  }),

  // Get sessions that need attendance marking (past sessions with unfinished attendance)
  getSessionsNeedingAttendance: teacherProcedure.query(async ({ ctx }) => {
    const now = new Date();

    const sessions = await ctx.db.session.findMany({
      where: {
        endAt: { lt: now },
      },
      include: {
        lab: { select: { name: true } },
        seatBookings: {
          where: { status: "CONFIRMED" },
          select: { userId: true },
        },
        attendances: {
          select: { userId: true },
        },
      },
      orderBy: { startAt: "desc" },
      take: 50, // Limit to recent sessions
    });

    // Filter to sessions where not all students have been marked
    return sessions
      .filter((session) => {
        const bookedUserIds = new Set(session.seatBookings.map((b) => b.userId));
        const markedUserIds = new Set(session.attendances.map((a) => a.userId));
        return bookedUserIds.size > markedUserIds.size;
      })
      .map((session) => ({
        id: session.id,
        labName: session.lab.name,
        startAt: session.startAt,
        endAt: session.endAt,
        totalBooked: session.seatBookings.length,
        totalMarked: session.attendances.length,
        unmarkedCount: session.seatBookings.length - session.attendances.length,
      }));
  }),
});
