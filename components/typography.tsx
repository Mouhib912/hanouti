import { Text, type TextProps } from "react-native";
import { cn } from "@/lib/utils";

/**
 * Modernist type system — Manrope (display + body) + JetBrains Mono (labels).
 *
 * Display   — Manrope ExtraBold for confident headlines and big numbers.
 * DisplaySm — Manrope Bold for sub-headlines.
 * Body / BodyBold — Manrope Medium/Bold for paragraphs and UI text.
 * Mono / MonoBold — JetBrains Mono for tabular numbers, labels, technical info.
 * Label — small uppercase mono tag.
 */

export function Display({ className, ...props }: TextProps) {
  return (
    <Text
      {...props}
      className={cn("text-foreground font-display", className)}
      style={[{ letterSpacing: -1.2 }, props.style]}
    />
  );
}

export function DisplaySm({ className, ...props }: TextProps) {
  return (
    <Text
      {...props}
      className={cn("text-foreground font-display-bold", className)}
      style={[{ letterSpacing: -0.5 }, props.style]}
    />
  );
}

export function Body({ className, ...props }: TextProps) {
  return (
    <Text {...props} className={cn("text-foreground font-body", className)} />
  );
}

export function BodyBold({ className, ...props }: TextProps) {
  return (
    <Text {...props} className={cn("text-foreground font-body-bold", className)} />
  );
}

export function Mono({ className, ...props }: TextProps) {
  return (
    <Text
      {...props}
      className={cn("text-foreground font-mono", className)}
      style={[{ letterSpacing: 0.2 }, props.style]}
    />
  );
}

export function MonoBold({ className, ...props }: TextProps) {
  return (
    <Text
      {...props}
      className={cn("text-foreground font-mono-bold", className)}
      style={[{ letterSpacing: 0.2 }, props.style]}
    />
  );
}

export function Label({ className, ...props }: TextProps) {
  return (
    <Text
      {...props}
      className={cn("text-muted font-mono-bold uppercase text-[10px]", className)}
      style={[{ letterSpacing: 1.6 }, props.style]}
    />
  );
}
