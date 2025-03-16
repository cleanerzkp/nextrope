'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEscrowStats } from '@/lib/hooks'
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { getEscrowStateName } from '@/lib/utils'

// Define chart colors using CSS variables instead of hardcoded colors
const CHART_COLORS = {
  "0": "var(--color-state-0)", // Awaiting Payment
  "1": "var(--color-state-1)", // Awaiting Delivery
  "2": "var(--color-state-2)", // Shipped
  "3": "var(--color-state-3)", // Disputed
  "4": "var(--color-state-4)", // Completed
  "5": "var(--color-state-5)", // Refunded
  "6": "var(--color-state-6)", // Cancelled
}

export function EscrowCharts() {
  const [activeTab, setActiveTab] = useState('deals')
  const stats = useEscrowStats() || { 
    isLoading: true, 
    error: null, 
    stateDistribution: [], 
    tokenDistribution: [], 
    totalEscrows: 0,
    byToken: {},
    byState: {}
  }
  
  // If loading, show a skeleton
  if (stats.isLoading) {
    return (
      <div className="w-full py-8">
        <div className="container mx-auto max-w-6xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Platform Statistics</CardTitle>
              <CardDescription>Loading real-time blockchain data...</CardDescription>
            </CardHeader>
            <CardContent className="min-h-80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                <p className="text-sm text-muted-foreground">Fetching data from the blockchain</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  // If there's an error
  if (stats.error) {
    return (
      <div className="w-full py-8">
        <div className="container mx-auto max-w-6xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Platform Statistics</CardTitle>
              <CardDescription>Error loading data</CardDescription>
            </CardHeader>
            <CardContent className="min-h-80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <p className="text-red-500">Failed to load escrow statistics</p>
                <p className="text-sm text-muted-foreground">{stats.error.message}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Process data for charts
  const totalEscrows = stats.totalEscrows
  const stateDistribution = stats.stateDistribution.filter(item => item.value > 0)
  const tokenDistribution = stats.tokenDistribution || []
  
  // Define token colors - use CSS variables for better theming
  const TOKEN_COLORS = {
    'ETH': 'hsl(var(--chart-1))', // Use CSS variables
    'default1': 'hsl(var(--chart-2))',
    'default2': 'hsl(var(--chart-3))',
    'default3': 'hsl(var(--chart-4))',
    'default4': 'hsl(var(--chart-5))',
    'default5': 'hsl(var(--chart-1))',
  }
  
  // Get color for token
  const getTokenColor = (token: string, index: number) => {
    if (token === 'ETH') return TOKEN_COLORS.ETH
    // Use defaults in rotation if not specifically defined
    const defaults = ['default1', 'default2', 'default3', 'default4', 'default5']
    return TOKEN_COLORS[defaults[index % defaults.length] as keyof typeof TOKEN_COLORS]
  }
  
  const formatCount = (count: number, total: number) => {
    const percentage = Math.round((count / total) * 100)
    return `${count} (${percentage}%)`
  }
  
  // Create chart config for deals
  const dealsChartConfig: ChartConfig = {
    // Label for total escrows
    totalEscrows: {
      label: "Total Escrows",
      color: "hsl(var(--primary))",
    },
    // Add state configs
    ...Object.entries(CHART_COLORS).reduce((acc, [state, color]) => {
      acc[state] = {
        label: getEscrowStateName(Number(state)),
        color: color,
        formatter: (value: number) => { 
          const percentage = Math.round((value / totalEscrows) * 100)
          return `${value} (${percentage}%)` 
        }
      }
      return acc
    }, {} as ChartConfig)
  }
  
  // Create chart config for tokens
  const tokensChartConfig: ChartConfig = {
    // Label for token usage
    tokenUsage: {
      label: "Token Usage",
      color: "hsl(var(--primary))",
    },
    // Add token configs
    ...tokenDistribution.reduce((acc, item, index) => {
      acc[item.token] = {
        label: item.displayName,
        color: getTokenColor(item.token, index),
        formatter: (value: number) => { 
          const percentage = Math.round((value / totalEscrows) * 100)
          return `${value} (${percentage}%)` 
        }
      }
      return acc
    }, {} as ChartConfig)
  }
  
  return (
    <div className="w-full py-8 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Platform Statistics</CardTitle>
            <CardDescription>Real-time blockchain data from all escrows</CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList>
                <TabsTrigger value="deals">Escrow States</TabsTrigger>
                <TabsTrigger value="tokens">Token Usage</TabsTrigger>
              </TabsList>
              
              <TabsContent value="deals" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Escrow State Distribution</h3>
                    <div className="flex items-center mb-2">
                      <p className="text-4xl font-bold">{totalEscrows}</p>
                      <span className="ml-2 text-sm text-muted-foreground">Total Escrows</span>
                    </div>
                    
                    <div className="space-y-2 mt-6">
                      {stateDistribution.map(item => (
                        <div key={item.state} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: CHART_COLORS[String(item.state) as keyof typeof CHART_COLORS] }}
                            />
                            <span>{item.name}</span>
                          </div>
                          <span className="font-medium">{formatCount(item.value, totalEscrows)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="h-[300px] w-full">
                      <ChartContainer config={dealsChartConfig} className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <Pie
                              data={stateDistribution}
                              dataKey="value"
                              nameKey="state"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              label={(entry) => entry.name}
                              labelLine={false}
                              animationDuration={500}
                              animationBegin={200}
                            >
                              {stateDistribution.map((entry) => (
                                <Cell 
                                  key={entry.state} 
                                  fill={CHART_COLORS[String(entry.state) as keyof typeof CHART_COLORS]}
                                />
                              ))}
                            </Pie>
                            <ChartTooltip 
                              content={
                                <ChartTooltipContent 
                                  labelKey="totalEscrows" 
                                  nameKey="state" 
                                  indicator="dot"
                                />
                              } 
                            />
                            <ChartLegend content={<ChartLegendContent nameKey="state" />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="tokens" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Token Usage</h3>
                    <div className="flex items-center mb-2">
                      <p className="text-4xl font-bold">{tokenDistribution.length}</p>
                      <span className="ml-2 text-sm text-muted-foreground">Unique Tokens</span>
                    </div>
                    
                    <div className="space-y-2 mt-6">
                      {tokenDistribution.map((item, index) => (
                        <div key={item.token} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {item.logo ? (
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-background border flex items-center justify-center">
                                <img 
                                  src={item.logo} 
                                  alt={item.displayName} 
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    // Fallback if image fails to load
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }} 
                                />
                              </div>
                            ) : (
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: getTokenColor(item.token, index) }}
                              />
                            )}
                            <span className="font-mono text-xs truncate max-w-40">
                              {item.displayName}
                            </span>
                          </div>
                          <span className="font-medium">{formatCount(item.value, totalEscrows)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    {tokenDistribution.length > 0 ? (
                      <div className="h-[300px] w-full">
                        <ChartContainer config={tokensChartConfig} className="h-full w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                              <Pie
                                data={tokenDistribution}
                                dataKey="value"
                                nameKey="token"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                label={(entry) => entry.displayName}
                                labelLine={false}
                                animationDuration={500}
                                animationBegin={200}
                              >
                                {tokenDistribution.map((entry, index) => (
                                  <Cell 
                                    key={entry.token} 
                                    fill={getTokenColor(entry.token, index)}
                                  />
                                ))}
                              </Pie>
                              <ChartTooltip 
                                content={
                                  <ChartTooltipContent 
                                    labelKey="tokenUsage" 
                                    nameKey="token" 
                                    indicator="dot"
                                  />
                                } 
                              />
                              <ChartLegend content={<ChartLegendContent nameKey="token" />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                    ) : (
                      <div className="py-8 px-4 text-center">
                        <p className="text-lg font-medium text-muted-foreground">
                          No tokens have been used in escrows yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 