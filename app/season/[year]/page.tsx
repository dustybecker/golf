import { redirect } from "next/navigation";
import SeasonBoard from "@/components/SeasonBoard";
import SeasonEventGrid from "@/components/SeasonEventGrid";
import { getAuthenticatedEntrant } from "@/lib/draftAuth";
import AppShell from "@/components/AppShell";

type Props = {
  params: Promise<{ year: string }>;
};

export default async function SeasonPage({ params }: Props) {
  const { year } = await params;
  const yearNum = Number(year);

  const session = await getAuthenticatedEntrant();
  if (!session) redirect(`/sign-in?returnTo=/season/${year}`);

  return (
    <AppShell
      title={`${yearNum} Season`}
      subtitle="1st–6th per event · base points × tier multiplier · plus bonus awards · no cap"
    >
      <div className="space-y-6">
        <SeasonBoard year={yearNum} />
        <SeasonEventGrid year={yearNum} />
      </div>
    </AppShell>
  );
}
