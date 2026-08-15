-- Étape 8: création automatique du profil client à l'inscription.
-- Utilise un trigger sur auth.users plutôt qu'un insert côté client, car si
-- la confirmation par email est activée dans Supabase, aucune session
-- active n'existe juste après signUp() -> l'insert RLS échouerait (auth.uid()
-- non défini). Le trigger, en SECURITY DEFINER, fonctionne dans tous les cas.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
