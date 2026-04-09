import { ArrowRight, Atom, Dna, FlaskConical, Microscope, Orbit } from "lucide-react";
import type React from "react";

const LabSelection = ({
	setLab,
}: {
	setLab: React.Dispatch<React.SetStateAction<null | "physics" | "biology">>;
}) => {
	return (
		<div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
			{/* Decorative background gradients */}
			<div className="pointer-events-none absolute -top-[40%] -left-[20%] h-[80%] w-[60%] rounded-full bg-blue-500/5 blur-[120px] dark:bg-blue-500/10" />
			<div className="pointer-events-none absolute -right-[20%] -bottom-[40%] h-[80%] w-[60%] rounded-full bg-lime-500/5 blur-[120px] dark:bg-lime-500/10" />

			<div className="relative z-10 mb-12 text-center max-w-2xl">
				<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 mb-6">
					<span className="text-sm font-medium text-primary">Lab Access Portal</span>
				</div>
				<h1 className="font-bold text-5xl tracking-tight lg:text-6xl text-foreground">
					Select your environment
				</h1>
				<p className="mt-6 text-lg text-muted-foreground leading-relaxed">
					Choose a specialized laboratory to manage reservations, equipment requests, and student attendance sessions.
				</p>
			</div>

			<div className="relative z-10 grid w-full max-w-5xl gap-8 md:grid-cols-2">
				{/* Physics & Chemistry Lab Card */}
				<button
					type="button"
					className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] border border-blue-500/20 bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#3b82f6] p-8 md:p-10 text-left text-white shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-blue-500/25"
					onClick={() => setLab("physics")}
				>
					{/* Thematic Background Elements */}
					<div className="absolute inset-0 opacity-10">
						<Atom className="absolute -top-10 -left-10 h-64 w-64 text-white animate-spin-slow duration-[30000ms]" />
						<Orbit className="absolute bottom-10 right-10 h-40 w-40 text-white" />
						<FlaskConical className="absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 text-white blur-sm" />
					</div>
					
					{/* Ambient Glow */}
					<div className="-translate-y-1/2 absolute top-0 right-0 h-64 w-64 translate-x-1/3 rounded-full bg-blue-400/30 blur-3xl transition-transform duration-700 group-hover:scale-110" />
					
					<div className="relative z-10">
						<div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-6">
							<Atom className="h-6 w-6 text-blue-100" />
						</div>
						<div className="text-blue-200 text-sm font-semibold uppercase tracking-[0.2em]">
							Facility 01
						</div>
						<div className="mt-2 font-bold text-4xl leading-tight">
							Physics &<br />Chemistry
						</div>
						<div className="mt-4 text-blue-100/70 line-clamp-2">
							Advanced equipment for physical sciences and chemical analysis.
						</div>
						<div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 font-medium text-sm backdrop-blur-md transition-colors group-hover:bg-white/20">
							Initialize Session
							<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
						</div>
					</div>
				</button>

				{/* Biology Lab Card */}
				<button
					type="button"
					className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] border border-lime-500/20 bg-gradient-to-br from-[#064e3b] via-[#166534] to-[#65a30d] p-8 md:p-10 text-left text-white shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-lime-500/25"
					onClick={() => setLab("biology")}
				>
					{/* Thematic Background Elements */}
					<div className="absolute inset-0 opacity-10">
						<Dna className="absolute top-10 right-10 h-56 w-56 text-white rotate-12" />
						<Microscope className="absolute -bottom-10 -left-10 h-48 w-48 text-white" />
					</div>

					{/* Ambient Glow */}
					<div className="-translate-y-1/2 absolute top-0 right-0 h-64 w-64 translate-x-1/3 rounded-full bg-lime-400/30 blur-3xl transition-transform duration-700 group-hover:scale-110" />
					
					<div className="relative z-10">
						<div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-6">
							<Dna className="h-6 w-6 text-lime-100" />
						</div>
						<div className="text-lime-200 text-sm font-semibold uppercase tracking-[0.2em]">
							Facility 02
						</div>
						<div className="mt-2 font-bold text-4xl leading-tight">
							Biology &<br />Life Sciences
						</div>
						<div className="mt-4 text-lime-100/70 line-clamp-2">
							Microscopy and biological sample analysis workstations.
						</div>
						<div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 font-medium text-sm backdrop-blur-md transition-colors group-hover:bg-white/20">
							Initialize Session
							<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
						</div>
					</div>
				</button>
			</div>
		</div>
	);
};

export default LabSelection;
