"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
	HTMLTextAreaElement,
	React.ComponentProps<"textarea">
>(({ className, onInput, ...props }, ref) => {
	const internalRef = React.useRef<HTMLTextAreaElement>(null);

	const resize = React.useCallback(() => {
		if (!internalRef.current) return;
		internalRef.current.style.height = "auto";
		internalRef.current.style.height = `${internalRef.current.scrollHeight}px`;
	}, []);

	React.useEffect(() => {
		resize();
	}, [resize]);

	return (
		<textarea
			ref={(element) => {
				internalRef.current = element;
				if (typeof ref === "function") {
					ref(element);
				} else if (ref) {
					(ref as React.MutableRefObject<HTMLTextAreaElement | null>).current =
						element;
				}
			}}
			data-slot="textarea"
			className={cn(
				"flex min-h-16 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
				className,
			)}
			onInput={(event) => {
				resize();
				onInput?.(event);
			}}
			{...props}
		/>
	);
});
Textarea.displayName = "Textarea";

export { Textarea };
