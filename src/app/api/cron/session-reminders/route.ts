import { NextResponse } from "next/server";
import {
  getSessionsNeedingReminders,
  sendStudentReminderEmail,
  sendTeacherSummaryEmail,
} from "@/server/services/email";

// This route should be called by a cron job (e.g., Vercel Cron, every 5 minutes)
// For Vercel Cron, add to vercel.json:
// { "crons": [{ "path": "/api/cron/session-reminders", "schedule": "*/5 * * * *" }] }

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds max for this route

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { studentReminders, teacherReminders } = await getSessionsNeedingReminders();

    const results = {
      studentEmailsSent: 0,
      teacherEmailsSent: 0,
      errors: [] as string[],
    };

    // Send student reminders (3 hours before)
    for (const session of studentReminders) {
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
            }
          );
          results.studentEmailsSent++;
        } catch (error) {
          results.errors.push(
            `Failed to send student reminder to ${booking.user.email}: ${error}`
          );
        }
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
            equipment: equipment.length > 0 ? equipment : undefined,
          };
        });

        const totalEquipmentNeeds = Array.from(equipmentMap.entries()).map(
          ([name, totalAmount]) => ({ name, totalAmount })
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
          }
        );
        results.teacherEmailsSent++;
      } catch (error) {
        results.errors.push(
          `Failed to send teacher summary to ${session.createdBy.email}: ${error}`
        );
      }
    }

    console.log("Cron job completed:", results);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
