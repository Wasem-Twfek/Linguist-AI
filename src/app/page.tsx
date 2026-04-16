import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

type HomeProps = {
  searchParams: Promise<{ error?: string; error_description?: string }>;
};

/** Supabase sends failed OAuth flows to Site URL (?error=…) — forward to login */
export default async function Home({ searchParams }: HomeProps) {
  const { error, error_description } = await searchParams;
  if (error) {
    const detail = error_description ?? error;
    redirect(`/login?error=oauth&detail=${encodeURIComponent(detail)}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
      <div className="flex flex-col items-center gap-8 text-center max-w-2xl">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50 sm:text-5xl md:text-6xl">
            Улучшайте английское произношение с ИИ
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 sm:text-xl">
            Интерактивные упражнения и мгновенная обратная связь
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button asChild size="lg" className="w-full sm:w-auto min-w-[200px]">
            <Link href="/login?role=teacher">
              Я учитель
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto min-w-[200px]">
            <Link href="/login?role=student">
              Я ученик
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
