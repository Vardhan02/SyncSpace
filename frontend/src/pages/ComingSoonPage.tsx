type ComingSoonPageProps = {
  title: string
}

export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground">
        {title}
      </h1>
      <p className="text-[14px] text-muted-foreground">
        This page is still being built.
      </p>
    </div>
  )
}
