/**
 * Media manifest for the MLP event ecosystem.
 *
 * All assets are scanned from the existing project. Nothing is uploaded;
 * the booth pages reuse what is already on disk. Paths are web-root
 * relative — they assume the site is served from /site/.
 *
 * This file is also mirrored in /lib/mediaAssets.js so the static
 * HTML pages can import the manifest at runtime without a bundler.
 */

export type MediaAsset = {
  src: string;
  type: "image" | "video";
  caption?: string;
  tags: string[];
};

export type BeforeAfterPair = {
  before: string;
  after: string;
  room: string;
  tags: string[];
};

export const HERO_IMAGES: MediaAsset[] = [
  { src: "/css/js/assets/images/Salon TD.jpg",     type: "image", caption: "Salon transformé — Thomas-Dubuc",        tags: ["salon", "feature"] },
  { src: "/css/js/assets/images/Cuinse TD.jpg",    type: "image", caption: "Cuisine moderne — Thomas-Dubuc",          tags: ["cuisine", "feature"] },
  { src: "/css/js/assets/images/Cuisne TH.png",    type: "image", caption: "Cuisine rénovée — Rive-Sud",              tags: ["cuisine"] },
  { src: "/css/js/assets/images/Backyard TD.jpg",  type: "image", caption: "Aménagement extérieur",                   tags: ["exterieur"] },
];

export const THOMAS_DUBUC_AFTER: MediaAsset[] = [
  { src: "/event-media/thomas-dubuc/after/Frontage-1.jpeg",          type: "image", caption: "Façade rénovée",                tags: ["exterieur", "facade", "investisseur"] },
  { src: "/event-media/thomas-dubuc/after/Frontage-2.jpeg",          type: "image", caption: "Façade rénovée",                tags: ["exterieur", "facade", "investisseur"] },
  { src: "/event-media/thomas-dubuc/after/Frontage-3.jpeg",          type: "image", caption: "Façade rénovée",                tags: ["exterieur", "facade"] },
  { src: "/event-media/thomas-dubuc/after/Frontage-4.jpeg",          type: "image", caption: "Façade rénovée",                tags: ["exterieur", "facade"] },
  { src: "/event-media/thomas-dubuc/after/Living-room-1.jpeg",       type: "image", caption: "Salon principal après",         tags: ["salon", "proprietaire"] },
  { src: "/event-media/thomas-dubuc/after/Living-room-1-pic-2.jpeg", type: "image", caption: "Salon principal après",         tags: ["salon"] },
  { src: "/event-media/thomas-dubuc/after/Kitchen-2.jpeg",           type: "image", caption: "Cuisine principale après",      tags: ["cuisine", "proprietaire"] },
  { src: "/event-media/thomas-dubuc/after/Kitchen-appartment-1.jpeg",type: "image", caption: "Cuisine appartement locatif",   tags: ["cuisine", "revenus", "investisseur"] },
  { src: "/event-media/thomas-dubuc/after/Kitchen-studio.jpeg",      type: "image", caption: "Cuisine studio locatif",        tags: ["cuisine", "revenus"] },
  { src: "/event-media/thomas-dubuc/after/Bathroom-2.jpeg",          type: "image", caption: "Salle de bain rénovée",         tags: ["salle-de-bain"] },
  { src: "/event-media/thomas-dubuc/after/Bathroom-3.jpeg",          type: "image", caption: "Salle de bain rénovée",         tags: ["salle-de-bain"] },
  { src: "/event-media/thomas-dubuc/after/Bathroom-basement.jpeg",   type: "image", caption: "Salle de bain sous-sol",        tags: ["salle-de-bain", "revenus"] },
  { src: "/event-media/thomas-dubuc/after/Toilet-1.jpeg",            type: "image", caption: "Salle d'eau",                   tags: ["salle-de-bain"] },
  { src: "/event-media/thomas-dubuc/after/Bedroom-1.jpeg",           type: "image", caption: "Chambre principale",            tags: ["chambre"] },
  { src: "/event-media/thomas-dubuc/after/Bedroom-basement-1.jpeg",  type: "image", caption: "Chambre sous-sol locatif",      tags: ["chambre", "revenus"] },
  { src: "/event-media/thomas-dubuc/after/Bedroom-basement-2.jpeg",  type: "image", caption: "Chambre sous-sol locatif",      tags: ["chambre", "revenus"] },
  { src: "/event-media/thomas-dubuc/after/Basement-Kitchen.jpeg",    type: "image", caption: "Cuisine sous-sol — unité locative", tags: ["cuisine", "revenus", "investisseur", "faisabilite"] },
  { src: "/event-media/thomas-dubuc/after/Basement-living-room.jpeg",type: "image", caption: "Salon sous-sol locatif",        tags: ["salon", "revenus", "investisseur"] },
  { src: "/event-media/thomas-dubuc/after/Basement-entrance.jpeg",   type: "image", caption: "Entrée privée sous-sol",        tags: ["exterieur", "revenus", "faisabilite"] },
  { src: "/event-media/thomas-dubuc/after/Backyard.jpeg",            type: "image", caption: "Cour arrière aménagée",         tags: ["exterieur"] },
];

