import { slopVideo } from "./slopVideo"
import { useSlopPlayer } from "./useSlopPlayer"

export function SlopPlayer() {
  const { status, generate } = useSlopPlayer()

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-[#101014] p-6 text-center text-white">
      <h1 className="text-[32px] font-bold">☠️ AI Slop Generator</h1>

      {status === "loading" && (
        <>
          <div className="size-12 animate-spin rounded-full border-[5px] border-[#333] border-t-[#c4ff43]" />
          <p>Cooking up some brainrot...</p>
        </>
      )}

      {status === "playing" && (
        <video src={slopVideo} controls autoPlay playsInline className="max-h-[65vh] w-full max-w-[420px] rounded-[12px] bg-black" />
      )}

      {status !== "loading" && (
        <button type="button" onClick={generate} className="rounded-[10px] bg-[#c4ff43] px-7 py-4 font-bold text-[#111] hover:bg-white">
          {status === "idle" ? "Generate Slop" : "Generate Again"}
        </button>
      )}
    </div>
  )
}
