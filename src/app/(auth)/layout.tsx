export default function clerkLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className="flex justify-center align-middle h-screen">
            <div className="m-auto">
                {children}
            </div>
        </div>
    )
}