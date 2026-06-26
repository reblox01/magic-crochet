import { Wrench } from "lucide-react";

export function MaintenanceScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#faf9f7]">
      <div className="max-w-md mx-auto px-6 text-center">
        <div className="mb-6 flex justify-center">
          <div className="size-16 rounded-full bg-[#F506EA]/10 grid place-items-center">
            <Wrench className="size-7 text-[#F506EA]" />
          </div>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-[#1c1917] mb-3">
          Site en maintenance
        </h1>
        <p className="text-[#1c1917]/50 text-sm leading-relaxed">
          Nous effectuons actuellement des améliorations. Le site sera de retour très bientôt.
          Merci pour votre patience.
        </p>
        <div className="mt-8">
          <p className="text-xs text-[#1c1917]/30 uppercase tracking-widest">
            Magic Crochet
          </p>
        </div>
      </div>
    </div>
  );
}
