import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface UserAvatarProps {
  address: string;
  name?: string;
  size?: number;
  className?: string;
}

export function UserAvatar({
  address,
  name,
  size = 32,
  className,
}: UserAvatarProps) {
  // Generate initials from name or address
  const initials = useMemo(() => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    
    // Use first and last characters of the address (without 0x)
    const addr = address.slice(2);
    return `${addr[0]}${addr[addr.length - 1]}`.toUpperCase();
  }, [address, name]);
  
  // Generate a unique color based on the address
  const bgColor = useMemo(() => {
    // Simple hash function
    const hash = address
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
    
    return `hsl(${hash}, 70%, 90%)`;
  }, [address]);
  
  const textColor = useMemo(() => {
    // Simple hash function
    const hash = address
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
    
    return `hsl(${hash}, 80%, 30%)`;
  }, [address]);
  
  // Generate a unique avatar URL based on address
  const avatarUrl = `https://effigy.im/a/${address}.svg`;
  
  const sizeStyles = {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${Math.max(size / 2.5, 12)}px`,
  };
  
  return (
    <Avatar 
      className={cn(className)} 
      style={sizeStyles}
    >
      <AvatarImage src={avatarUrl} alt={name || address} />
      <AvatarFallback 
        style={{ 
          backgroundColor: bgColor,
          color: textColor,
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
} 