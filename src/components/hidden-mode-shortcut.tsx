"use client"

import { useEffect } from "react"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"

export function HiddenModeShortcut() {
    const { toggleHiddenMode } = useHiddenMode()

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // Ignore repeated key events (key held down)
            if (e.repeat) return
            // Ctrl+. or Cmd+. (macOS)
            if ((e.ctrlKey || e.metaKey) && e.key === ".") {
                e.preventDefault()
                toggleHiddenMode()
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleHiddenMode])

    return null
}
