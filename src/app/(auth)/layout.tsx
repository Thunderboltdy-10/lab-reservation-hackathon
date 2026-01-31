export default function clerkLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
            {/* TGC Branding */}
            <div className="mb-8 flex flex-col items-center gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-xl">TGC</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-semibold text-foreground">Lab Reservation</span>
                        <span className="text-sm text-muted-foreground">The Global College</span>
                    </div>
                </div>
            </div>

            {/* Auth Card */}
            <div className="w-full max-w-md">
                {children}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-muted-foreground">
                <p>Book your lab sessions with ease</p>
            </div>
        </div>
    )
}