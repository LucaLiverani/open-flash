import type { BookMeta } from "@/lib/books";

export const bookIndex: BookMeta[] = [
  {
    slug: "don-quijote",
    title: "Don Quijote de la Mancha",
    author: "Miguel de Cervantes",
    emoji: "🗡️",
    description:
      "La historia del ingenioso hidalgo que pierde la razón leyendo libros de caballerías y sale a buscar aventuras.",
    language: "es",
    difficulty: "advanced",
    chapterCount: 3,
    sentenceCount: 95,
  },
  {
    slug: "cronica-de-una-muerte-anunciada",
    title: "Crónica de una muerte anunciada",
    author: "Gabriel García Márquez",
    emoji: "🔪",
    description:
      "La reconstrucción de los hechos que rodearon el asesinato de Santiago Nasar, una muerte que todo el pueblo sabía que iba a ocurrir pero nadie pudo evitar.",
    language: "es",
    difficulty: "intermediate",
    chapterCount: 5,
    sentenceCount: 1329,
  },
  {
    slug: "el-coronel-no-tiene-quien-le-escriba",
    title: "El coronel no tiene quien le escriba",
    author: "Gabriel García Márquez",
    emoji: "🐓",
    description:
      "Un viejo coronel retirado espera cada viernes una carta con su pensión de veterano que nunca llega, mientras lucha contra la pobreza con la esperanza de un gallo de pelea.",
    language: "es",
    difficulty: "intermediate",
    chapterCount: 7,
    sentenceCount: 1486,
  },
  {
    slug: "el-viejo-y-el-mar",
    title: "El viejo y el mar",
    author: "Ernest Hemingway",
    emoji: "🎣",
    description:
      "La historia de un viejo pescador cubano que se enfrenta solo a un enorme pez espada en las aguas del Golfo, en una lucha épica de resistencia y dignidad.",
    language: "es",
    difficulty: "intermediate",
    chapterCount: 8,
    sentenceCount: 1466,
  },
];
