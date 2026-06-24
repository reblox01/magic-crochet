import productBag from "@/assets/product-bag.jpg";
import productHat from "@/assets/product-hat.jpg";
import productDecor from "@/assets/product-decor.jpg";
import type { Product } from "./cart";

export const PRODUCTS: Product[] = [
  {
    id: "sahara-carrier",
    name: "Cabas Sahara",
    sub: "Coton crème + terracotta",
    price: 450,
    img: productBag,
    tag: "Édition limitée",
  },
  {
    id: "atlas-bucket",
    name: "Bob Atlas",
    sub: "Fil recyclé sienne brûlée",
    price: 320,
    img: productHat,
    tag: "Drop 01",
  },
  {
    id: "riad-set",
    name: "Panier & Coussin Riad",
    sub: "Ensemble maison fait main",
    price: 780,
    img: productDecor,
    tag: "Maison",
  },
  {
    id: "medina-pouch",
    name: "Pochette Médina",
    sub: "Mini cabas, fil rose poudré",
    price: 220,
    img: productBag,
    tag: "Nouveau",
  },
  {
    id: "kasbah-basket",
    name: "Panier Kasbah",
    sub: "Grand format, fil naturel",
    price: 540,
    img: productDecor,
    tag: "Maison",
  },
  {
    id: "souk-hat",
    name: "Chapeau Souk",
    sub: "Bord large, fil sable",
    price: 290,
    img: productHat,
    tag: "Été",
  },
];
