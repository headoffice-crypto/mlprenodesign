# 🚀 Guide de Déploiement - MLP Reno & Design

## ✅ Changements Récents

### 1. Cookie Consent Banner (Bannière de Consentement)
- ✅ Bannière moderne et professionnelle au bas de la page
- ✅ Texte en français
- ✅ Boutons "Accepter" et "Refuser"
- ✅ Sauvegarde du choix dans localStorage
- ✅ Design responsive (mobile/desktop)
- ✅ Animations fluides

### 2. Google Analytics 4 (GA4)
- ✅ Code de tracking ajouté dans `<head>`
- ✅ Respect du consentement des cookies
- ✅ Suivi automatique des pages vues
- ✅ Suivi des soumissions de formulaire
- ⚠️ **ACTION REQUISE**: Remplacer `G-XXXXXXXXXX` par votre ID de mesure GA4

### 3. Meta Pixel (Facebook Pixel)
- ✅ Code de tracking ajouté dans `<head>`
- ✅ Respect du consentement des cookies
- ✅ Suivi automatique des pages vues
- ✅ Suivi des événements de contact
- ⚠️ **ACTION REQUISE**: Remplacer `YOUR_PIXEL_ID_HERE` par votre ID Meta Pixel

---

## 🔧 Configuration Requise Avant Déploiement

### Étape 1: Configurer Google Analytics

1. **Créer un compte Google Analytics 4**:
   - Allez sur https://analytics.google.com/
   - Créez une propriété GA4
   - Notez votre ID de mesure (format: `G-XXXXXXXXXX`)

2. **Mettre à jour le code**:
   - Ouvrez `site/index.html`
   - Ligne 107: Remplacez `G-XXXXXXXXXX` par votre ID réel
   - Ligne 113: Remplacez `G-XXXXXXXXXX` par votre ID réel
   - Ouvrez `site/js/main.js`
   - Ligne 237: Remplacez `G-XXXXXXXXXX` par votre ID réel

### Étape 2: Configurer Meta Pixel

1. **Créer un Meta Pixel**:
   - Allez sur https://business.facebook.com/
   - Events Manager → Pixels
   - Créez un nouveau pixel
   - Notez votre Pixel ID (format numérique)

2. **Mettre à jour le code**:
   - Ouvrez `site/index.html`
   - Ligne 126: Remplacez `YOUR_PIXEL_ID_HERE` par votre Pixel ID
   - Ligne 129: Remplacez `YOUR_PIXEL_ID_HERE` par votre Pixel ID
   - Ouvrez `site/js/main.js`
   - Ligne 242: Remplacez `YOUR_PIXEL_ID_HERE` par votre Pixel ID

### Étape 3: Logos d'Accréditation (Optionnel)

Les logos actuels sont des placeholders SVG fonctionnels. Pour une apparence plus professionnelle:

1. Téléchargez les logos officiels depuis:
   - **RBQ**: https://www.rbq.gouv.qc.ca/
   - **CNESST**: https://www.cnesst.gouv.qc.ca/
   - **APCHQ**: https://www.apchq.com/
   - **CCQ**: https://www.ccq.org/

2. Remplacez les fichiers dans:
   ```
   site/css/js/assets/images/logos/
   ```

3. Formats recommandés:
   - PNG ou SVG avec fond transparent
   - Taille: Les logos s'affichent à 80px de hauteur

Voir `LOGO_INSTRUCTIONS.md` pour plus de détails.

---

## 🎨 Revue Finale du Design

### ✅ Header (En-tête)
- ✅ Logo moderne avec gradient
- ✅ Navigation claire et responsive
- ✅ Numéro de téléphone visible: **1 (844) 484-8460**
- ✅ Bouton CTA "Estimation gratuite"
- ✅ Menu mobile avec animation slide-in
- ✅ Header sticky (reste visible lors du scroll)

