"use client";
import Lab from "@/app/_components/lab";
import { api } from "@/trpc/react";
import React from "react";

const Physics = () => {
	const { data: account, isLoading } = api.account.getAccount.useQuery();

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="animate-pulse text-muted-foreground">Loading...</div>
			</div>
		);
	}

	// Book pages should always show the student view
	const isTeacher = false;

	return <Lab isPhysics={true} isTeacher={isTeacher} />;
};

export default Physics;
