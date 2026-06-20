import PaperField from "@/app/components/PaperField";
import LandingHero from "@/app/components/LandingHero";

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <PaperField surface="full" />
      <LandingHero />
    </main>
  );
}
