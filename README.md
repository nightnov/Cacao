# 🍫 Cacao — Boutique informatique

Boutique en ligne de matériel informatique (ordinateurs portables et de bureau) basée en Côte d'Ivoire.

## 🎯 Stack technique

- **Frontend** : Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Backend / DB** : Supabase (PostgreSQL + Auth + Storage)
- **Paiement** : MoneyFusion (Fusion Pay API)
- **Hosting** : Vercel (frontend) + Supabase (backend)
- **Animations** : Framer Motion
- **Components** : shadcn/ui, lucide-react

## 🚀 Démarrage local

### Prérequis
- Node.js 18+ installé
- npm ou yarn

### Installation

1. Clone le repo
```bash
git clone https://github.com/nightnov/Cacao.git
cd Cacao
```

2. Installe les dépendances
```bash
npm install
```

3. Configure les variables d'environnement
Crée un fichier `.env.local` à la racine :
```
NEXT_PUBLIC_SUPABASE_URL=https://qzwiypdanasiwqihajpv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_eorg-etFsgkkB6Yy0EhZoA_NX5nbPpZ
```

4. Lance le serveur de développement
```bash
npm run dev
```

Visite `http://localhost:3000` pour voir le site en local.

## 📋 Structure du projet

```
cacao/
├── app/              # Pages et routes Next.js
├── components/       # Composants React réutilisables
├── lib/              # Utilitaires, clients Supabase
├── public/           # Assets statiques (images, favicon)
├── styles/           # Stylesheets global
├── package.json      # Dépendances
└── README.md         # Ce fichier
```

## 🌐 Déploiement

Le projet est connecté à Vercel. À chaque push sur la branche `main`, le site est redéployé automatiquement sur `cacao-ivory.vercel.app`.

**Avant de déployer en production**, configure les variables d'environnement dans Vercel :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📝 Étapes de développement

1. Setup initial ✅
2. Design system + Layout global
3. Schéma de base de données Supabase
4. Pages statiques + Navbar/Footer
5. Catalogue produits + API
6. Fiche produit détail
7. Panier
8. Authentification client
9. Compte client + Historique
10. Tunnel de commande
11. Intégration MoneyFusion
12-15. Back-office admin
16. Tests + Déploiement production

## 📧 Support

Pour des questions ou des bugs, ouvre une issue sur GitHub.

---

Développé avec ❤️ en Côte d'Ivoire.
