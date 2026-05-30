"use client";
import { cn } from "@/lib/utils";

export const Meteors = ({
  number,
  className,
}: {
  number?: number;
  className?: string;
}) => {
  const meteors = new Array(number || 20).fill(true);
  return (
    <>
      {meteors.map((_, idx) => (
        <span
          key={"meteor" + idx}
          className={cn(
            "animate-meteor-effect absolute top-1/2 left-1/2 h-0.5 w-0.5 rounded-[9999px] bg-[#C8A84B] shadow-[0_0_0_1px_rgba(200,168,75,0.1)] rotate-[215deg]",
            "before:content-[''] before:absolute before:top-1/2 before:-translate-y-1/2 before:w-[50px] before:h-[1px] before:transform before:-translate-x-[50px] before:bg-gradient-to-r before:from-transparent before:to-[#C8A84B]",
            className
          )}
          style={{
            top: `${Math.floor(Math.random() * 100)}%`,
            left: `${Math.floor(Math.random() * 100)}%`,
            animationDelay: `${Math.random() * 2 + 0.2}s`,
            animationDuration: `${Math.floor(Math.random() * 8) + 2}s`,
          }}
        />
      ))}
    </>
  );
};
