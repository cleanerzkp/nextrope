"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // After mounting, we can safely show the UI that depends on the theme
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder with the same dimensions to prevent layout shift
    return (
      <div className="h-10 w-[140px] rounded-full border bg-background"></div>
    )
  }

  return (
    <div className="relative flex h-10 items-center rounded-full border p-1.5 gap-2">
      {/* System option */}
      <button
        className={cn(
          "relative flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          theme === "system" ? "bg-gray-200 dark:bg-gray-700" : "hover:bg-muted"
        )}
        onClick={() => setTheme("system")}
        aria-label="System theme"
      >
        <Monitor className="h-4 w-4" />
      </button>
      
      {/* Light option */}
      <button
        className={cn(
          "relative flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          theme === "light" ? "bg-white text-black" : "hover:bg-muted"
        )}
        onClick={() => setTheme("light")}
        aria-label="Light theme"
      >
        <Sun className="h-4 w-4" />
      </button>
      
      {/* Dark option */}
      <button
        className={cn(
          "relative flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          theme === "dark" ? "bg-gray-900 text-white" : "hover:bg-muted"
        )}
        onClick={() => setTheme("dark")}
        aria-label="Dark theme"
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  )
} 