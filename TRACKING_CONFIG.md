# 🎯 Configuration Rapide du Tracking

## ⚡ Actions Requises Avant Déploiement

### 1️⃣ Google Analytics 4

**Où obtenir l'ID**:
- Allez sur: https://analytics.google.com/
- Créez une propriété GA4
- Trouvez votre ID de mesure (format: `G-XXXXXXXXXX`)

**Où remplacer dans le code**:

📁 **site/index.html** - Ligne 107:
```html
<!-- AVANT -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>

<!-- APRÈS -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-VOTRE_ID_ICI"></script>
```

📁 **site/index.html** - Ligne 113:
```javascript
// AVANT
gtag('config', 'G-XXXXXXXXXX');

// APRÈS
gtag('config', 'G-VOTRE_ID_ICI');
```

📁 **site/js/main.js** - Ligne 237:
```javascript
// AVANT
gtag('config', 'G-XXXXXXXXXX');

// APRÈS
gtag('config', 'G-VOTRE_ID_ICI');
```

---

### 2️⃣ Meta Pixel (Facebook)

**Où obtenir l'ID**:
- Allez sur: https://business.facebook.com/
- Events Manager → Pixels
- Créez un pixel ou utilisez un existant
- Copiez votre Pixel ID (format: numérique, ex: `123456789012345`)

**Où remplacer dans le code**:

📁 **site/index.html** - Ligne 126:
```javascript
// AVANT
fbq('init', 'YOUR_PIXEL_ID_HERE');

// APRÈS
fbq('init', '123456789012345');  // Votre ID ici
```

📁 **site/index.html** - Ligne 129:
```html
<!-- AVANT -->
src="https://www.facebook.com/tr?id=YOUR_PIXEL_ID_HERE&ev=PageView&noscript=1"

<!-- APRÈS -->
src="https://www.facebook.com/tr?id=123456789012345&ev=PageView&noscript=1"
```

📁 **site/js/main.js** - Ligne 242:
```javascript
// AVANT
fbq('init', 'YOUR_PIXEL_ID_HERE');

// APRÈS
fbq('init', '123456789012345');  // Votre ID ici
```

---

## 🔍 Recherche Rapide (Find & Replace)

### Pour Google Analytics:
**Rechercher**: `G-XXXXXXXXXX`
**Remplacer par**: Votre ID Google Analytics (ex: `G-ABC123XYZ`)

**Fichiers concernés**:
- `site/index.html` (2 occurrences)
- `site/js/main.js` (1 occurrence)

### Pour Meta Pixel:
**Rechercher**: `YOUR_PIXEL_ID_HERE`
**Remplacer par**: Votre Meta Pixel ID (ex: `123456789012345`)

**Fichiers concernés**:
- `site/index.html` (2 occurrences)
- `site/js/main.js` (1 occurrence)

---

## ✅ Vérification

### Après avoir mis à jour les IDs:

1. **Vérifier Google Analytics**:
   - Ouvrez Google Analytics
   - Allez dans "Real-Time" → "Overview"
   - Visitez votre site
   - Vous devriez voir 1 utilisateur actif

2. **Vérifier Meta Pixel**:
   - Installez l'extension Chrome "Meta Pixel Helper"
   - Visitez votre site
   - L'extension doit montrer que le pixel est actif
   - OU allez dans Events Manager → Test Events

3. **Vérifier le Cookie Consent**:
   - Visitez votre site
   - La bannière de cookies doit apparaître après 1 seconde
   - Cliquez "Accepter"
   - Rechargez la page → la bannière ne doit pas réapparaître
   - Effacez le localStorage pour la voir à nouveau:
     ```javascript
     localStorage.clear()
     ```

---

## 🎯 Événements Trackés

### Automatiquement trackés:
- ✅ **PageView**: Chaque fois qu'un utilisateur visite le site
- ✅ **Contact Form Submit**: Quand le formulaire est soumis avec succès

### Événements Google Analytics:
```javascript
gtag('event', 'form_submit', {
  'event_category': 'Contact',
  'event_label': 'Contact Form'
});
```

### Événements Meta Pixel:
```javascript
fbq('track', 'Contact');  // Soumission de formulaire
fbq('track', 'PageView');  // Vue de page
```

---

## 🚨 Erreurs Courantes

### ❌ "gtag is not defined"
**Cause**: L'ID Google Analytics n'est pas configuré ou le script n'est pas chargé
**Solution**: Vérifiez que l'ID est correct et que le script Google Analytics est dans le `<head>`

### ❌ "fbq is not defined"
**Cause**: L'ID Meta Pixel n'est pas configuré ou le script n'est pas chargé
**Solution**: Vérifiez que l'ID est correct et que le script Meta Pixel est dans le `<head>`

### ❌ Les données n'apparaissent pas dans Google Analytics
**Cause**: Délai de traitement
**Solution**: Attendez 24-48h OU utilisez le rapport "Real-Time" pour voir les données immédiates

### ❌ Le tracking ne fonctionne que parfois
**Cause**: L'utilisateur a refusé les cookies
**Solution**: C'est normal! Le tracking respecte le choix de l'utilisateur

---

## 📝 Notes Importantes

1. **Consentement des Cookies**:
   - Le tracking ne s'active QUE si l'utilisateur accepte les cookies
   - Si l'utilisateur refuse, aucun tracking n'est effectué
   - C'est conforme au RGPD et aux lois sur la vie privée

2. **LocalStorage**:
   - Le choix de l'utilisateur est sauvegardé dans `localStorage`
   - Clé: `cookieConsent`
   - Valeurs possibles: `'accepted'` ou `'declined'`

3. **Testing**:
   - Pour tester à nouveau la bannière de cookies:
     ```javascript
     localStorage.removeItem('cookieConsent');
     location.reload();
     ```

4. **Production**:
   - Remplacez TOUJOURS les placeholders avant le déploiement
   - Testez le tracking en mode "Real-Time" avant de déclarer le site prêt

---

## 🛠️ Outils Recommandés

### Chrome Extensions:
- **Google Tag Assistant**: Vérifie Google Analytics
- **Meta Pixel Helper**: Vérifie Meta Pixel
- **Cookie Inspector**: Voir les cookies du site

### Services:
- **Google Analytics Debugger**: Pour debug détaillé
- **Facebook Test Events**: Pour tester Meta Pixel

---

**Bonne configuration! 🎯**
