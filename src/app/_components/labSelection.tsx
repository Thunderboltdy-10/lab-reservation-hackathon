import {
	ArrowRight,
	Atom,
	Dna,
	FlaskConical,
	Microscope,
	Orbit,
	type LucideIcon,
} from "lucide-react";
import React, { useState } from "react";

type LabKey = "physics" | "biology";

type LabCardProps = {
	id: LabKey;
	dimWhen: LabKey;
	primaryIcon: LucideIcon;
	backgroundIcons: React.ReactNode;
	facilityLabel: string;
	title: React.ReactNode;
	description: string;
	cardClassName: string;
	facilityClassName: string;
	iconClassName: string;
	descriptionClassName: string;
	glowClassName: string;
	hoveredLab: LabKey | null;
	setHoveredLab: React.Dispatch<React.SetStateAction<LabKey | null>>;
	onClick: () => void;
};

const LabCard = ({
	id,
	dimWhen,
	primaryIcon: PrimaryIcon,
	backgroundIcons,
	facilityLabel,
	title,
	description,
	cardClassName,
	facilityClassName,
	iconClassName,
	descriptionClassName,
	glowClassName,
	hoveredLab,
	setHoveredLab,
	onClick,
}: LabCardProps) => (
	<button
		type="button"
		className={`group relative cursor-pointer overflow-hidden rounded-[2rem] border p-8 text-left text-white shadow-xl transition-all duration-700 hover:-translate-y-1 ${cardClassName} ${hoveredLab === dimWhen ? "scale-95 opacity-50 grayscale-[50%]" : "scale-100 opacity-100"}`}
		onClick={onClick}
		onMouseEnter={() => setHoveredLab(id)}
		onMouseLeave={() => setHoveredLab(null)}
		onFocus={() => setHoveredLab(id)}
		onBlur={() => setHoveredLab(null)}
	>
		<div className="absolute inset-0 opacity-10">{backgroundIcons}</div>
		<div className={`-translate-y-1/2 absolute top-0 right-0 h-64 w-64 translate-x-1/3 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-110 ${glowClassName}`} />

		<div className="relative z-10">
			<div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md">
				<PrimaryIcon className={`h-5 w-5 ${iconClassName}`} />
			</div>
			<div className={`text-xs font-semibold uppercase tracking-[0.2em] ${facilityClassName}`}>
				{facilityLabel}
			</div>
			<div className="mt-1 font-semibold text-2xl leading-tight">{title}</div>
			<div className={`mt-3 line-clamp-2 text-sm ${descriptionClassName}`}>
				{description}
			</div>
			<div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-medium text-sm backdrop-blur-md transition-colors group-hover:bg-white/20">
				Initialize Session
				<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
			</div>
		</div>
	</button>
);

const LabSelection = ({
	setLab,
}: {
	setLab: React.Dispatch<React.SetStateAction<null | "physics" | "biology">>;
}) => {
	const [hoveredLab, setHoveredLab] = useState<LabKey | null>(null);

	return (
		<div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-6 py-12 transition-colors duration-1000">
			<div
				className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${hoveredLab === "physics" ? "opacity-100" : "opacity-0"}`}
			>
				<div className="motion-safe:animate-pulse motion-reduce:animate-none absolute -top-[50%] -left-[20%] h-[150%] w-[100%] rounded-full bg-blue-600/10 blur-[150px] duration-[4000ms]" />
				<div className="motion-safe:animate-pulse motion-reduce:animate-none absolute right-[10%] top-[20%] h-[60%] w-[40%] rounded-full bg-indigo-500/10 blur-[120px] duration-[5000ms]" />
				<div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />
			</div>

			<div
				className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${hoveredLab === "biology" ? "opacity-100" : "opacity-0"}`}
			>
				<div className="motion-safe:animate-pulse motion-reduce:animate-none absolute -top-[20%] -right-[20%] h-[150%] w-[100%] rounded-full bg-lime-600/10 blur-[150px] duration-[4000ms]" />
				<div className="motion-safe:animate-pulse motion-reduce:animate-none absolute left-[10%] bottom-[20%] h-[60%] w-[40%] rounded-full bg-emerald-500/10 blur-[120px] duration-[5000ms]" />
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(101,163,13,0.05)_2px,transparent_2px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />
			</div>

			<div
				className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${hoveredLab === null ? "opacity-100" : "opacity-0"}`}
			>
				<div className="absolute -top-[40%] -left-[20%] h-[80%] w-[60%] rounded-full bg-blue-500/5 blur-[120px] dark:bg-blue-500/10" />
				<div className="absolute -right-[20%] -bottom-[40%] h-[80%] w-[60%] rounded-full bg-lime-500/5 blur-[120px] dark:bg-lime-500/10" />
			</div>

			<div className="relative z-10 mb-10 max-w-2xl text-center">
				<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5">
					<span className="text-sm font-medium text-primary">Lab Access Portal</span>
				</div>
				<h1 className="font-semibold text-3xl tracking-tight text-foreground">
					Select your environment
				</h1>
				<p className="mt-2 leading-relaxed text-muted-foreground">
					Choose a specialized laboratory to manage reservations, equipment requests, and student attendance sessions.
				</p>
			</div>

			<div className="relative z-10 grid w-full max-w-4xl gap-6 md:grid-cols-2">
				<LabCard
					id="physics"
					dimWhen="biology"
					primaryIcon={Atom}
					backgroundIcons={
						<>
							<Atom className="absolute -top-10 -left-10 h-64 w-64 animate-spin-slow text-white duration-[30000ms]" />
							<Orbit className="absolute bottom-10 right-10 h-40 w-40 text-white" />
							<FlaskConical className="absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 text-white blur-sm" />
						</>
					}
					facilityLabel="Facility 01"
					title={
						<>
							Physics &<br />
							Chemistry
						</>
					}
					description="Advanced equipment for physical sciences and chemical analysis."
					cardClassName="border-blue-500/20 bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#3b82f6] hover:shadow-blue-500/25"
					facilityClassName="text-blue-200"
					iconClassName="text-blue-100"
					descriptionClassName="text-blue-100/70"
					glowClassName="bg-blue-400/30"
					hoveredLab={hoveredLab}
					setHoveredLab={setHoveredLab}
					onClick={() => setLab("physics")}
				/>

				<LabCard
					id="biology"
					dimWhen="physics"
					primaryIcon={Dna}
					backgroundIcons={
						<>
							<Dna className="absolute top-10 right-10 h-56 w-56 rotate-12 text-white" />
							<Microscope className="absolute -bottom-10 -left-10 h-48 w-48 text-white" />
						</>
					}
					facilityLabel="Facility 02"
					title={
						<>
							Biology &<br />
							Life Sciences
						</>
					}
					description="Microscopy and biological sample analysis workstations."
					cardClassName="border-lime-500/20 bg-gradient-to-br from-[#064e3b] via-[#166534] to-[#65a30d] hover:shadow-lime-500/25"
					facilityClassName="text-lime-200"
					iconClassName="text-lime-100"
					descriptionClassName="text-lime-100/70"
					glowClassName="bg-lime-400/30"
					hoveredLab={hoveredLab}
					setHoveredLab={setHoveredLab}
					onClick={() => setLab("biology")}
				/>
			</div>
		</div>
	);
};

export default LabSelection;
