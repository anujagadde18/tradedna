export const dynamic = "force-dynamic";

export default function ScoresPage({
  searchParams,
}: {
  searchParams?: { event?: string };
}) {
  const event = searchParams?.event ?? "Unknown Event";

  return (
    <main style={{ padding: 40 }}>
      <h1>Confidence Breakdown</h1>
      <p>Event: {event}</p>
    </main>
  );
}