export const THOMAS_DUBUC_BEFORE: MediaAsset[] = [
  { src: "/event-media/thomas-dubuc/before/Before-frontage.jpeg",     type: "image", caption: "Façade avant",         tags: ["exterieur", "before"] },
  { src: "/event-media/thomas-dubuc/before/Before-frontage-2.jpeg",   type: "image", caption: "Façade avant",         tags: ["exterieur", "before"] },
  { src: "/event-media/thomas-dubuc/before/Before-Living-room.jpeg",  type: "image", caption: "Salon avant",          tags: ["salon",     "before"] },
  { src: "/event-media/thomas-dubuc/before/Before-Living-room-2.jpeg",type: "image", caption: "Salon avant",          tags: ["salon",     "before"] },
];

export const THOMAS_DUBUC_VIDEO: MediaAsset[] = [
  { src: "/event-media/thomas-dubuc/video/Thomas-Dubuc-BeforeAfter.mp4", type: "video", caption: "Avant / après — Thomas-Dubuc", tags: ["transformation", "feature"] },
  { src: "/event-media/thomas-dubuc/video/Before-Video-1.mp4",           type: "video", caption: "Visite avant rénovation",       tags: ["before"] },
  { src: "/event-media/thomas-dubuc/video/Before-Video-2.mp4",           type: "video", caption: "Visite avant rénovation",       tags: ["before"] },
];

export const BATHROOM_PAIRS: BeforeAfterPair[] = [
  { before: "/css/js/assets/images/portfolio/bathrooms/bathroom-1-before.jpg", after: "/css/js/assets/images/portfolio/bathrooms/bathroom-1-after.jpg", room: "Salle de bain — projet 1", tags: ["salle-de-bain"] },
  { before: "/css/js/assets/images/portfolio/bathrooms/bathroom-2-before.jpg", after: "/css/js/assets/images/portfolio/bathrooms/bathroom-2-after.jpg", room: "Salle de bain — projet 2", tags: ["salle-de-bain"] },
  { before: "/css/js/assets/images/portfolio/bathrooms/bathroom-3-before.jpg", after: "/css/js/assets/images/portfolio/bathrooms/bathroom-3-after.jpg", room: "Salle de bain — projet 3", tags: ["salle-de-bain"] },
  { before: "/css/js/assets/images/portfolio/bathrooms/bathroom-4-before.jpg", after: "/css/js/assets/images/portfolio/bathrooms/bathroom-4-after.jpg", room: "Salle de bain — projet 4", tags: ["salle-de-bain"] },
  { before: "/css/js/assets/images/portfolio/bathrooms/bathroom-5-before.jpg", after: "/css/js/assets/images/portfolio/bathrooms/bathroom-5-after.jpg", room: "Salle de bain — projet 5", tags: ["salle-de-bain"] },
];

export const ALL_IMAGES: MediaAsset[] = [...HERO_IMAGES, ...THOMAS_DUBUC_AFTER, ...THOMAS_DUBUC_BEFORE];
export const ALL_VIDEOS: MediaAsset[] = [...THOMAS_DUBUC_VIDEO];

export function byTag(tag: string): MediaAsset[] {
  return ALL_IMAGES.filter(a => a.tags.includes(tag));
}

export function pickFeaturedVideo(): MediaAsset {
  return THOMAS_DUBUC_VIDEO[0];
}
