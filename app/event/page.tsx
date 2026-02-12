"use client";

import { useRouter } from "next/navigation";

export default function EventPage() {
  const router = useRouter();

  function goToScores() {
    router.push(
      "/scores?event=Will%20Bitcoin%20cross%20$150k%20in%202026?"
    );
  }

  return (
    <main style={{ padding: 40 }}>
      <button onClick={goToScores}>
        Go to Scores
      </button>
    </main>
  );
}
