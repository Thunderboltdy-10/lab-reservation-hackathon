"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, onInput, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null)

    const resize = React.useCallback(() => {
      if (!internalRef.current) return
      internalRef.current.style.height = "auto"
      internalRef.current.style.height = `${internalRef.current.scrollHeight}px`
    }, [])

    React.useEffect(() => {
      resize()
    }, [resize])

    return (
      <textarea
        ref={(element) => {
          internalRef.current = element;
          if (typeof ref === "function") {
            ref(element);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = element;
          }
        }}
        data-slot="textarea"
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex min-h-16 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        onInput={(event) => {
          resize()
          onInput?.(event)
        }}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
