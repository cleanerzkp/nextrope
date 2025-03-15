'use client'

import { NavBar } from "@/components/nav-bar";
import { useAppKitAccount } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";

export default function Profile() {
  const { isConnected, address } = useAppKitAccount();
  const [copied, setCopied] = useState(false);
  
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Mock user data
  const userData = {
    username: 'CryptoUser',
    joinedDate: 'May 2023',
    totalEscrows: 12,
    activeEscrows: 3,
    completedEscrows: 8,
    disputedEscrows: 1,
    reputation: 4.8,
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      
      <main className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>
        
        {!isConnected ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect Wallet</CardTitle>
              <CardDescription>
                Please connect your wallet to view your profile
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Account Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Wallet Address</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : '0x...'}
                      </code>
                      <Button size="icon" variant="ghost" onClick={copyAddress}>
                        {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Username</span>
                    <span className="font-medium">{userData.username}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Joined</span>
                    <span className="font-medium">{userData.joinedDate}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Reputation</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{userData.reputation}/5.0</span>
                      <div className="flex">
                        {Array(5).fill(0).map((_, i) => (
                          <svg 
                            key={i}
                            className={`h-4 w-4 ${i < Math.floor(userData.reputation) ? 'text-yellow-500' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 p-4 rounded-lg text-center">
                      <span className="text-3xl font-bold block">{userData.totalEscrows}</span>
                      <span className="text-sm text-muted-foreground">Total Escrows</span>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg text-center">
                      <span className="text-3xl font-bold block">{userData.activeEscrows}</span>
                      <span className="text-sm text-muted-foreground">Active</span>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg text-center">
                      <span className="text-3xl font-bold block">{userData.completedEscrows}</span>
                      <span className="text-sm text-muted-foreground">Completed</span>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg text-center">
                      <span className="text-3xl font-bold block">{userData.disputedEscrows}</span>
                      <span className="text-sm text-muted-foreground">Disputed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Tabs defaultValue="settings" className="mt-6">
              <TabsList>
                <TabsTrigger value="settings">Profile Settings</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>
              <TabsContent value="settings" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Settings</CardTitle>
                    <CardDescription>
                      Update your profile information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input id="username" defaultValue={userData.username} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" placeholder="your@email.com" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea 
                          id="bio" 
                          placeholder="Tell us a bit about yourself"
                          rows={4}
                        />
                      </div>
                    </form>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button>Save Changes</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              <TabsContent value="preferences" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Manage how you receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Email Notifications</h3>
                          <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                        </div>
                        <div className="flex items-center h-6">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            defaultChecked
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Push Notifications</h3>
                          <p className="text-sm text-muted-foreground">Receive notifications in-browser</p>
                        </div>
                        <div className="flex items-center h-6">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            defaultChecked
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Marketing Updates</h3>
                          <p className="text-sm text-muted-foreground">Receive marketing updates about the platform</p>
                        </div>
                        <div className="flex items-center h-6">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button>Save Preferences</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
} 