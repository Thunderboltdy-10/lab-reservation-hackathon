import { ArrowRight } from "lucide-react";
import type React from "react";

const LabSelection = ({
	setLab,
}: {
	setLab: React.Dispatch<React.SetStateAction<null | "physics" | "biology">>;
}) => {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
			<div className="mb-10 text-center">
				<h1 className="font-semibold text-4xl">Choose your lab</h1>
				<p className="mt-2 text-muted-foreground">
					Pick a lab to view availability, equipment, and upcoming sessions.
				</p>
			</div>
			<div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
				<button
					type="button"
					className="group hover:-translate-y-1 relative cursor-pointer overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 p-6 text-left text-white shadow-lg transition hover:shadow-xl"
					onClick={() => setLab("physics")}
				>
					<div className="-translate-y-6 absolute top-0 right-0 h-28 w-28 translate-x-10 rounded-full bg-white/10 blur-2xl" />
					<div className="text-blue-100 text-xs uppercase tracking-[0.3em]">
						Physics / Chemistry
					</div>
					<div className="mt-4 font-semibold text-4xl">
						Physics & Chemistry Lab
					</div>
					<div className="mt-6 inline-flex items-center gap-2 font-semibold text-sm">
						Enter lab
						<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
					</div>
				</button>
				<button
					type="button"
					className="group hover:-translate-y-1 relative cursor-pointer overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-emerald-900 via-emerald-800 to-lime-600 p-6 text-left text-white shadow-lg transition hover:shadow-xl"
					onClick={() => setLab("biology")}
				>
					<div className="-translate-y-6 absolute top-0 right-0 h-28 w-28 translate-x-10 rounded-full bg-white/10 blur-2xl" />
					<div className="text-emerald-100 text-xs uppercase tracking-[0.3em]">
						Biology
					</div>
					<div className="mt-4 font-semibold text-4xl">Biology Lab</div>
					<div className="mt-6 inline-flex items-center gap-2 font-semibold text-sm">
						Enter lab
						<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
					</div>
				</button>
			</div>
		</div>
	);
};

export default LabSelection;
