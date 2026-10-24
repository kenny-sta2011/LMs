import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

export const Tabs = TabsPrimitive.Root

export const TabsList = ({ className, ...p }) => (
  <TabsPrimitive.List
    className={cn("inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-200 p-1", className)}
    {...p}
  />
)

export const TabsTrigger = ({ className, ...p }) => (
  <TabsPrimitive.Trigger
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow",
      className
    )}
    {...p}
  />
)

export const TabsContent = ({ className, ...p }) => (
  <TabsPrimitive.Content className={cn("focus-visible:outline-none", className)} {...p} />
)
