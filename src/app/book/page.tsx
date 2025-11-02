"use client"
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LabSelection from "../_components/labSelection";

export default function Book() {
    const [lab, setLab] = useState<null | "physics" | "biology">(null)

    const router = useRouter();

    useEffect(() => {
        if (lab === null) return
        console.log(lab)
        router.push("/book/"+lab)
    }, [lab])

    return (
        <LabSelection setLab={setLab}/>
    )
}