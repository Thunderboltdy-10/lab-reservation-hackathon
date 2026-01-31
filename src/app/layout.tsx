import "@/styles/globals.css";
import type { Metadata } from "next";
import { Geist, Montserrat, Inter } from "next/font/google";
import { TRPCReactProvider } from "@/trpc/react";
import { ClerkProvider } from "@clerk/nextjs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Lab Reservation | The Global College",
  description: "Book your lab sessions at The Global College",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icon.jpg",
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${montserrat.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "var(--primary)",
              colorBackground: "var(--background)",
              colorInputBackground: "var(--input)",
              colorInputText: "var(--foreground)",
              colorText: "var(--foreground)",
              colorTextSecondary: "var(--muted-foreground)",
              borderRadius: "0.625rem",
              fontFamily: "Inter, sans-serif",
            },
            elements: {
              rootBox: "mx-auto",
              card: "bg-card border border-border shadow-xl",
              headerTitle: "text-foreground font-semibold",
              headerSubtitle: "text-muted-foreground",
              socialButtonsBlockButton: "bg-secondary hover:bg-secondary/80 border border-border",
              socialButtonsBlockButtonText: "text-foreground font-medium",
              socialButtonsProviderIcon: "text-foreground",
              dividerLine: "bg-border",
              dividerText: "text-muted-foreground",
              formFieldLabel: "text-foreground",
              formFieldInput: "bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary",
              formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold",
              footerActionLink: "text-primary hover:text-primary/80",
              identityPreviewText: "text-foreground",
              identityPreviewEditButton: "text-primary hover:text-primary/80",
              formFieldAction: "text-primary hover:text-primary/80",
              alertText: "text-foreground",
              badge: "bg-primary/20 text-primary",
              userButtonPopoverCard: "bg-card border border-border text-foreground",
              userButtonPopoverMain: "bg-card text-foreground",
              userButtonPopoverFooter: "text-muted-foreground",
              userButtonPopoverActionButton: "text-foreground hover:bg-muted",
              userButtonPopoverActionButtonText: "text-foreground",
              userButtonPopoverActionButtonIcon: "text-foreground",
              userButtonPopoverFooterAction: "text-primary hover:text-primary/80",
            },
          }}
        >
          <SidebarProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <TRPCReactProvider>
                <AppSidebar />
                <main className="flex-1 overflow-auto">{children}</main>
                <Toaster richColors position="top-center" />
              </TRPCReactProvider>
            </ThemeProvider>
          </SidebarProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
