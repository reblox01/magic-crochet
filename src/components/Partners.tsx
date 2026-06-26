import taliaAsset from "@/assets/partner-talia.png.asset.json";
import enactusAsset from "@/assets/partner-enactus.png.asset.json";
import commonsAsset from "@/assets/partner-commons.png.asset.json";
import bensAsset from "@/assets/partner-bens.png.asset.json";

const PARTNERS = [
  { name: "Talia Art Studio", logo: taliaAsset.url },
  { name: "Enactus EMSI Casablanca", logo: enactusAsset.url },
  { name: "Commons Work", logo: commonsAsset.url },
  { name: "Ben's Coffee Shop", logo: bensAsset.url },
];

export function Partners() {
  return (
    <section
      id="partenaires"
      className="py-24 sm:py-32 px-6 bg-brand-bg border-t border-brand-text/10"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
            07 — Partenaires
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl leading-tight italic max-w-2xl mx-auto text-balance">
            Ils boucle la maille avec nous.
          </h2>
          <p className="mt-5 text-brand-text/60 max-w-xl mx-auto">
            Des lieux et collectifs qui accueillent nos ateliers, soutiennent nos
            artisanes et croient à un artisanat plus juste.
          </p>
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {PARTNERS.map((p) => (
            <li
              key={p.name}
              className="group aspect-[5/3] rounded-[2rem] border border-brand-text/10 bg-brand-muted/40 hover:bg-white hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(28,25,23,0.18)] transition-all duration-500 grid place-items-center p-6"
              title={p.name}
            >
              <img
                src={p.logo}
                alt={p.name}
                loading="lazy"
                className="max-h-[60%] max-w-[78%] object-contain opacity-70 group-hover:opacity-100 transition-opacity"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
