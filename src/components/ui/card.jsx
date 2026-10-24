import { cn } from "@/lib/utils"

export const Card = ({ className, ...p }) => (
  <div className={cn("rounded-xl border bg-white text-slate-900 shadow-sm", className)} {...p} />
)
export const CardHeader = ({ className, ...p }) => (
  <div className={cn("flex flex-col space-y-1.5 p-5", className)} {...p} />
)
export const CardTitle = ({ className, ...p }) => (
  <h3 className={cn("font-semibold leading-none tracking-tight", className)} {...p} />
)
export const CardDescription = ({ className, ...p }) => (
  <p className={cn("text-sm text-slate-500", className)} {...p} />
)
export const CardContent = ({ className, ...p }) => (
  <div className={cn("p-5 pt-0", className)} {...p} />
)
