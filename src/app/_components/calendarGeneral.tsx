"use client";
import React, { useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { api } from "@/trpc/react";
import { useAuth } from "@clerk/nextjs";
import { formatInTimeZone } from "date-fns-tz";
import { Clock, MapPin, Users, User } from "lucide-react";

const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? "Europe/Madrid";

const formatTime = (date: Date) => {
  return formatInTimeZone(date, TIMEZONE, "HH:mm");
};

const formatDate = (date: Date) => {
  return formatInTimeZone(date, TIMEZONE, "EEEE, MMMM d, yyyy");
};

const CalendarGeneral = () => {
  const [date, setDate] = React.useState<Date | undefined>(undefined);

  const { userId } = useAuth();

  const normalisedDate = useMemo(() => {
    if (!date) return undefined;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }, [date]);

  const { data, refetch } = api.account.getSessionAll.useQuery(
    {
      date: normalisedDate,
    },
    {
      enabled: !!date,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );

  useEffect(() => {
    setDate(new Date());
  }, []);

  useEffect(() => {
    refetch();
  }, [date, refetch]);

  return (
    <div className="m-10 flex h-3/4 justify-center gap-20">
      <Calendar mode="single" selected={date} onSelect={setDate} />
      <div className="flex flex-col items-center gap-4">
        <div className="font-semibold text-lg">
          <span>{date ? formatDate(date) : ""}</span>
        </div>
        {/* Timezone indicator */}
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <Clock className="h-3 w-3" />
          <span>Times shown in {TIMEZONE}</span>
        </div>
        <div className="scrollbar-thin flex max-h-full w-84 flex-col gap-2 overflow-y-auto rounded-lg border bg-card p-3">
          <div className="flex items-center justify-center">
            <div className="pl-2 font-semibold text-foreground text-xl">
              Sessions
            </div>
          </div>
          {data?.length === 0 && (
            <div className="mt-2 flex justify-center">
              <div className="text-muted-foreground">
                No sessions found this day
              </div>
            </div>
          )}
          <div className="stagger-children space-y-2">
            {data?.map((sess) => (
              <div key={sess.id}>
                <div className="flex flex-col">
                  <div className="relative w-full cursor-pointer rounded-lg border bg-card p-3 text-center transition-all hover:shadow-md">
                    <div className="mb-2 flex items-center justify-center gap-1 font-semibold text-foreground text-lg">
                      <Clock className="h-4 w-4" />
                      {formatTime(new Date(sess.startAt))} -{" "}
                      {formatTime(new Date(sess.endAt))}
                    </div>
                    <div className="flex items-center justify-center gap-1 font-medium text-primary">
                      <MapPin className="h-3 w-3" />
                      {sess.lab.name} Lab
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-muted-foreground text-sm">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Capacity: {sess.capacity}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {sess.createdBy.firstName} {sess.createdBy.lastName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarGeneral;
