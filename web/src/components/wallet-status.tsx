'use client'

import { useAppKitAccount } from '@reown/appkit/react'
import { useState, useEffect } from 'react'

export function WalletStatus() {
  const { status, isConnected } = useAppKitAccount()
  const [isMounted, setIsMounted] = useState(false)
  
  // Prevent hydration errors
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  if (!isMounted) {
    return (
      <div className="h-10 rounded-full border px-3 flex items-center gap-1.5 bg-background">
        <div className="h-2 w-2 rounded-full bg-gray-400"></div>
        <span className="text-xs font-medium">Loading...</span>
      </div>
    )
  }
  
  // Define status styles based on current connection state
  let statusColor = "bg-gray-400" // default: not connected
  let statusText = "Not Connected"
  let statusBg = "bg-background hover:bg-gray-100 dark:hover:bg-gray-800"
  
  if (isConnected) {
    statusColor = "bg-green-500"
    statusText = "Connected"
    statusBg = "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
  } else if (status === 'connecting' || status === 'reconnecting') {
    statusColor = "bg-yellow-500"
    statusText = "Pending..."
    statusBg = "bg-yellow-50 dark:bg-yellow-900/20"
  }
  
  return (
    <div className={`h-10 rounded-full border border-gray-200 dark:border-gray-800 px-3 flex items-center gap-1.5 transition-colors ${statusBg}`}>
      <div className={`h-2 w-2 rounded-full ${statusColor} ${status === 'connecting' || status === 'reconnecting' ? 'animate-pulse' : ''}`}></div>
      <span className="text-xs font-medium">{statusText}</span>
    </div>
  )
} 