import { Beaker, Microscope, Orbit } from "lucide-react";
import Image from "next/image";

export default function clerkLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center bg-background overflow-hidden p-4">
			{/* Immersive background elements */}
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
			<div className="absolute top-0 right-0 -translate-y-[10%] translate-x-[30%] h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
			<div className="absolute bottom-0 left-0 translate-y-[20%] -translate-x-[20%] h-[600px] w-[600px] rounded-full bg-lime-600/20 blur-[150px] pointer-events-none" />
			
			<div className="absolute top-20 left-20 hidden md:block text-foreground/5 animate-spin-slow duration-[40000ms]">
				<Orbit size={180} />
			</div>
			<div className="absolute bottom-20 right-32 hidden md:block text-foreground/5 -rotate-12">
				<Microscope size={220} />
			</div>
			<div className="absolute top-40 right-40 hidden lg:block text-foreground/5">
				<Beaker size={140} />
			</div>

			<div className="relative z-10 w-full max-w-md flex flex-col items-center">
				{/* TGC Branding */}
				<div className="mb-8 flex flex-col items-center gap-4">
					<Image
						src="/logo.png"
						alt="TGC"
						width={220}
						height={220}
						className="rounded-lg"
						priority
					/>
					<div className="flex flex-col text-center">
						<h1 className="font-bold text-foreground text-3xl tracking-tight">
							Lab Access
						</h1>
						<p className="text-muted-foreground text-sm mt-1 uppercase tracking-[0.2em] font-medium">
							The Global College
						</p>
					</div>
				</div>

				{children}

				{/* Footer */}
				<div className="mt-10 text-center text-muted-foreground text-sm font-medium">
					<p>Secure authentication for laboratory environments</p>
				</div>
			</div>
		</div>
	);
}