/**
 * Slides del carrusel “featured” en Market Explorer.
 * Copy bajo messages (explore.featuredSlides.boxing | f1). imageSrc null = fondo degradado.
 */
export const EXPLORE_FEATURED_SLIDE_IDS = ["boxing", "f1"] as const;

export type ExploreFeaturedSlideId = (typeof EXPLORE_FEATURED_SLIDE_IDS)[number];

export type FeaturedImageObjectPosition =
  | "center"
  | "bottom"
  /** Un poco por encima del borde inferior: deja aire para el copy sin perder el auto abajo. */
  | "bottomLifted";

export const exploreFeaturedSlideMedia: Record<
  ExploreFeaturedSlideId,
  {
    imageSrc: string | null;
    /** Ancla de `object-fit` para encuadrar el sujeto (p. ej. auto anclado abajo). */
    imageObjectPosition?: FeaturedImageObjectPosition;
  }
> = {
  boxing: { imageSrc: "/images/fight-11.png" },
  f1: { imageSrc: "/images/F1.png", imageObjectPosition: "bottomLifted" },
};
