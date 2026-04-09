"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useEffect, useState } from "react";

export function SidebarWrapper({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { isSignedIn } = useAuth();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return <>{children}</>;
	}

	const isAuthPage = pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");

	if (isAuthPage || !isSignedIn) {
		return <>{children}</>;
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<main className="flex-1 overflow-auto">{children}</main>
		</SidebarProvider>
	);
}