### ✅ Hero Section
- ✅ Fond clair (#f5f5f5) avec bon contraste
- ✅ Titre impactant: "CONCEVOIR • CONSTRUIRE • OPTIMISER"
- ✅ Localisation visible: "MONTRÉAL ET GRAND MONTRÉAL"
- ✅ Zones de service listées
- ✅ Deux CTA buttons bien visibles
- ✅ Image de fond professionnelle

### ✅ Section À Propos
- ✅ Contenu clair et professionnel
- ✅ Statistiques (15+ ans, 200+ projets)
- ✅ Badge "GRAND MONTRÉAL"
- ✅ Espacement généreux
- ✅ Image de qualité

### ✅ Section Services
- ✅ Titre changé à "NOTRE EXPERTISE"
- ✅ 8 services avec icônes SVG personnalisés
- ✅ Layout grid statique (4 colonnes desktop, responsive)
- ✅ Hover effects professionnels
- ✅ Icônes circulaires avec fond noir
- ✅ Animations au scroll

### ✅ Section Projets
- ✅ 4 projets récents avec images
- ✅ Overlay avec badges et titres
- ✅ Images existantes utilisées
- ✅ Hover effects élégants
- ✅ Responsive grid

### ✅ Section "Pourquoi Nous"
- ✅ Fond sombre (#1a1f2e) pour contraste
- ✅ 4 avantages clés
- ✅ Icônes SVG clairs
- ✅ Texte en blanc pour lisibilité
- ✅ Grid responsive

### ✅ Section Contact
- ✅ Formulaire intégré avec Formspree
- ✅ Validation côté client
- ✅ Messages de succès/erreur inline
- ✅ 4 boîtes de contact (téléphone, email, zone, disponibilité)
- ✅ Design professionnel et moderne
- ✅ Protection anti-spam (honeypot)
- ✅ Tracking des soumissions (GA4 + Meta Pixel)

### ✅ Section Accréditations
- ✅ Logos visibles (opacity 90%)
- ✅ Descriptions sous chaque logo
- ✅ Taille augmentée (80px)
- ✅ Bordures au hover
- ✅ 4 logos: RBQ, CNESST, APCHQ, CCQ
- ✅ Responsive grid

### ✅ Footer
- ✅ Logo et tagline
- ✅ Liens vers services
- ✅ Informations de contact
- ✅ Copyright 2026
- ✅ Design cohérent

### ✅ Animations
- ✅ Fade-in pour sections
- ✅ Slide-in left/right
- ✅ Scale-up pour éléments
- ✅ Stagger children (effet cascade)
- ✅ Intersection Observer pour déclenchement au scroll
- ✅ Smooth scroll entre sections

### ✅ Cookie Consent
- ✅ Bannière moderne au bas de page
- ✅ Texte français clair
- ✅ Boutons "Accepter" / "Refuser"
- ✅ Gradient background professionnel
- ✅ Animations d'apparition
- ✅ Responsive design
- ✅ Sauvegarde du choix utilisateur

### ✅ SEO & Performance
- ✅ Balises meta complètes
- ✅ OpenGraph pour réseaux sociaux
- ✅ Schema.org JSON-LD (LocalBusiness)
- ✅ Canonical URL
- ✅ Hreflang fr-CA
- ✅ Images avec attributs alt
- ✅ Lazy loading pour images
- ✅ Responsive images

### ✅ Mobile Responsiveness
- ✅ Header mobile avec hamburger menu
- ✅ Toutes les sections adaptées
- ✅ Formulaire responsive
- ✅ Services grid (1 colonne mobile, 4 desktop)
- ✅ Projets grid responsive
- ✅ Cookie banner responsive

---

## 📱 Tests Avant Déploiement

### Tests Fonctionnels
- [ ] Tester le menu mobile (ouvrir/fermer)
- [ ] Tester tous les liens de navigation
- [ ] Tester le smooth scroll vers sections
- [ ] Soumettre le formulaire de contact
- [ ] Vérifier l'email reçu via Formspree
- [ ] Tester les boutons de cookies (accepter/refuser)
- [ ] Vérifier que le choix est sauvegardé (recharger la page)
- [ ] Cliquer sur le numéro de téléphone (doit ouvrir l'app)
- [ ] Cliquer sur l'email (doit ouvrir le client email)

### Tests Visuels
- [ ] Vérifier toutes les animations au scroll
- [ ] Tester les hover effects sur services
- [ ] Tester les hover effects sur projets
- [ ] Vérifier les hover effects sur logos
- [ ] Vérifier le header sticky
- [ ] Tester sur mobile (iPhone/Android)
- [ ] Tester sur tablette (iPad)
- [ ] Tester sur desktop (1920px)

### Tests de Performance
- [ ] Tester la vitesse de chargement
- [ ] Vérifier que toutes les images se chargent
- [ ] Tester avec connexion lente (3G)
- [ ] Vérifier les Core Web Vitals sur PageSpeed Insights

### Tests SEO
- [ ] Vérifier sur Google Search Console
- [ ] Tester avec l'outil de test de données structurées de Google
- [ ] Vérifier l'aperçu sur Facebook (Sharing Debugger)
- [ ] Tester les balises OpenGraph

### Tests de Tracking
- [ ] Installer Google Tag Assistant
- [ ] Vérifier que GA4 track les pages vues
- [ ] Vérifier que Meta Pixel track les événements
- [ ] Tester le tracking des soumissions de formulaire
- [ ] Vérifier dans GA4 que les événements apparaissent
- [ ] Vérifier dans Meta Events Manager

---

## 🌐 Déploiement

### Option 1: Hébergement Statique (Recommandé)

**Netlify (Gratuit)**:
1. Créer un compte sur https://www.netlify.com/
2. Glisser-déposer le dossier `site/` sur Netlify
3. Configurer le domaine `mlprenodesign.ca`
4. Activer HTTPS automatique
5. ✅ Déployé!

**Vercel (Gratuit)**:
1. Créer un compte sur https://vercel.com/
2. Importer le projet GitHub ou déployer directement
3. Configurer le domaine
4. ✅ Déployé!

**GitHub Pages (Gratuit)**:
1. Créer un repo GitHub
2. Pousser le contenu du dossier `site/`
3. Activer GitHub Pages dans Settings
4. Configurer le domaine personnalisé
5. ✅ Déployé!

### Option 2: Hébergement Traditionnel

**Via cPanel/FTP**:
1. Connectez-vous à votre hébergeur
2. Uploadez tout le contenu du dossier `site/` dans `public_html/`
3. Assurez-vous que `index.html` est à la racine
4. ✅ Déployé!

---

## 🔍 Vérifications Post-Déploiement

### Immédiatement après le déploiement:
- [ ] Visiter https://mlprenodesign.ca/
- [ ] Vérifier que le site se charge correctement
- [ ] Tester sur mobile
- [ ] Soumettre un test de formulaire
- [ ] Vérifier l'email reçu
- [ ] Tester le cookie consent
- [ ] Vérifier GA4 (Real-Time reports)
- [ ] Vérifier Meta Pixel (Test Events)

### Dans les 24-48 heures:
- [ ] Vérifier les données Google Analytics
- [ ] Vérifier les événements Meta Pixel
- [ ] Tester les liens depuis les réseaux sociaux
- [ ] Vérifier l'indexation Google (Search Console)
- [ ] Monitorer les soumissions de formulaire

### Maintenance continue:
- [ ] Vérifier les analytics hebdomadairement
- [ ] Répondre rapidement aux soumissions de formulaire
- [ ] Mettre à jour les images de projets régulièrement
- [ ] Ajouter de nouveaux projets dans la section Projets
- [ ] Créer les pages de services individuelles (utiliser `_template-service.html`)

---

## 📞 Informations de Contact du Site

- **Téléphone**: 1 (844) 484-8460
- **Email**: info@mlprenodesign.ca
- **Zones**: Montréal, Laval, Longueuil, Rive-Nord, Rive-Sud
- **Formspree**: https://formspree.io/f/mvzbpwaw

---

## 📄 Structure des Fichiers

```
site/
├── index.html                 # Page principale
├── css/
│   ├── styles.css            # Styles principaux
│   └── js/
│       └── assets/
│           └── images/       # Images du site
│               ├── logos/    # Logos d'accréditation
│               │   ├── rbq-logo.svg
│               │   ├── cnesst-logo.svg
│               │   ├── apchq-logo.svg
│               │   └── ccq-logo.svg
│               ├── Salon TD.jpg
│               ├── Cuinse TD.jpg
│               ├── Backyard TD.jpg
│               └── Cuisne TH.png
├── js/
│   └── main.js               # JavaScript principal
└── services/
    └── _template-service.html # Template pour pages de services
```

---

## 🎯 Prochaines Étapes Recommandées

1. **Créer les pages de services individuelles**:
   - Utiliser `_template-service.html` comme base
   - Créer `/services/cuisine.html`
   - Créer `/services/salle-de-bain.html`
   - Créer `/services/sous-sol.html`
   - Etc.

2. **Ajouter du contenu SEO**:
   - Articles de blog
   - FAQ
   - Témoignages clients
   - Galerie de projets étendue

3. **Intégrations supplémentaires**:
   - Google My Business
   - Reviews/Avis clients
   - Chat en direct (Tawk.to, Crisp)
   - Calendrier de rendez-vous

4. **Marketing**:
   - Campagnes Google Ads
   - Campagnes Facebook/Meta Ads
   - SEO local (Google My Business)
   - Réseaux sociaux

---

## ✅ Checklist Finale de Déploiement

- [ ] Configurer Google Analytics ID
- [ ] Configurer Meta Pixel ID
- [ ] Remplacer les logos (optionnel)
- [ ] Tester le formulaire de contact
- [ ] Tester sur mobile et desktop
- [ ] Vérifier tous les liens
- [ ] Tester le cookie consent
- [ ] Uploader sur l'hébergement
- [ ] Configurer le domaine `mlprenodesign.ca`
- [ ] Activer HTTPS/SSL
- [ ] Soumettre à Google Search Console
- [ ] Soumettre le sitemap (si créé)
- [ ] Tester en conditions réelles
- [ ] Vérifier les analytics
- [ ] 🚀 **SITE EN LIGNE!**

---

## 🆘 Support

Si vous rencontrez des problèmes:

1. **Formspree ne fonctionne pas**:
   - Vérifiez que l'endpoint est correct: `https://formspree.io/f/mvzbpwaw`
   - Vérifiez dans vos emails (spam aussi)
   - Consultez le dashboard Formspree

2. **Google Analytics ne track pas**:
   - Vérifiez que l'ID est correct (format: G-XXXXXXXXXX)
   - Attendez 24-48h pour voir les données
   - Utilisez le rapport "Real-Time" pour tests immédiats
   - Installez Google Tag Assistant extension

3. **Meta Pixel ne track pas**:
   - Vérifiez que le Pixel ID est correct
   - Installez Meta Pixel Helper extension
   - Vérifiez dans Events Manager > Test Events

4. **Cookie consent ne s'affiche pas**:
   - Effacez le localStorage: `localStorage.clear()` dans la console
   - Rechargez la page
   - Vérifiez la console pour erreurs JavaScript

---

**Bon déploiement! 🚀**

*MLP Reno & Design - Site web professionnel prêt pour la production*
