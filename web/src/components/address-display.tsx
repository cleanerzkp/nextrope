import { Copy } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface AddressDisplayProps {
  address: string;
  name?: string;
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  withCopy?: boolean;
}

export function AddressDisplay({
  address,
  name,
  label,
  size = "md",
  withCopy = false,
}: AddressDisplayProps) {
  // Format the address for display
  const formattedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  // Map size to avatar size in pixels
  const avatarSizeMap: Record<string, number> = {
    xs: 16,
    sm: 24,
    md: 32,
    lg: 40,
  };
  const avatarSize = avatarSizeMap[size];
  
  // Handle copying address to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    } catch (error) {
      console.error("Failed to copy address:", error);
      toast.error("Failed to copy address");
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <UserAvatar address={address} size={avatarSize} />
      
      <div>
        {label && <p className="text-xs text-muted-foreground">{label}</p>}
        
        {name ? (
          <div>
            <p className="font-medium text-sm">{name}</p>
            <p className="text-xs text-muted-foreground">{formattedAddress}</p>
          </div>
        ) : (
          <p className="font-medium text-sm">{formattedAddress}</p>
        )}
      </div>
      
      {withCopy && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCopy}
          title="Copy address"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
} 