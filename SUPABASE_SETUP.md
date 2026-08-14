# Supabase Setup - Étape 3

## Instructions pour configurer la base de données

### 1. Accède à Supabase Dashboard

Va sur **supabase.com** → Dashboard → Projet **"cacao"** → **SQL Editor**

### 2. Crée les tables et RLS policies

Copie le contenu du fichier **`supabase/migrations/001_create_tables.sql`** et colle-le dans l'SQL Editor de Supabase.

**Important:** Avant d'exécuter, remplace `'00000000-0000-0000-0000-000000000000'` (l'admin ID placeholder) par :
- Va dans **Supabase Dashboard** → **Authentication** → **Users**
- Cherche l'email `cacaoservice225@gmail.com`
- Copie son **User ID** (UUID)
- Remplace les 3 occurrences de `'00000000-0000-0000-0000-000000000000'` par ce UUID

Puis clique **Run** pour exécuter le script.

### 3. Insère les données de test

Copie le contenu du fichier **`supabase/migrations/002_insert_test_data.sql`** dans l'SQL Editor et clique **Run**.

Ça va insérer :
- ✅ 20 produits de test
- ✅ 5 villes Yango (Abidjan, Bouaké, Yamoussoukro, San-Pédro, Daloa)

### 4. Vérifie

Va dans **Supabase Dashboard** → **Table Editor** :
- Clique sur **products** — tu devrais voir les 20 produits ✅
- Clique sur **shipping_fees** — tu devrais voir les 5 villes ✅

Si tout est bon, la base de données est prête ! 🎉

---

## Erreurs courantes

**Erreur: "Permission denied"**
→ Tu n'as pas remplacé l'admin ID placeholder. Fais-le maintenant.

**Erreur: "Duplicate key value violates unique constraint"**
→ Les tables existent déjà. Va dans **SQL Editor** → **Show unused statements** → supprime les anciennes.

---

**Une fois c'est fait, dis-moi et on passe à l'Étape 4 !** ✅
