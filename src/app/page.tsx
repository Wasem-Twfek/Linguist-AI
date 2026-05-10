import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Mic,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type HomeProps = {
  searchParams: Promise<{ error?: string; error_description?: string }>;
};

const features = [
  {
    icon: Mic,
    title: "AI-анализ произношения",
    desc: "Учащийся записывает чтение вслух, а система оценивает произношение, темп и проблемные слова.",
  },
  {
    icon: Users,
    title: "Группы и задания",
    desc: "Преподаватель создает группы, назначает тексты для чтения и видит, кто уже выполнил работу.",
  },
  {
    icon: BarChart3,
    title: "Отчеты и прогресс",
    desc: "Результаты сохраняются в истории: баллы, AI-комментарии и аналитика по каждому заданию.",
  },
];

const teacherBenefits = [
  "Создание заданий для групп",
  "Контроль выполнения учениками",
  "Аналитика по результатам",
  "AI-проверка без ручной рутины",
];

const studentBenefits = [
  "Список назначенных заданий",
  "Запись речи прямо в браузере",
  "Мгновенный AI-отчет",
  "История попыток и прогресса",
];

const workflowSteps = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Преподаватель создает задание",
    desc: "Преподаватель выбирает тему, уровень сложности и группу, либо генерирует задание с помощью AI.",
  },
  {
    number: "02",
    icon: Mic,
    title: "Учащийся записывает речь",
    desc: "Учащийся открывает задание, читает текст и записывает аудио прямо в браузере.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "AI анализирует произношение",
    desc: "Система обрабатывает попытку и формирует отчет с оценками, ошибками и рекомендациями.",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Преподаватель видит прогресс",
    desc: "Результаты сохраняются в панели преподавателя, где можно отслеживать аналитику и открывать отчеты.",
  },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Linguist AI">
      <Image
        src="/logo.svg"
        alt=""
        width={36}
        height={36}
        className="rounded-lg shadow-soft"
        priority
      />
      <span className="font-display text-lg font-bold tracking-tight text-foreground">
        Linguist <span className="text-accent">AI</span>
      </span>
    </Link>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="transition hover:text-foreground">
            Возможности
          </a>
          <a href="#roles" className="transition hover:text-foreground">
            Для кого
          </a>
          <a href="#preview" className="transition hover:text-foreground">
            Как работает
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Войти</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="hidden rounded-full sm:inline-flex"
          >
            <Link href="/signup/choose-role">Начать</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero-gradient">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,oklch(0.62_0.18_258/0.15),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 text-center sm:px-6 md:pb-28">
        <div className="mx-auto inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span className="truncate">
            AI-помощник для уроков английского произношения
          </span>
        </div>
        <h1 className="mx-auto mt-8 max-w-[22rem] break-words text-4xl font-bold leading-[1.08] tracking-tight text-foreground [overflow-wrap:anywhere] sm:max-w-4xl sm:text-5xl md:text-6xl lg:text-7xl">
          Улучшайте английское произношение с{" "}
          <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent [overflow-wrap:anywhere]">
            понятной AI-обратной связью
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-[21rem] text-base leading-relaxed text-muted-foreground [overflow-wrap:anywhere] sm:max-w-2xl sm:text-lg">
          Linguist AI помогает преподавателям назначать тексты для чтения, а
          учащимся - записывать речь и получать детальный отчет по произношению.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="group h-12 rounded-full px-7 text-base shadow-elegant"
          >
            <Link href="/login?role=teacher">
              <GraduationCap className="mr-2 h-5 w-5" />
              Я преподаватель
              <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="h-12 rounded-full border-2 px-7 text-base"
          >
            <Link href="/login?role=student">
              <BookOpen className="mr-2 h-5 w-5" />
              Я учащийся
            </Link>
          </Button>
        </div>
        <div className="mt-12 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            Без установки
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            Запись в браузере
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            Отчет после каждой попытки
          </span>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">
          Возможности
        </p>
        <h2 className="mt-3 break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Ключевые возможности платформы
        </h2>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group rounded-3xl border border-border bg-card p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-elegant"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-primary/10 text-accent ring-1 ring-accent/20">
              <feature.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-foreground">
              {feature.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {feature.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Roles() {
  return (
    <section id="roles" className="bg-secondary/50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Для кого
          </p>
          <h2 className="mt-3 break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Один продукт - две рабочие роли
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.3_0.1_262)] p-10 text-primary-foreground shadow-elegant">
            <GraduationCap className="h-10 w-10 opacity-90" />
            <h3 className="mt-6 font-display text-3xl font-bold">
              Преподавателю
            </h3>
            <p className="mt-3 text-base text-primary-foreground/75">
              Управляйте группами, назначайте упражнения и отслеживайте
              прогресс без ручной проверки аудио.
            </p>
            <ul className="mt-8 space-y-3">
              {teacherBenefits.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-border bg-card p-10 shadow-soft">
            <BookOpen className="h-10 w-10 text-accent" />
            <h3 className="mt-6 font-display text-3xl font-bold text-foreground">
              Учащемуся
            </h3>
            <p className="mt-3 text-base text-muted-foreground">
              Выполняйте задания, записывайте речь и сразу понимайте, что
              получилось хорошо, а что стоит повторить.
            </p>
            <ul className="mt-8 space-y-3">
              {studentBenefits.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="preview" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">
          Как работает
        </p>
        <h2 className="mt-3 break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Как работает Linguist AI
        </h2>
      </div>

      <div className="relative mt-12">
        <div className="absolute left-0 right-0 top-14 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {workflowSteps.map((step) => (
            <div
              key={step.number}
              className="relative rounded-3xl border border-border bg-card p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-primary/10 text-accent ring-1 ring-accent/20">
                  <step.icon className="h-6 w-6" />
                </div>
                <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {step.number}
                </span>
              </div>
              <h3 className="mt-7 text-xl font-semibold leading-snug text-foreground">
                {step.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[oklch(0.25_0.09_262)] to-[oklch(0.35_0.13_258)] px-8 py-16 text-center shadow-elegant md:py-18">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.62_0.18_258/0.4),transparent_50%)]" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl break-words font-display text-3xl font-bold leading-tight text-primary-foreground sm:text-4xl md:text-5xl">
            Начните работу с Linguist AI
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/75">
            Выберите роль и перейдите к заданиям, группам и отчетам по
            произношению.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-card px-7 text-base text-foreground hover:bg-card/90"
            >
              <Link href="/login?role=teacher">Я преподаватель</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-primary-foreground/30 bg-transparent px-7 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/login?role=student">Я учащийся</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <Logo />
        <div>© {new Date().getFullYear()} Linguist AI. Все права защищены.</div>
      </div>
    </footer>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const { error, error_description } = await searchParams;
  if (error) {
    const detail = error_description ?? error;
    redirect(`/login?error=oauth&detail=${encodeURIComponent(detail)}`);
  }

  return (
    <div className="landing-light min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Roles />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
