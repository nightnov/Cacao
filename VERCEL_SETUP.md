# 🚀 Configuration Vercel - Variables d'environnement

## Étapes à faire dans Vercel Dashboard :

1. Va sur **vercel.com** → Dashboard → Sélectionne le projet **"cacao"**

2. Clique sur **"Settings"** (en haut du projet)

3. Dans le menu à gauche, clique sur **"Environment Variables"**

4. Ajoute les 2 variables :

### Variable 1 : NEXT_PUBLIC_SUPABASE_URL
- **Name** : `NEXT_PUBLIC_SUPABASE_URL`
- **Value** : `https://qzwiypdanasiwqihajpv.supabase.co`
- **Environments** : Checkboxe Production, Preview, Development
- Clique **"Add"**

### Variable 2 : NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Name** : `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value** : `sb_publishable_eorg-etFsgkkB6Yy0EhZoA_NX5nbPpZ`
- **Environments** : Checkboxe Production, Preview, Development
- Clique **"Add"**

## Après avoir ajouté les variables :

1. Va dans **"Deployments"** (menu haut)
2. Clique sur le dernier déploiement (le plus récent)
3. Clique sur **"Redeploy"** pour redéployer avec les nouvelles variables
4. Attends ~2-3 minutes

Le site devrait maintenant être accessible sur **cacao-ivory.vercel.app** sans erreur 404 ! ✅

## Notes importantes :

- Les variables doivent être ajoutées AVANT le redéploiement (ou le redéploiement ne les verra pas)
- Si tu vois toujours 404 après, attends 5 minutes et force un refresh (Ctrl+Shift+R)
- Si le site affiche une erreur, va dans "Functions" (Vercel) pour voir les logs

---

**Fait ça maintenant et dis-moi quand c'est fait !** ✨
