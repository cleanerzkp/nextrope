/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import * as React from "react"
import {
  Legend as RLegend,
  Tooltip as RTooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts"
import { cn, createShapeStyles, createVarStyles } from "@/lib/utils"

export type ChartColor = string | { light: string; dark: string }

export interface ChartConfigItem {
  label: string
  color: ChartColor
  icon?: React.ComponentType<{ className?: string }>
  formatter?: (value: any) => any
}

export type ChartConfig = Record<string, ChartConfigItem>

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config?: ChartConfig
  children: React.ReactNode
}

const ChartContext = React.createContext<{ config?: ChartConfig }>({})

export function ChartContainer({
  config,
  className,
  children,
  ...props
}: ChartContainerProps) {
  // Create CSS variables for each color in the config
  const style = React.useMemo(() => {
    if (!config) return {}
    return createVarStyles(config)
  }, [config])

  // Convert ReactNode children to ReactElement if possible
  const chartChildren = React.useMemo(() => {
    const childrenArray = React.Children.toArray(children);
    if (childrenArray.length > 0 && React.isValidElement(childrenArray[0])) {
      return childrenArray[0];
    }
    return null;
  }, [children]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn("chart", className)} style={style} {...props}>
        {chartChildren && (
          <ResponsiveContainer width="100%" height="100%">
            {chartChildren}
          </ResponsiveContainer>
        )}
      </div>
    </ChartContext.Provider>
  )
}

export function useChartConfig() {
  return React.useContext(ChartContext)
}

interface ChartTooltipProps
  extends Omit<TooltipProps<any, any>, "content" | "ref"> {
  content?: React.ReactNode
  indicator?: "dot" | "line" | "dashed"
  hideIndicator?: boolean
  labelKey?: string
  nameKey?: string
  hideLabel?: boolean
  formatter?: (value: any, name: string, entry: any) => any
}

export function ChartTooltip({
  content,
  // We're using these props in the ChartTooltipContent component
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  indicator = "dot",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hideIndicator,
  ...props
}: ChartTooltipProps) {
  return (
    <RTooltip
      cursor={{ opacity: 0 }}
      offset={10}
      allowEscapeViewBox={{ x: false, y: true }}
      content={content as any}
      isAnimationActive={false}
      {...props}
    />
  )
}

interface ChartTooltipContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  indicator?: "dot" | "line" | "dashed"
  hideIndicator?: boolean
  labelKey?: string
  nameKey?: string
  hideLabel?: boolean
}

export function ChartTooltipContent({
  className,
  indicator = "dot",
  hideIndicator,
  labelKey,
  nameKey,
  hideLabel,
  ...props
}: ChartTooltipContentProps) {
  const { config } = useChartConfig()
  const payload = (props as any)?.payload
  const label = (props as any)?.label

  if (!payload?.length) {
    return null
  }

  // Extract payload names
  const names = payload.map((item: any) => {
    if (nameKey) {
      return nameKey === "key"
        ? item?.dataKey
        : item?.payload?.[nameKey] || item?.dataKey
    }
    return item?.dataKey
  })

  // Create CSS variables for shapes
  const itemStyles = createShapeStyles(names)

  // Extract label
  const tooltipLabel = (() => {
    if (!labelKey || !config) return label
    const labelConfig = config?.[labelKey]
    return labelConfig?.label || label
  })()

  return (
    <div
      className={cn(
        "rounded-lg border bg-background px-3 py-2 shadow-sm",
        className
      )}
      {...props}
    >
      {!hideLabel && tooltipLabel ? (
        <div className="mb-1 font-medium">{tooltipLabel}</div>
      ) : null}
      <div className="grid gap-0.5">
        {payload.map((item: any) => {
          const key = item?.dataKey
          const itemName = (() => {
            if (nameKey) {
              return nameKey === "key"
                ? key
                : item?.payload?.[nameKey] || key
            }
            return key
          })()

          // Extract name and color
          const displayName = config?.[itemName]?.label || itemName
          const value = config?.[itemName]?.formatter
            ? config?.[itemName]?.formatter(item.value)
            : item.value

          return (
            <div
              key={`item-${key}`}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1">
                {!hideIndicator ? (
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      indicator === "line" &&
                        "h-px w-4 rounded-none bg-[--color]",
                      indicator === "dashed" &&
                        "h-px w-4 rounded-none bg-[--color] [mask-image:linear-gradient(to_right,black_33%,transparent_33%)] [mask-size:3px_100%]"
                    )}
                    style={itemStyles[itemName]}
                  />
                ) : null}
                <span className="font-medium">{displayName}</span>
              </div>
              <span>{value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ChartLegendProps {
  content?: React.ReactNode
  className?: string
  nameKey?: string
  [key: string]: any
}

export function ChartLegend({
  content,
  className,
  ...props
}: ChartLegendProps) {
  return (
    <RLegend
      verticalAlign="bottom"
      height={70}
      iconType="circle"
      content={content as any}
      className={className}
      {...props}
    />
  )
}

interface ChartLegendContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  nameKey?: string
}

export function ChartLegendContent({
  className,
  nameKey,
  ...props
}: ChartLegendContentProps) {
  const { config } = useChartConfig()
  const payload = (props as any)?.payload

  if (!payload?.length) {
    return null
  }

  // Extract payload names
  const names = payload.map((item: any) => {
    if (nameKey) {
      return nameKey === "key"
        ? item?.dataKey
        : item?.payload?.[nameKey] || item?.dataKey
    }
    return item?.dataKey
  })

  // Create CSS variables for shapes
  const itemStyles = createShapeStyles(names)

  return (
    <div
      className={cn("flex flex-wrap items-center justify-center gap-4", className)}
      style={{
        transform: "translate(0px, 0px)",
      }}
    >
      {payload.map((item: any) => {
        const key = item?.dataKey
        const itemName = (() => {
          if (nameKey) {
            return nameKey === "key" ? key : item?.payload?.[nameKey] || key
          }
          return key
        })()

        // Extract name
        const displayName = config?.[itemName]?.label || itemName

        return (
          <div key={`item-${key}`} className="flex items-center gap-1">
            <span
              className="size-2 shrink-0 rounded-full"
              style={itemStyles[itemName]}
            />
            <span className="text-xs font-medium">{displayName}</span>
          </div>
        )
      })}
    </div>
  )
} 