"use client";

import React from "react";
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
import { formatInTimeZone } from "date-fns-tz";
import {
  Calendar,
  Clock,
  MapPin,
  Package,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
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

const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? "Europe/Madrid";

const formatDate = (date: Date) => {
  return formatInTimeZone(date, TIMEZONE, "EEEE, MMMM d");
};

const formatTime = (date: Date) => {
  return formatInTimeZone(date, TIMEZONE, "HH:mm");
};

export default function DashboardPage() {
  const { data: account } = api.account.getAccount.useQuery();
  const { data: bookings, refetch } = api.account.getMyBookings.useQuery();
  const cancelMutation = api.account.cancelBooking.useMutation();

  const handleCancel = (bookingId: string) => {
    cancelMutation.mutate(
      { bookingId },
      {
        onSuccess: () => {
          toast.success("Booking cancelled successfully");
          refetch();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <Badge className="bg-primary text-primary-foreground">
            <CheckCircle className="mr-1 h-3 w-3" />
            Confirmed
          </Badge>
        );
      case "PENDING_APPROVAL":
        return (
          <Badge variant="secondary" className="bg-amber-500 text-white">
            <AlertCircle className="mr-1 h-3 w-3" />
            Pending Approval
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <X className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="font-semibold text-3xl">
          Welcome back, {account?.firstName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your upcoming lab sessions and bookings
        </p>
      </div>

      {account?.isBanned && (
        <Card className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Account Restricted
              </p>
              <p className="text-amber-700 text-sm dark:text-amber-300">
                Your bookings require teacher approval. Reason:{" "}
                {account.isBanned ? "Pending review" : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xl">Upcoming Bookings</h2>
          <Badge variant="outline">{bookings?.length ?? 0} bookings</Badge>
        </div>

        {!bookings || bookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="font-medium text-lg">No upcoming bookings</h3>
              <p className="mt-1 text-muted-foreground">
                Book a lab session to get started
              </p>
              <Button className="mt-4" asChild>
                <a href="/book">Book a Lab</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="stagger-children space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {booking.session.lab.name} Lab
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(new Date(booking.session.startAt))}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(new Date(booking.session.startAt))} -{" "}
                          {formatTime(new Date(booking.session.endAt))}
                        </span>
                      </CardDescription>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Seat {booking.seat.name}</Badge>
                      </div>
                      {booking.equipmentBookings.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {booking.equipmentBookings.map((eq) => (
                            <Badge
                              key={eq.id}
                              variant="secondary"
                              className="text-xs"
                            >
                              <Package className="mr-1 h-3 w-3" />
                              {eq.equipment.name} x{eq.amount}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="mr-1 h-4 w-4" />
                          Cancel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel your booking for{" "}
                            {booking.session.lab.name} Lab on{" "}
                            {formatDate(new Date(booking.session.startAt))}? This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleCancel(booking.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Cancel Booking
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <a href="/book/physics">Book Physics Lab</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/book/biology">Book Biology Lab</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
