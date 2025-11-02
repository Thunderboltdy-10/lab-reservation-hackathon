import "@/styles/globals.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { TRPCReactProvider } from "@/trpc/react";
import { ClerkProvider } from "@clerk/nextjs";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./sidebar";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
    title: "Lab Reservation",
    description: "Book your Lab",
    icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
    subsets: ["latin"],
    variable: "--font-geist-sans",
});

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
            <body>
                <ClerkProvider>
                    <SidebarProvider>
                        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                            <TRPCReactProvider>
                                <AppSidebar />
                                <main className="flex-1">{children}</main>
                                <Toaster />
                            </TRPCReactProvider>
                        </ThemeProvider>
                    </SidebarProvider>
                </ClerkProvider>
            </body>
        </html>
    );
}