import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NavBar } from "@/components/nav-bar";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      
      <main className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center text-center mt-12 mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4">
            Secure Escrow for Digital & Physical Assets
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-[800px] mb-8">
            Buy and sell confidently with blockchain-powered escrow protection and dispute resolution
          </p>
          <div className="flex gap-4">
            <Link href="/create">
              <Button size="lg">Create Escrow</Button>
            </Link>
            <Link href="/learn">
              <Button variant="outline" size="lg">Learn More</Button>
            </Link>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Secure Escrow</CardTitle>
              <CardDescription>Protection for both buyers and sellers</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p>Smart contracts secure funds until both parties are satisfied with the transaction.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Dispute Resolution</CardTitle>
              <CardDescription>Fair resolution of conflicts</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p>Trusted arbitrators help resolve disputes when parties cannot agree.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Multi-Token Support</CardTitle>
              <CardDescription>Flexible payment options</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p>Support for ETH and ERC-20 tokens for all your transaction needs.</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-24 mb-12 text-center">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <div className="grid gap-6 md:grid-cols-3 mt-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold mb-4">1</div>
              <h3 className="text-xl font-medium mb-2">Create Escrow</h3>
              <p className="text-muted-foreground">Seller creates an escrow and sets terms</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold mb-4">2</div>
              <h3 className="text-xl font-medium mb-2">Buyer Deposits</h3>
              <p className="text-muted-foreground">Buyer agrees to terms and deposits funds</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold mb-4">3</div>
              <h3 className="text-xl font-medium mb-2">Release Funds</h3>
              <p className="text-muted-foreground">Funds released after transaction completion</p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="border-t py-6 md:py-8">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} NextTrope. All rights reserved.
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/terms">
              <Button variant="ghost" size="sm">
                Terms
              </Button>
            </Link>
            <Link href="/privacy">
              <Button variant="ghost" size="sm">
                Privacy
              </Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
