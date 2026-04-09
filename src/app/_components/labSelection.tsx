import { ArrowRight, Atom, Dna, FlaskConical, Microscope, Orbit } from "lucide-react";
import React, { useState } from "react";

const LabSelection = ({
	setLab,
}: {
	setLab: React.Dispatch<React.SetStateAction<null | "physics" | "biology">>;
}) => {
	const [hoveredLab, setHoveredLab] = useState<null | "physics" | "biology">(null);

	return (
		<div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-12 relative overflow-hidden transition-colors duration-1000">
			{/* Dynamic Backgrounds */}
			{/* Physics Background */}
			<div 
				className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${hoveredLab === 'physics' ? 'opacity-100' : 'opacity-0'}`}
			>
				<div className="absolute -top-[50%] -left-[20%] h-[150%] w-[100%] rounded-full bg-blue-600/10 blur-[150px] animate-pulse duration-[4000ms]" />
				<div className="absolute right-[10%] top-[20%] h-[60%] w-[40%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse duration-[5000ms]" />
				{/* Background patterns */}
				<div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />
			</div>

			{/* Biology Background */}
			<div 
				className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${hoveredLab === 'biology' ? 'opacity-100' : 'opacity-0'}`}
			>
				<div className="absolute -top-[20%] -right-[20%] h-[150%] w-[100%] rounded-full bg-lime-600/10 blur-[150px] animate-pulse duration-[4000ms]" />
				<div className="absolute left-[10%] bottom-[20%] h-[60%] w-[40%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse duration-[5000ms]" />
				{/* Background patterns */}
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(101,163,13,0.05)_2px,transparent_2px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />
			</div>

			{/* Default subtle background */}
			<div className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${hoveredLab === null ? 'opacity-100' : 'opacity-0'}`}>
				<div className="absolute -top-[40%] -left-[20%] h-[80%] w-[60%] rounded-full bg-blue-500/5 blur-[120px] dark:bg-blue-500/10" />
				<div className="absolute -right-[20%] -bottom-[40%] h-[80%] w-[60%] rounded-full bg-lime-500/5 blur-[120px] dark:bg-lime-500/10" />
			</div>

			<div className="relative z-10 mb-10 text-center max-w-2xl">
				<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 mb-4">
					<span className="text-sm font-medium text-primary">Lab Access Portal</span>
				</div>
				<h1 className="font-semibold text-3xl tracking-tight text-foreground">
					Select your environment
				</h1>
				<p className="mt-2 text-muted-foreground leading-relaxed">
					Choose a specialized laboratory to manage reservations, equipment requests, and student attendance sessions.
				</p>
			</div>

			<div className="relative z-10 grid w-full max-w-4xl gap-6 md:grid-cols-2">
				{/* Physics & Chemistry Lab Card */}
				<button
					type="button"
					className={`group relative cursor-pointer overflow-hidden rounded-[2rem] border border-blue-500/20 bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#3b82f6] p-8 text-left text-white shadow-xl transition-all duration-700 hover:-translate-y-1 hover:shadow-blue-500/25 ${hoveredLab === 'biology' ? 'scale-95 opacity-50 grayscale-[50%]' : 'scale-100 opacity-100'}`}
					onClick={() => setLab("physics")}
					onMouseEnter={() => setHoveredLab("physics")}
					onMouseLeave={() => setHoveredLab(null)}
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
						<div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 mb-4">
							<Atom className="h-5 w-5 text-blue-100" />
						</div>
						<div className="text-blue-200 text-xs font-semibold uppercase tracking-[0.2em]">
							Facility 01
						</div>
						<div className="mt-1 font-semibold text-2xl leading-tight">
							Physics &<br />Chemistry
						</div>
						<div className="mt-3 text-sm text-blue-100/70 line-clamp-2">
							Advanced equipment for physical sciences and chemical analysis.
						</div>
						<div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-medium text-sm backdrop-blur-md transition-colors group-hover:bg-white/20">
							Initialize Session
							<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
						</div>
					</div>
				</button>

				{/* Biology Lab Card */}
				<button
					type="button"
					className={`group relative cursor-pointer overflow-hidden rounded-[2rem] border border-lime-500/20 bg-gradient-to-br from-[#064e3b] via-[#166534] to-[#65a30d] p-8 text-left text-white shadow-xl transition-all duration-700 hover:-translate-y-1 hover:shadow-lime-500/25 ${hoveredLab === 'physics' ? 'scale-95 opacity-50 grayscale-[50%]' : 'scale-100 opacity-100'}`}
					onClick={() => setLab("biology")}
					onMouseEnter={() => setHoveredLab("biology")}
					onMouseLeave={() => setHoveredLab(null)}
				>
					{/* Thematic Background Elements */}
					<div className="absolute inset-0 opacity-10">
						<Dna className="absolute top-10 right-10 h-56 w-56 text-white rotate-12" />
						<Microscope className="absolute -bottom-10 -left-10 h-48 w-48 text-white" />
					</div>

					{/* Ambient Glow */}
					<div className="-translate-y-1/2 absolute top-0 right-0 h-64 w-64 translate-x-1/3 rounded-full bg-lime-400/30 blur-3xl transition-transform duration-700 group-hover:scale-110" />
					
					<div className="relative z-10">
						<div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 mb-4">
							<Dna className="h-5 w-5 text-lime-100" />
						</div>
						<div className="text-lime-200 text-xs font-semibold uppercase tracking-[0.2em]">
							Facility 02
						</div>
						<div className="mt-1 font-semibold text-2xl leading-tight">
							Biology &<br />Life Sciences
						</div>
						<div className="mt-3 text-sm text-lime-100/70 line-clamp-2">
							Microscopy and biological sample analysis workstations.
						</div>
						<div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-medium text-sm backdrop-blur-md transition-colors group-hover:bg-white/20">
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
