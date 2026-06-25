import productBag from "@/assets/product-bag.jpg";
import productHat from "@/assets/product-hat.jpg";
import productDecor from "@/assets/product-decor.jpg";
import type { Product } from "./cart";

export const PRODUCTS: Product[] = [
  {
    id: "sahara-carrier",
    name: "Cabas Sahara",
    sub: "Coton crème + terracotta",
    description:
      "Notre cabas signature, tissé à la main à partir de fil recyclé de t-shirts pré-aimés. Le Sahara allie robustesse et légèreté, idéal pour les courses quotidiennes ou une sortie au souk. Chaque pièce est unique, avec des nuances subtiles dans le fil.",
    materials: "Fil recyclé de t-shirts, coton crème et terracotta",
    dimensions: "35 × 30 cm, anses de 60 cm",
    price: 450,
    img: productBag,
    tag: "Édition limitée",
  },
  {
    id: "atlas-bucket",
    name: "Bob Atlas",
    sub: "Fil recyclé sienne brûlée",
    description:
      "Le bob Atlas capture l'esprit des montagnes avec sa forme structurée et sa teinte sienne brûlée. Bouclé main avec une tension calibrée, il garde sa forme au fil des saisons. Bordure rigide intérieure pour un maintien optimal.",
    materials: "Fil recyclé de t-shirts, teinte sienne brûlée",
    dimensions: "Diamètre 28 cm, hauteur 12 cm",
    price: 320,
    img: productHat,
    tag: "Drop 01",
  },
  {
    id: "riad-set",
    name: "Panier & Coussin Riad",
    sub: "Ensemble maison fait main",
    description:
      "Inspiré des riads de Marrakech, cet ensemble panier + coussin apporte chaleur et authenticité à votre intérieur. Le panier accueille vos couvertures ou plantes, tandis que le coussin offre un soutien confortable avec sa fermeture à zipper.",
    materials: "Fil recyclé de t-shirts, garnissage en mousse recyclée",
    dimensions: "Panier : 40 × 35 cm, Coussin : 45 × 45 cm",
    price: 780,
    img: productDecor,
    tag: "Maison",
  },
  {
    id: "medina-pouch",
    name: "Pochette Médina",
    sub: "Mini cabas, fil rose poudré",
    description:
      "La Pochette Médina est votre compagnon quotidien pour les petits objets. Fil rose poudré délicat, fermeture magnétique et doublure intérieure en coton. Parfaite pour le maquillage, les clés ou comme pochette à main.",
    materials: "Fil recyclé de t-shirts, rose poudré, doublure coton",
    dimensions: "20 × 15 cm, poignée de 25 cm",
    price: 220,
    img: productBag,
    tag: "Nouveau",
  },
  {
    id: "kasbah-basket",
    name: "Panier Kasbah",
    sub: "Grand format, fil naturel",
    description:
      "Le Kasbah est notre plus grand panier, conçu pour les moments de plein air ou le rangement à la maison. Fil naturel non teint pour un look brut et authentique. Double paroi pour une rigidité renforcée.",
    materials: "Fil recyclé de t-shirts, fil naturel non teint",
    dimensions: "50 × 40 cm, hauteur 30 cm",
    price: 540,
    img: productDecor,
    tag: "Maison",
  },
  {
    id: "souk-hat",
    name: "Chapeau Souk",
    sub: "Bord large, fil sable",
    description:
      "Le Chapeau Souk protège du soleil avec elegance. Son bord large et sa teinte sable évoquent les marchés du sud marocain. Fil léger et respirant, parfait pour l'été casablancais. Pliable sans perdre sa forme.",
    materials: "Fil recyclé de t-shirts, teinte sable",
    dimensions: "Diamètre 35 cm, bord de 10 cm",
    price: 290,
    img: productHat,
    tag: "Été",
  },
];
