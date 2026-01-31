"use client";
import Lab from "@/app/_components/lab";
import React from "react";
import { api } from "@/trpc/react";

const Physics = () => {
  const { data: account, isLoading } = api.account.getAccount.useQuery();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isTeacher = account?.role === "TEACHER" || account?.role === "ADMIN";

  return <Lab isPhysics={true} isTeacher={isTeacher} />;
};

export default Physics;
