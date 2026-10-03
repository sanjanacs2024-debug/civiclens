import { Link } from "react-router-dom";
import { Activity, ArrowRight, Camera, Eye, MapPinned, ShieldCheck } from "lucide-react";
import Navbar from "../components/Navbar";

const principles = [
  {
    icon: Camera,
    title: "Start with what people see",
    description: "A photo, location and clear description give a civic issue a place in the shared record.",
  },
  {
    icon: Eye,
    title: "Make the status visible",
    description: "Issue pages bring reports, response notes and sample timelines together for residents to follow.",
  },
  {
    icon: Activity,
    title: "Keep the next step in view",
    description: "Escalation views highlight records marked overdue, while leaving the underlying status clear.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-[#f4f7f1] text-[#19332a]">
      <Navbar />
      <main>
        <section className="border-b border-emerald-900/10 bg-[#eaf1e8]">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#126747]">About CivicLens</p>
              <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight sm:text-5xl">Make civic issues <span className="text-[#126747]">impossible to ignore.</span></h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-[#586a60]">CivicLens is a civic issue reporting and monitoring prototype. It helps residents document local problems and makes reports, status and follow-up easier to see in one place.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/explore" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#126747] px-5 text-sm font-bold text-white transition hover:bg-[#0e5039]">Explore issues <ArrowRight size={16} /></Link>
                <Link to="/map" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#bdd0c0] bg-white px-5 text-sm font-bold text-[#315b45] transition hover:border-[#126747]"><MapPinned size={16} /> Open civic map</Link>
              </div>
            </div>
            <div className="relative min-h-[270px] overflow-hidden rounded-lg bg-[#173e32] p-7 text-white shadow-lg sm:min-h-[320px]">
              <div className="absolute inset-0 opacity-35" style={{ backgroundImage: "linear-gradient(32deg, transparent 47%, #dce9da 47.5%, #dce9da 49%, transparent 49.5%), linear-gradient(122deg, transparent 44%, #dce9da 44.5%, #dce9da 46%, transparent 46.5%), linear-gradient(90deg, rgb(255 255 255 / 14%) 1px, transparent 1px), linear-gradient(0deg, rgb(255 255 255 / 14%) 1px, transparent 1px)", backgroundSize: "auto, auto, 38px 38px, 38px 38px" }} />
              <div className="relative flex h-full min-h-[216px] flex-col justify-between sm:min-h-[266px]">
                <span className="inline-flex w-fit items-center gap-2 rounded bg-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-100"><ShieldCheck size={14} /> Citizen observations</span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">From local report to shared visibility</span>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[9px] font-bold sm:text-[10px]">
                    {["Capture", "Understand", "Track", "Escalate"].map((step, index) => <div className="border-t-2 border-emerald-300/70 pt-3" key={step}><span className="mb-2 block text-emerald-200">0{index + 1}</span>{step}</div>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#126747]">What the prototype does</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">A clearer record of local issues.</h2>
            <p className="mt-4 text-sm leading-7 text-[#64736a]">CivicLens currently demonstrates reporting and evidence capture, browsing a local sample issue register, viewing issue locations and following recorded progress or escalation status.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {principles.map(({ icon: Icon, title, description }) => (
              <article className="rounded-lg border border-[#dce5dd] bg-white p-6 shadow-sm" key={title}>
                <span className="grid h-10 w-10 place-items-center rounded-md bg-[#eaf2e9] text-[#126747]"><Icon size={19} /></span>
                <h3 className="mt-5 text-base font-bold">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-[#68776e]">{description}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-[10px] leading-5 text-[#77837a]">This is a hackathon prototype. The current frontend uses local demo data; authentication and external authority integrations are not connected.</p>
        </section>
      </main>
    </div>
  );
}