"use client"
import Lab from "../_components/lab";
import { useEffect, useState } from "react";
import LabSelection from "../_components/labSelection";
import { useRouter } from "next/navigation";

export default function Labs() {
    const [lab, setLab] = useState<null | "physics" | "biology">(null)

    const router = useRouter();

    useEffect(() => {
        if (lab === null) return
        console.log(lab)
        router.push("/lab/"+lab)
    }, [lab])

    return (
        <LabSelection setLab={setLab}/>
    )
}