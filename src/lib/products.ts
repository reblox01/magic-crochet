import productBag from "@/assets/product-bag.jpg";
import productHat from "@/assets/product-hat.jpg";
import productDecor from "@/assets/product-decor.jpg";
import type { Product } from "./cart";

export type ProductDetail = Product & {
  description: string;
  details: string[];
  gallery: string[];
  category: "Sac" | "Chapeau" | "Maison";
};

export const PRODUCTS: ProductDetail[] = [
  {
    id: "sahara-carrier",
    name: "Cabas Sahara",
    sub: "Coton crème + terracotta",
    price: 450,
    img: productBag,
    tag: "Édition limitée",
    category: "Sac",
    description:
      "Notre cabas iconique, bouclé main à partir de t-shirts pré-aimés filés en ruban continu. Anse renforcée, fond plat, doublure coton. Idéal pour la plage, le marché ou le quotidien.",
    details: [
      "Fil 100% coton recyclé",
      "Dimensions ≈ 38 × 42 cm",
      "Anses doubles 60 cm",
      "Fabriqué à Casablanca",
    ],
    gallery: [productBag, productDecor, productHat],
  },
  {
    id: "atlas-bucket",
    name: "Bob Atlas",
    sub: "Fil recyclé sienne brûlée",
    price: 320,
    img: productHat,
    tag: "Drop 01",
    category: "Chapeau",
    description:
      "Un bob structuré bouclé point par point. Tombé souple, bord 6 cm, ajustement universel. La pièce de l'été.",
    details: ["Fil mixte coton/lin recyclé", "Tour de tête 56–58 cm", "Bord 6 cm", "Pièce unique"],
    gallery: [productHat, productBag, productDecor],
  },
  {
    id: "riad-set",
    name: "Panier & Coussin Riad",
    sub: "Ensemble maison fait main",
    price: 780,
    img: productDecor,
    tag: "Maison",
    category: "Maison",
    description:
      "Duo pour intérieurs paisibles : panier de rangement tressé et coussin moelleux assorti. Couleurs terre et écru, finitions à la main.",
    details: ["Panier ≈ 32 × 28 cm", "Coussin 40 × 40 cm", "Rembourrage coton", "Lot de 2 pièces"],
    gallery: [productDecor, productBag, productHat],
  },
  {
    id: "medina-pouch",
    name: "Pochette Médina",
    sub: "Mini cabas, fil rose poudré",
    price: 220,
    img: productBag,
    tag: "Nouveau",
    category: "Sac",
    description:
      "Petite pochette du soir crochetée main, anse courte et fermeture aimantée. Le bon compagnon pour les sorties.",
    details: ["≈ 22 × 16 cm", "Anse 18 cm", "Fil recyclé rose poudré"],
    gallery: [productBag, productHat, productDecor],
  },
  {
    id: "kasbah-basket",
    name: "Panier Kasbah",
    sub: "Grand format, fil naturel",
    price: 540,
    img: productDecor,
    tag: "Maison",
    category: "Maison",
    description:
      "Grand panier de rangement à fond plat, parfait pour le linge, les jouets ou comme cache-pot.",
    details: ["≈ 40 × 38 cm", "Fond renforcé", "Fil écru naturel"],
    gallery: [productDecor, productBag, productHat],
  },
  {
    id: "souk-hat",
    name: "Chapeau Souk",
    sub: "Bord large, fil sable",
    price: 290,
    img: productHat,
    tag: "Été",
    category: "Chapeau",
    description: "Chapeau à bord large, protection soleil et silhouette estivale élégante.",
    details: ["Bord 9 cm", "Tour 56–58 cm", "Fil sable recyclé"],
    gallery: [productHat, productBag, productDecor],
  },
];

export function findProduct(id: string): ProductDetail | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
