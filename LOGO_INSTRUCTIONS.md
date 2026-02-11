# Instructions pour les Logos d'Accréditation

## 📋 Logos à Remplacer

Les logos actuels sont des placeholders SVG. Pour utiliser les vrais logos officiels :

### 1. Sauvegarder les Logos

Extrayez les logos de vos captures d'écran et sauvegardez-les dans le dossier :
```
site/css/js/assets/images/logos/
```

### 2. Noms de Fichiers Requis

Remplacez ces fichiers SVG par les PNG/SVG officiels :

- **rbq-logo.svg** → Logo officiel de la Régie du bâtiment du Québec
- **cnesst-logo.svg** → Logo officiel de la CNESST
- **apchq-logo.svg** → Logo officiel de l'APCHQ
- **ccq-logo.svg** → Logo officiel de la CCQ

### 3. Formats Recommandés

- Format: PNG ou SVG
- Fond: Transparent de préférence
- Taille: Les logos s'afficheront à 64px de hauteur (width auto)

### 4. Sources Officielles

Vous pouvez télécharger les logos depuis :

- **RBQ**: https://www.rbq.gouv.qc.ca/
- **CNESST**: https://www.cnesst.gouv.qc.ca/
- **APCHQ**: https://www.apchq.com/
- **CCQ**: https://www.ccq.org/

### 5. Format PNG ou SVG

Si vous utilisez PNG :
- Modifiez l'extension dans `index.html` de `.svg` à `.png`
- Lignes concernées : 464, 469, 474, 479

Si vous utilisez SVG :
- Gardez l'extension `.svg` actuelle
- Remplacez simplement les fichiers

### 6. Vérification

Après remplacement, les logos :
- Apparaîtront en opacity 60% (légèrement transparents)
- Deviendront opacity 100% au survol
- Auront une bordure qui s'illumine au survol
- Une ombre apparaîtra au survol

---

**Note**: Les placeholders SVG actuels fonctionnent déjà, mais les logos officiels donneront un aspect plus professionnel au site.
