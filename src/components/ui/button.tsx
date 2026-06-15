import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground font-bold tracking-[-0.01em] hover:bg-primary/90 shadow-[0_0_16px_rgba(74,222,128,0.18),0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(74,222,128,0.25),0_2px_10px_rgba(0,0,0,0.35)]",
        outline:
          "border border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/40",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "bg-white/5 border border-white/8 text-white/55 hover:bg-white/10 hover:text-white/80",
        destructive:
          "bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/15",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 text-base",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-[10px] px-3 text-sm",
        lg: "h-13 px-6 text-lg",
        icon: "size-11 rounded-xl",
        "icon-xs": "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-[10px]",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
