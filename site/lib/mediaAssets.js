/**
 * Runtime media manifest, mirrors /lib/mediaAssets.ts.
 * Loaded as a plain <script> by the event pages, then read from window.MLP_MEDIA.
 */
(function (global) {
  const HERO_IMAGES = [
    { src: "/css/js/assets/images/Salon TD.jpg",     type: "image", caption: "Salon transformé — Thomas-Dubuc",       tags: ["salon", "feature"] },
    { src: "/css/js/assets/images/Cuinse TD.jpg",    type: "image", caption: "Cuisine moderne — Thomas-Dubuc",         tags: ["cuisine", "feature"] },
    { src: "/css/js/assets/images/Cuisne TH.png",    type: "image", caption: "Cuisine rénovée — Rive-Sud",             tags: ["cuisine"] },
    { src: "/css/js/assets/images/Backyard TD.jpg",  type: "image", caption: "Aménagement extérieur",                  tags: ["exterieur"] },
  ];

  const THOMAS_DUBUC_AFTER = [
    { src: "/event-media/thomas-dubuc/after/Frontage-1.jpeg",          type: "image", caption: "Façade rénovée",                    tags: ["exterieur","facade","investisseur","proprietaire"] },
    { src: "/event-media/thomas-dubuc/after/Frontage-2.jpeg",          type: "image", caption: "Façade rénovée",                    tags: ["exterieur","facade","investisseur","proprietaire"] },
    { src: "/event-media/thomas-dubuc/after/Frontage-3.jpeg",          type: "image", caption: "Façade rénovée",                    tags: ["exterieur","facade"] },
    { src: "/event-media/thomas-dubuc/after/Frontage-4.jpeg",          type: "image", caption: "Façade rénovée",                    tags: ["exterieur","facade"] },
    { src: "/event-media/thomas-dubuc/after/Living-room-1.jpeg",       type: "image", caption: "Salon principal après",             tags: ["salon","proprietaire","premier-achat"] },
    { src: "/event-media/thomas-dubuc/after/Living-room-1-pic-2.jpeg", type: "image", caption: "Salon principal après",             tags: ["salon","proprietaire"] },
    { src: "/event-media/thomas-dubuc/after/Kitchen-2.jpeg",           type: "image", caption: "Cuisine principale après",          tags: ["cuisine","proprietaire","premier-achat"] },
    { src: "/event-media/thomas-dubuc/after/Kitchen-appartment-1.jpeg",type: "image", caption: "Cuisine d'appartement locatif",     tags: ["cuisine","revenus","investisseur"] },
    { src: "/event-media/thomas-dubuc/after/Kitchen-studio.jpeg",      type: "image", caption: "Cuisine studio locatif",            tags: ["cuisine","revenus","investisseur"] },
    { src: "/event-media/thomas-dubuc/after/Bathroom-2.jpeg",          type: "image", caption: "Salle de bain rénovée",             tags: ["salle-de-bain","proprietaire"] },
    { src: "/event-media/thomas-dubuc/after/Bathroom-3.jpeg",          type: "image", caption: "Salle de bain rénovée",             tags: ["salle-de-bain","proprietaire"] },
    { src: "/event-media/thomas-dubuc/after/Bathroom-basement.jpeg",   type: "image", caption: "Salle de bain sous-sol locatif",    tags: ["salle-de-bain","revenus"] },
    { src: "/event-media/thomas-dubuc/after/Toilet-1.jpeg",            type: "image", caption: "Salle d'eau",                       tags: ["salle-de-bain"] },
    { src: "/event-media/thomas-dubuc/after/Bedroom-1.jpeg",           type: "image", caption: "Chambre principale",                tags: ["chambre","proprietaire","premier-achat"] },
    { src: "/event-media/thomas-dubuc/after/Bedroom-basement-1.jpeg",  type: "image", caption: "Chambre sous-sol locatif",          tags: ["chambre","revenus"] },
    { src: "/event-media/thomas-dubuc/after/Bedroom-basement-2.jpeg",  type: "image", caption: "Chambre sous-sol locatif",          tags: ["chambre","revenus"] },
    { src: "/event-media/thomas-dubuc/after/Basement-Kitchen.jpeg",    type: "image", caption: "Cuisine sous-sol — unité locative", tags: ["cuisine","revenus","investisseur","faisabilite"] },
    { src: "/event-media/thomas-dubuc/after/Basement-living-room.jpeg",type: "image", caption: "Salon sous-sol locatif",            tags: ["salon","revenus","investisseur"] },
    { src: "/event-media/thomas-dubuc/after/Basement-entrance.jpeg",   type: "image", caption: "Entrée privée sous-sol",            tags: ["exterieur","revenus","faisabilite"] },
    { src: "/event-media/thomas-dubuc/after/Backyard.jpeg",            type: "image", caption: "Cour arrière aménagée",             tags: ["exterieur","proprietaire"] },
  ];

  const THOMAS_DUBUC_BEFORE = [
    { src: "/event-media/thomas-dubuc/before/Before-frontage.jpeg",     type: "image", caption: "Façade avant",  tags: ["exterieur","before"] },
    { src: "/event-media/thomas-dubuc/before/Before-frontage-2.jpeg",   type: "image", caption: "Façade avant",  tags: ["exterieur","before"] },
    { src: "/event-media/thomas-dubuc/before/Before-Living-room.jpeg",  type: "image", caption: "Salon avant",   tags: ["salon","before"] },
    { src: "/event-media/thomas-dubuc/before/Before-Living-room-2.jpeg",type: "image", caption: "Salon avant",   tags: ["salon","before"] },
  ];

  const THOMAS_DUBUC_VIDEO = [
    { src: "/event-media/thomas-dubuc/video/Thomas-Dubuc-BeforeAfter.mp4", type: "video", caption: "Transformation complète — Thomas-Dubuc", tags: ["transformation","feature"] },
    { src: "/event-media/thomas-dubuc/video/Before-Video-1.mp4",           type: "video", caption: "Visite avant rénovation",                 tags: ["before"] },
    { src: "/event-media/thomas-dubuc/video/Before-Video-2.mp4",           type: "video", caption: "Visite avant rénovation",                 tags: ["before"] },
  ];

  const BATHROOM_PAIRS = [
    { before: "/css/js/assets/images/portfolio/bathrooms/bathroom-1-before.jpg", after: "/css/js/assets/images/portfolio/bathrooms/bathroom-1-after.jpg", room: "Salle de bain — projet 1", tags: ["salle-de-bain"] },
    { before: "/css/js/assets/images/portfolio/bathrooms/bathroom-2-before.jpg", after: "/css/js/assets/images/portfolio/bathrooms/bathroom-2-after.jpg", room: "Salle de bain — projet 2", tags: ["salle-de-bain"] },
    { before: "/css/js/assets/images/portfolio/bathrooms/bathroom-3-before.jpg", after: "/css/js/assets/images/portfolio/bathrooms/bathroom-3-after.jpg", room: "Salle de bain — projet 3", tags: ["salle-de-bain"] },
    { before: "/css/js/assets/images/portfolio/bathrooms/bathroom-4-before.jpg", after: "/css/js/assets/images/portfolio/bathrooms/bathroom-4-after.jpg", room: "Salle de bain — projet 4", tags: ["salle-de-bain"] },
    { before: "/css/js/assets/images/portfolio/bathrooms/bathroom-5-before.jpg", after: "/css/js/assets/images/portfolio/bathrooms/bathroom-5-after.jpg", room: "Salle de bain — projet 5", tags: ["salle-de-bain"] },
  ];

  const TESTIMONIALS = [
    { name: "Marie L.",    city: "Montréal",   text: "Ils ont transformé un duplex que nous pensions vendre. Aujourd’hui le sous-sol génère 1 350 $ par mois." },
    { name: "Jean-Paul K.",city: "Laval",      text: "Avant de signer pour notre première maison, leur évaluation nous a évité une erreur de 40 000 $." },
    { name: "Élise N.",    city: "Longueuil",  text: "Ils ont validé avec la ville ce qu’on pouvait faire. Permis approuvés du premier coup." },
    { name: "Patrick D.",  city: "Rive-Sud",   text: "Une équipe qui comprend l’investisseur, pas juste l’entrepreneur. Vraiment différent." },
  ];

  const ALL_IMAGES = HERO_IMAGES.concat(THOMAS_DUBUC_AFTER, THOMAS_DUBUC_BEFORE);
  const ALL_VIDEOS = THOMAS_DUBUC_VIDEO.slice();

  function byTag(tag) { return ALL_IMAGES.filter(a => a.tags.indexOf(tag) !== -1); }
  function pickFeaturedVideo() { return THOMAS_DUBUC_VIDEO[0]; }
  function shuffle(arr) { const a = arr.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }

  global.MLP_MEDIA = {
    HERO_IMAGES, THOMAS_DUBUC_AFTER, THOMAS_DUBUC_BEFORE, THOMAS_DUBUC_VIDEO,
    BATHROOM_PAIRS, TESTIMONIALS, ALL_IMAGES, ALL_VIDEOS,
    byTag, pickFeaturedVideo, shuffle,
  };
})(window);
