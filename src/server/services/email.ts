import nodemailer from "nodemailer";
import { db } from "@/server/db";

// Create transporter using Gmail
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn("Email credentials not configured. Emails will not be sent.");
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
};

const transporter = createTransporter();

// Email templates
const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: process.env.NEXT_PUBLIC_TIMEZONE ?? "Europe/Madrid",
  });
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: process.env.NEXT_PUBLIC_TIMEZONE ?? "Europe/Madrid",
  });
};

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: SendEmailOptions) => {
  if (!transporter) {
    console.log("Email not sent (transporter not configured):", options.subject);
    return { success: false, reason: "transporter_not_configured" };
  }

  try {
    await transporter.sendMail({
      from: `"TGC Lab Reservations" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log("Email sent successfully to:", options.to);
    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, reason: "send_failed", error };
  }
};

// Student reminder email (3 hours before session)
export const sendStudentReminderEmail = async (
  studentEmail: string,
  studentName: string,
  sessionDetails: {
    labName: string;
    seatName: string;
    startAt: Date;
    endAt: Date;
    equipment?: { name: string; amount: number }[];
  }
) => {
  const equipmentList = sessionDetails.equipment
    ?.map((e) => `<li>${e.name} (x${e.amount})</li>`)
    .join("") ?? "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #003087; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .highlight { background: #B3DC3C; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Lab Session Reminder</h1>
        </div>
        <div class="content">
          <p>Hi ${studentName},</p>
          <p>This is a reminder that your lab session is starting in <span class="highlight">3 hours</span>.</p>

          <div class="details">
            <h3>Session Details</h3>
            <p><strong>Lab:</strong> ${sessionDetails.labName}</p>
            <p><strong>Date:</strong> ${formatDate(sessionDetails.startAt)}</p>
            <p><strong>Time:</strong> ${formatTime(sessionDetails.startAt)} - ${formatTime(sessionDetails.endAt)}</p>
            <p><strong>Your Seat:</strong> ${sessionDetails.seatName}</p>
            ${equipmentList
      ? `<p><strong>Equipment Reserved:</strong></p><ul>${equipmentList}</ul>`
      : ""
    }
          </div>

          <p>Please arrive on time and bring any necessary materials.</p>

          <div class="footer">
            <p>The Global College Lab Reservation System</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: studentEmail,
    subject: `Reminder: Lab Session in ${sessionDetails.labName} - ${formatTime(sessionDetails.startAt)}`,
    html,
  });
};

// Teacher summary email (15 minutes before session)
export const sendTeacherSummaryEmail = async (
  teacherEmail: string,
  teacherName: string,
  sessionDetails: {
    sessionId: string;
    labName: string;
    startAt: Date;
    endAt: Date;
    students: {
      name: string;
      seatName: string;
      notes?: string | null;  // Added notes field
      equipment?: { name: string; amount: number }[];
    }[];
    totalEquipmentNeeds: { name: string; totalAmount: number }[];
  }
) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const attendanceUrl = `${appUrl}/attendance/${sessionDetails.sessionId}`;

  const studentRows = sessionDetails.students
    .map(
      (s) =>
        `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${s.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${s.seatName}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${s.equipment?.map((e) => `${e.name} (x${e.amount})`).join(", ") ?? "-"
        }</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-style: italic; color: #666;">${s.notes || "-"}</td>
          </tr>`
    )
    .join("");

  const equipmentSummary = sessionDetails.totalEquipmentNeeds
    .map((e) => `<li>${e.name}: <strong>${e.totalAmount}</strong> units needed</li>`)
    .join("");

  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: #003087; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .btn { display: inline-block; background: #B3DC3C; color: #003087; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 15px 0; }
          .table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
          .table th { background: #003087; color: white; padding: 12px; text-align: left; }
          .equipment-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #B3DC3C; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Session Starting Soon</h1>
            <p style="margin: 0; opacity: 0.9;">15 minutes until your session begins</p>
          </div>
          <div class="content">
            <p>Hi ${teacherName},</p>
            <p>Your lab session is about to start. Here's your session summary:</p>
  
            <p><strong>Lab:</strong> ${sessionDetails.labName}<br>
            <strong>Time:</strong> ${formatTime(sessionDetails.startAt)} - ${formatTime(sessionDetails.endAt)}<br>
            <strong>Date:</strong> ${formatDate(sessionDetails.startAt)}<br>
            <strong>Total Students:</strong> ${sessionDetails.students.length}</p>
  
            <div style="text-align: center;">
              <a href="${attendanceUrl}" class="btn">Mark Attendance</a>
            </div>
  
            ${equipmentSummary
      ? `
              <div class="equipment-box">
                <h3 style="margin-top: 0;">Equipment Needed</h3>
                <ul>${equipmentSummary}</ul>
              </div>
            `
      : ""
    }
  
            <h3>Student List</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Seat</th>
                  <th>Equipment Requested</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${studentRows || '<tr><td colspan="4" style="padding: 15px; text-align: center;">No students registered</td></tr>'}
              </tbody>
            </table>

          <div class="footer">
            <p>The Global College Lab Reservation System</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: teacherEmail,
    subject: `Starting Soon: ${sessionDetails.labName} Session (${sessionDetails.students.length} students)`,
    html,
  });
};

// Booking confirmation email
export const sendBookingConfirmationEmail = async (
  studentEmail: string,
  studentName: string,
  bookingDetails: {
    labName: string;
    seatName: string;
    startAt: Date;
    endAt: Date;
    status: string;
    equipment?: { name: string; amount: number }[];
  }
) => {
  const isPending = bookingDetails.status === "PENDING_APPROVAL";
  const equipmentList = bookingDetails.equipment
    ?.map((e) => `<li>${e.name} (x${e.amount})</li>`)
    .join("") ?? "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${isPending ? "#f59e0b" : "#003087"}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
        .status-confirmed { background: #B3DC3C; color: #003087; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isPending ? "Booking Pending Approval" : "Booking Confirmed"}</h1>
        </div>
        <div class="content">
          <p>Hi ${studentName},</p>
          ${isPending
      ? "<p>Your booking has been submitted and is <strong>pending teacher approval</strong>. You will be notified once it's reviewed.</p>"
      : "<p>Your lab session booking has been <strong>confirmed</strong>!</p>"
    }

          <div class="details">
            <p><strong>Status:</strong> <span class="status ${isPending ? "status-pending" : "status-confirmed"}">${isPending ? "Pending Approval" : "Confirmed"}</span></p>
            <p><strong>Lab:</strong> ${bookingDetails.labName}</p>
            <p><strong>Date:</strong> ${formatDate(bookingDetails.startAt)}</p>
            <p><strong>Time:</strong> ${formatTime(bookingDetails.startAt)} - ${formatTime(bookingDetails.endAt)}</p>
            <p><strong>Seat:</strong> ${bookingDetails.seatName}</p>
            ${equipmentList
      ? `<p><strong>Equipment Reserved:</strong></p><ul>${equipmentList}</ul>`
      : ""
    }
          </div>

          <div class="footer">
            <p>The Global College Lab Reservation System</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: studentEmail,
    subject: `${isPending ? "Pending: " : ""}Lab Booking - ${bookingDetails.labName} on ${formatDate(bookingDetails.startAt)}`,
    html,
  });
};

export const sendBookingStatusEmail = async (
  studentEmail: string,
  studentName: string,
  bookingDetails: {
    labName: string;
    seatName: string;
    startAt: Date;
    endAt: Date;
  },
  status: "APPROVED" | "REJECTED" | "CANCELLED"
) => {
  const statusText =
    status === "APPROVED"
      ? "approved"
      : status === "REJECTED"
        ? "rejected"
        : "cancelled";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${status === "APPROVED" ? "#003087" : "#ef4444"}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking ${statusText}</h1>
        </div>
        <div class="content">
          <p>Hi ${studentName},</p>
          <p>Your lab booking has been <strong>${statusText}</strong>.</p>
          <div class="details">
            <p><strong>Lab:</strong> ${bookingDetails.labName}</p>
            <p><strong>Date:</strong> ${formatDate(bookingDetails.startAt)}</p>
            <p><strong>Time:</strong> ${formatTime(bookingDetails.startAt)} - ${formatTime(bookingDetails.endAt)}</p>
            <p><strong>Seat:</strong> ${bookingDetails.seatName}</p>
          </div>
          <div class="footer">
            <p>The Global College Lab Reservation System</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: studentEmail,
    subject: `Lab Booking ${statusText}: ${bookingDetails.labName} on ${formatDate(bookingDetails.startAt)}`,
    html,
  });
};

export const sendTeacherBookingRequestEmail = async (
  teacherEmail: string,
  teacherName: string,
  bookingDetails: {
    studentName: string;
    labName: string;
    seatName: string;
    startAt: Date;
    endAt: Date;
  }
) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #003087; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Approval Needed</h1>
        </div>
        <div class="content">
          <p>Hi ${teacherName},</p>
          <p>${bookingDetails.studentName} has requested a booking.</p>
          <div class="details">
            <p><strong>Lab:</strong> ${bookingDetails.labName}</p>
            <p><strong>Date:</strong> ${formatDate(bookingDetails.startAt)}</p>
            <p><strong>Time:</strong> ${formatTime(bookingDetails.startAt)} - ${formatTime(bookingDetails.endAt)}</p>
            <p><strong>Seat:</strong> ${bookingDetails.seatName}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: teacherEmail,
    subject: `Approval needed: ${bookingDetails.labName} booking request`,
    html,
  });
};

// Get upcoming sessions that need reminders
export const getSessionsNeedingReminders = async () => {
  const now = new Date();

  // 3 hour window for student reminders (between 2:55 and 3:05 hours before)
  const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const studentReminderWindowStart = new Date(threeHoursFromNow.getTime() - 5 * 60 * 1000);
  const studentReminderWindowEnd = new Date(threeHoursFromNow.getTime() + 5 * 60 * 1000);

  // 15 minute window for teacher reminders (between 10 and 20 minutes before)
  const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
  const teacherReminderWindowStart = new Date(fifteenMinutesFromNow.getTime() - 5 * 60 * 1000);
  const teacherReminderWindowEnd = new Date(fifteenMinutesFromNow.getTime() + 5 * 60 * 1000);

  // Sessions for student reminders (3 hours before)
  const sessionsForStudentReminders = await db.session.findMany({
    where: {
      startAt: {
        gte: studentReminderWindowStart,
        lte: studentReminderWindowEnd,
      },
      studentReminderSentAt: null,
    },
    include: {
      lab: { select: { name: true } },
      seatBookings: {
        where: { status: "CONFIRMED" },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
          seat: { select: { name: true } },
          equipmentBookings: {
            include: { equipment: { select: { name: true } } },
          },
        },
      },
    },
  });

  // Sessions for teacher reminders (15 minutes before)
  const sessionsForTeacherReminders = await db.session.findMany({
    where: {
      startAt: {
        gte: teacherReminderWindowStart,
        lte: teacherReminderWindowEnd,
      },
      teacherReminderSentAt: null,
    },
    include: {
      lab: { select: { name: true } },
      createdBy: { select: { email: true, firstName: true, lastName: true } },
      seatBookings: {
        where: { status: "CONFIRMED" },
        select: {
          notes: true, // Include notes for teacher summary
          user: { select: { firstName: true, lastName: true } },
          seat: { select: { name: true } },
          equipmentBookings: {
            include: { equipment: { select: { name: true } } },
          },
        },
      },
    },
  });

  return {
    studentReminders: sessionsForStudentReminders,
    teacherReminders: sessionsForTeacherReminders,
  };
};
