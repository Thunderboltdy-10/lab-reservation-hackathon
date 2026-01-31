import React from 'react'
import { ArrowRight } from "lucide-react"

const LabSelection = ({setLab}: {setLab: React.Dispatch<React.SetStateAction<null | "physics" | "biology">>}) => {

    return (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-semibold">Choose your lab</h1>
                <p className="mt-2 text-muted-foreground">
                    Pick a lab to view availability, equipment, and upcoming sessions.
                </p>
            </div>
            <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
                <button
                    type="button"
                    className="group relative cursor-pointer overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 p-6 text-left text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
                    onClick={() => setLab("physics")}
                >
                    <div className="absolute right-0 top-0 h-28 w-28 -translate-y-6 translate-x-10 rounded-full bg-white/10 blur-2xl" />
                    <div className="text-xs uppercase tracking-[0.3em] text-blue-100">Physics / Chemistry</div>
                    <div className="mt-4 text-4xl font-semibold">Physics & Chemistry Lab</div>
                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">
                        Enter lab
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                </button>
                <button
                    type="button"
                    className="group relative cursor-pointer overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-emerald-900 via-emerald-800 to-lime-600 p-6 text-left text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
                    onClick={() => setLab("biology")}
                >
                    <div className="absolute right-0 top-0 h-28 w-28 -translate-y-6 translate-x-10 rounded-full bg-white/10 blur-2xl" />
                    <div className="text-xs uppercase tracking-[0.3em] text-emerald-100">Biology</div>
                    <div className="mt-4 text-4xl font-semibold">Biology Lab</div>
                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">
                        Enter lab
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                </button>
            </div>
        </div>
    )
}

export default LabSelection
