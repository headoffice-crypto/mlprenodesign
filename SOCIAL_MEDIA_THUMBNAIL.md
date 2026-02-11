# 🎨 Social Media Thumbnail / Preview Card Guide

## What is a Social Media Thumbnail?

When you share your website link via:
- 📱 WhatsApp, iMessage, SMS
- 📘 Facebook
- 🐦 Twitter / X
- 💼 LinkedIn
- 📧 Email

A **preview card** appears with an image, title, and description. This is what we've optimized!

---

## ✅ What's Already Set Up

Your site now has **enhanced social media meta tags** that will show:

### **Title**
```
MLP Reno & Design | Rénovation Résidentielle Montréal
```

### **Description**
```
✨ Entrepreneur général certifié RBQ • 15+ ans d'expérience
Cuisines, salles de bain, sous-sols • Montréal & Grand Montréal
Estimation gratuite ☎️ 1-844-484-8460
```

### **Image**
Currently using: `Salon TD.jpg` (one of your existing photos)

---

## 🎯 Creating a Custom Thumbnail Image (Optional)

For **maximum impact**, create a custom social media thumbnail instead of using a photo.

### **Recommended Image Specifications**

| Platform | Optimal Size | Aspect Ratio |
|----------|-------------|--------------|
| Facebook/WhatsApp | 1200 x 630px | 1.91:1 |
| Twitter | 1200 x 675px | 16:9 |
| LinkedIn | 1200 x 627px | 1.91:1 |
| **Universal** | **1200 x 630px** | **1.91:1** ✅ |

**Format**: JPG or PNG
**Max Size**: Under 5MB (smaller is better)
**File Name**: `social-preview.jpg` or `og-image.jpg`

---

## 🎨 Design Your Thumbnail

### **Option 1: Use Canva (Free & Easy)**

1. Go to https://www.canva.com/
2. Search for "Facebook Post" template (1200 x 630px)
3. Create a design with:
   - **Background**: Dark (#1a1f2e) or a nice photo
   - **Your logo** "M" with "MLP RENO & DESIGN"
   - **Headline**: "RÉNOVATION RÉSIDENTIELLE"
   - **Subheadline**: "Montréal & Grand Montréal"
   - **Call-to-action**: "Estimation Gratuite • RBQ Certifié"
   - **Phone**: "1-844-484-8460"
   - **Icons**: Add small icons for services (kitchen, bathroom, etc.)

### **Example Layout**

```
┌─────────────────────────────────────────────────┐
│  [M Logo]  MLP RENO & DESIGN                   │
│                                                 │
│         RÉNOVATION RÉSIDENTIELLE                │
│            À MONTRÉAL                           │
│                                                 │
│  ✓ 15+ ans d'expérience   ✓ Licence RBQ       │
│  ✓ Estimation gratuite    ✓ Qualité garantie  │
│                                                 │
│  📞 1-844-484-8460                             │
│                                                 │
│  [Background: Modern kitchen/bathroom image]    │
└─────────────────────────────────────────────────┘
```

### **Option 2: Use Figma (Free)**

1. Go to https://www.figma.com/
2. Create new frame: 1200 x 630px
3. Design with your branding
4. Export as JPG

### **Option 3: Hire on Fiverr**

- Search "social media thumbnail design"
- Budget: $5-25
- Provide your logo, colors, and text
- Get professional result in 1-2 days

---

## 📁 How to Add Your Custom Thumbnail

Once you have your custom image:

1. **Save it in the images folder**:
   ```
   site/css/js/assets/images/social-preview.jpg
   ```

2. **Update index.html** (Line 19 & 28):

   **Before**:
   ```html
   <meta property="og:image" content="https://mlprenodesign.ca/css/js/assets/images/Salon TD.jpg">
   <meta name="twitter:image" content="https://mlprenodesign.ca/css/js/assets/images/Salon TD.jpg">
   ```

   **After**:
   ```html
   <meta property="og:image" content="https://mlprenodesign.ca/css/js/assets/images/social-preview.jpg">
   <meta name="twitter:image" content="https://mlprenodesign.ca/css/js/assets/images/social-preview.jpg">
   ```

3. **Clear cache** when testing:
   - Facebook: https://developers.facebook.com/tools/debug/
   - Twitter: https://cards-dev.twitter.com/validator
   - LinkedIn: https://www.linkedin.com/post-inspector/

---

## 🧪 Testing Your Preview

### **After deploying your site**:

1. **Facebook Sharing Debugger**
   - Go to: https://developers.facebook.com/tools/debug/
   - Enter your URL: `https://mlprenodesign.ca`
   - Click "Scrape Again" to refresh
   - See preview of how it looks on Facebook/WhatsApp

2. **Twitter Card Validator**
   - Go to: https://cards-dev.twitter.com/validator
   - Enter your URL
   - See preview for Twitter

3. **LinkedIn Post Inspector**
   - Go to: https://www.linkedin.com/post-inspector/
   - Enter your URL
   - See preview for LinkedIn

4. **Test in Messages**
   - Send the link to yourself via WhatsApp/iMessage
   - The preview card should appear automatically

---

## 💡 Pro Tips

### **Do's**
- ✅ Use high contrast (dark bg + white text OR vice versa)
- ✅ Include your logo prominently
- ✅ Keep text large and readable (even at small sizes)
- ✅ Show your phone number clearly
- ✅ Use professional, high-quality images
- ✅ Include key selling points (RBQ, 15+ years, etc.)

### **Don'ts**
- ❌ Don't use tiny text (won't be readable on mobile)
- ❌ Don't overcrowd with too much information
- ❌ Don't use low-quality or blurry images
- ❌ Don't forget to compress the image (use TinyPNG.com)

---

## 🎯 Quick Win Template Text

If you're creating in Canva, use this text:

**Headline (Large)**:
```
RÉNOVATION RÉSIDENTIELLE
```

**Subheadline (Medium)**:
```
Montréal & Grand Montréal
```

**Bullets (Small)**:
```
✓ 15+ ans d'expérience    ✓ Licence RBQ certifié
✓ Estimation gratuite     ✓ Qualité garantie
```

**Call to Action (Medium)**:
```
📞 1-844-484-8460
mlprenodesign.ca
```

---

## 🔍 How It Looks Now

With your current settings, when someone shares your link, they'll see:

**Preview Card**:
```
┌─────────────────────────────────────┐
│  [Image: Salon TD.jpg]              │
│                                     │
│  MLP Reno & Design | Rénovation... │
│  ✨ Entrepreneur général certifié  │
│  RBQ • 15+ ans d'expérience •...   │
│                                     │
│  MLPRENODESIGN.CA                   │
└─────────────────────────────────────┘
```

This already looks **professional**, but a **custom designed thumbnail** would make it even more impactful!

---

## 📊 Impact of Good Thumbnails

Studies show that links with:
- **Professional thumbnails** get **2-3x more clicks**
- **Clear text + images** get **40% more engagement**
- **Phone numbers visible** get **50% more calls**

---

## 🚀 Current Status

✅ **Meta tags configured** - Ready for social sharing
✅ **Title optimized** - Professional and clear
✅ **Description enhanced** - Includes emojis and phone
✅ **Image set** - Using your existing photo
⏳ **Custom thumbnail** - Optional upgrade (recommended)

---

## 📞 Need Help?

If you want to create a custom thumbnail but need help:

1. **Canva**: Free templates + drag-and-drop
2. **Fiverr**: $10-20 for professional design
3. **Local designer**: Ask for "social media OG image 1200x630px"

---

**Your site is ready to share! 🎉**

When deployed, your links will look professional on all platforms.
