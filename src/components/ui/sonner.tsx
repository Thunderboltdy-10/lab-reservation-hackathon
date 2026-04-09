"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			className="toaster group"
			toastOptions={{
				classNames: {
					toast:
						"group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl shadow-lg border rounded-xl py-4",
					description: "group-[.toast]:text-muted-foreground",
					actionButton:
						"group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-semibold rounded-md",
					cancelButton:
						"group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-semibold rounded-md",
					error:
						"group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground font-medium",
					success:
						"group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground font-medium",
					warning:
						"group-[.toaster]:bg-amber-500 group-[.toaster]:text-white font-medium",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
