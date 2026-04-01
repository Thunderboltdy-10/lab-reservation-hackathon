"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Lab from "../_components/lab";
import LabSelection from "../_components/labSelection";

export default function Labs() {
	const [lab, setLab] = useState<null | "physics" | "biology">(null);

	const router = useRouter();

	useEffect(() => {
		if (lab === null) return;
		router.push(`/lab/${lab}`);
	}, [lab, router]);

	return <LabSelection setLab={setLab} />;
}
