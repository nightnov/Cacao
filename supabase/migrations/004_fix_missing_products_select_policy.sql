-- BUG CRITIQUE trouvé en production le 2026-08-14: la policy de lecture
-- publique sur products (products_public_read, définie dans 001_create_tables.sql)
-- n'existait PAS réellement sur la base live, alors que les policies
-- d'écriture (INSERT/UPDATE/DELETE) admin étaient bien présentes.
--
-- Conséquence: RLS étant activé sans aucune policy SELECT, PostgREST (et donc
-- toute l'app + l'API publique) ne retournait JAMAIS aucune ligne de products,
-- pour personne — ni les visiteurs, ni même l'admin connecté. Seul l'éditeur
-- SQL (accès direct, RLS ignorée) voyait les données, ce qui a rendu le bug
-- très difficile à diagnostiquer: les créations de produits réussissaient
-- (HTTP 201, la policy INSERT fonctionnait), mais devenaient invisibles
-- immédiatement après pour absolument tout le monde.
--
-- Vérifié via pg_policies sur la base live: seules products_admin_delete,
-- products_admin_update et products_admin_write existaient. Confirmé résolu
-- après ajout de cette policy: l'API REST voit immédiatement toutes les lignes.
DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read" ON products FOR SELECT USING (true);
