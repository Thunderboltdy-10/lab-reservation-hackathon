import { Beaker, Microscope, Orbit } from "lucide-react";

export default function clerkLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center bg-[#09090b] overflow-hidden p-4">
			{/* Immersive background elements */}
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
			<div className="absolute top-0 right-0 -translate-y-[10%] translate-x-[30%] h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
			<div className="absolute bottom-0 left-0 translate-y-[20%] -translate-x-[20%] h-[600px] w-[600px] rounded-full bg-lime-600/20 blur-[150px] pointer-events-none" />
			
			<div className="absolute top-20 left-20 hidden md:block text-white/5 animate-spin-slow duration-[40000ms]">
				<Orbit size={180} />
			</div>
			<div className="absolute bottom-20 right-32 hidden md:block text-white/5 -rotate-12">
				<Microscope size={220} />
			</div>
			<div className="absolute top-40 right-40 hidden lg:block text-white/5">
				<Beaker size={140} />
			</div>

			<div className="relative z-10 w-full max-w-md flex flex-col items-center">
				{/* TGC Branding */}
				<div className="mb-10 flex flex-col items-center gap-4">
					<div className="relative group">
						<div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-lime-400 to-blue-500 blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
						<div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-black border border-white/10 shadow-2xl">
							<span className="font-bold text-white text-2xl tracking-tighter">
								TGC
							</span>
						</div>
					</div>
					<div className="flex flex-col text-center">
						<h1 className="font-bold text-white text-3xl tracking-tight">
							Lab Access
						</h1>
						<p className="text-zinc-400 text-sm mt-1 uppercase tracking-[0.2em] font-medium">
							The Global College
						</p>
					</div>
				</div>

				{/* Auth Card Container */}
				<div className="w-full relative">
					<div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent blur-sm pointer-events-none" />
					<div className="relative bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
						{children}
					</div>
				</div>

				{/* Footer */}
				<div className="mt-10 text-center text-zinc-500 text-sm font-medium">
					<p>Secure authentication for laboratory environments</p>
				</div>
			</div>
		</div>
	);
}
