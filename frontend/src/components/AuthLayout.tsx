import type { ReactNode } from "react"

import { Logo } from "@/components/Logo"

type AuthLayoutProps = {
  title: string
  description: string
  children: ReactNode
}

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh bg-white md:bg-[#f5f4f0] lg:bg-white">
      <aside className="hidden w-[44%] max-w-160 flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Logo />

        <div>
          <p className="text-[52px] font-semibold leading-[1.02] tracking-[-2px]">
            Find your people.
            <br />
            <span className="text-[#888780]">& your place.</span>
          </p>
          <p className="max-w-95 pt-5 text-[15px] leading-[23px] text-[#b4b2a9]">
            Match with roommates who live the way you do, and pick a home
            together.
          </p>
        </div>

        <p className="text-[13px] text-[#888780]">© 2026 SyncSpace</p>
      </aside>

      <main className="flex flex-1 md:items-center md:justify-center md:p-6">
        <div className="flex min-h-dvh w-full flex-col bg-white md:min-h-0 md:max-w-110 md:rounded-[24px] md:shadow-[0_12px_40px_rgba(44,44,42,0.08)] lg:max-w-100 lg:shadow-none">
          <div className="flex flex-col gap-7 px-5 pt-14 md:px-10 md:pt-10 lg:px-0">
            <Logo className="text-foreground lg:hidden" markClassName="size-9" />

            <div className="flex flex-col">
              <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground lg:text-[30px]">
                {title}
              </h1>
              <p className="pt-1.5 text-[14px] leading-[21px] text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          {children}
        </div>
      </main>
    </div>
  )
}
