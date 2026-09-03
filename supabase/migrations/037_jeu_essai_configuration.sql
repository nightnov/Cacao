-- ═══════════════════════════════════════════════════════════════════════════
-- JEU D'ESSAI — à n'exécuter que pour voir la fiche produit fonctionner
--
-- Ce fichier n'est PAS une migration de production. Il pose une configuration
-- complète (Couleur, Stockage, Mémoire vive, Processeur) sur le SEUL produit
-- nommé « Test Variantes », afin de rendre visibles les sélecteurs, les deux
-- résumés de configuration et la section Description par option.
--
-- Aucun autre produit n'est touché. La requête d'effacement est en bas.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  p_id UUID;
  o_id UUID;
BEGIN
  SELECT id INTO p_id FROM products WHERE name ILIKE 'Test Variantes' LIMIT 1;
  IF p_id IS NULL THEN
    RAISE NOTICE 'Produit « Test Variantes » introuvable, rien fait.';
    RETURN;
  END IF;

  -- On repart de zéro pour que le script soit rejouable sans doublon.
  DELETE FROM product_options WHERE product_id = p_id;

  -- ── Couleur : un supplément par teinte, aucun bloc explicatif ────────────
  INSERT INTO product_options (product_id, name, sort_order, selection_mode)
    VALUES (p_id, 'Couleur', 0, 'single') RETURNING id INTO o_id;
  INSERT INTO product_option_values (option_id, label, price_delta_fcfa, is_default, sort_order) VALUES
    (o_id, 'Noir',      0,     TRUE,  0),
    (o_id, 'Blanc',     15000, FALSE, 1),
    (o_id, 'Bleu nuit', 25000, FALSE, 2);

  -- ── Stockage ────────────────────────────────────────────────────────────
  INSERT INTO product_options (product_id, name, sort_order, selection_mode)
    VALUES (p_id, 'Stockage', 1, 'single') RETURNING id INTO o_id;
  INSERT INTO product_option_values
    (option_id, label, price_delta_fcfa, is_default, sort_order, block_title, block_body) VALUES
    (o_id, '512 Go SSD', 0, TRUE, 0, 'Le stockage, en clair',
     'Le stockage est l''espace où vivent vos fichiers quand la machine est éteinte : vos documents, vos photos, vos logiciels. 512 Go conviennent à un usage courant, bureautique et navigation, avec de la place pour quelques milliers de photos.'),
    (o_id, '1 To SSD', 60000, FALSE, 1, 'Le stockage, en clair',
     '1 To, c''est le double de la capacité courante. Utile si vous conservez des vidéos, de gros dossiers de photos ou plusieurs jeux installés en même temps.'),
    (o_id, '2 To SSD', 140000, FALSE, 2, 'Le stockage, en clair',
     '2 To s''adressent à ceux qui montent des vidéos ou gardent des archives volumineuses sur la machine plutôt que sur un disque externe.');

  -- ── Mémoire vive ────────────────────────────────────────────────────────
  INSERT INTO product_options (product_id, name, sort_order, selection_mode)
    VALUES (p_id, 'Mémoire vive', 2, 'single') RETURNING id INTO o_id;
  INSERT INTO product_option_values
    (option_id, label, price_delta_fcfa, is_default, sort_order, block_title, block_body) VALUES
    (o_id, '8 Go', 0, TRUE, 0, 'La mémoire vive, en clair',
     'La mémoire vive est le plan de travail de l''ordinateur : plus elle est grande, plus vous pouvez garder de choses ouvertes en même temps sans ralentissement. 8 Go suffisent pour la bureautique et quelques onglets.'),
    (o_id, '16 Go', 45000, FALSE, 1, 'La mémoire vive, en clair',
     '16 Go permettent de laisser ouverts un navigateur chargé, une suite bureautique et un logiciel lourd sans que la machine peine.'),
    (o_id, '32 Go', 110000, FALSE, 2, 'La mémoire vive, en clair',
     '32 Go visent le montage vidéo, la 3D ou les machines virtuelles. Au delà de ces usages, la différence ne se ressent pas.');

  -- ── Processeur ──────────────────────────────────────────────────────────
  INSERT INTO product_options (product_id, name, sort_order, selection_mode)
    VALUES (p_id, 'Processeur', 3, 'single') RETURNING id INTO o_id;
  INSERT INTO product_option_values
    (option_id, label, price_delta_fcfa, is_default, sort_order, block_title, block_body) VALUES
    (o_id, 'Core i5', 0, TRUE, 0, 'Le processeur, en clair',
     'Le processeur est la pièce qui exécute les calculs : c''est lui qui décide de la rapidité générale. Un Core i5 couvre la bureautique, la navigation et la retouche photo légère.'),
    (o_id, 'Core i7', 90000, FALSE, 1, 'Le processeur, en clair',
     'Un Core i7 apporte de la marge sur les tâches longues : export vidéo, gros tableurs, plusieurs logiciels exigeants ouverts ensemble.'),
    (o_id, 'Ryzen 7', 75000, FALSE, 2, 'Le processeur, en clair',
     'Le Ryzen 7 joue dans la même catégorie que le Core i7, avec un avantage sur les traitements qui savent occuper plusieurs cœurs à la fois.');
END $$;

-- ── Pour tout effacer plus tard ──────────────────────────────────────────
-- DELETE FROM product_options
--   WHERE product_id = (SELECT id FROM products WHERE name ILIKE 'Test Variantes');
