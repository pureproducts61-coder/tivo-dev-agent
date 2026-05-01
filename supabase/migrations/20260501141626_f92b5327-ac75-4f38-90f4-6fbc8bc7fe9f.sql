DROP POLICY IF EXISTS "Public can view safe site settings" ON public.system_config;
CREATE POLICY "Public can view safe site settings"
ON public.system_config
FOR SELECT
TO public
USING (key IN (
  'bkash_number', 'nagad_number', 'rocket_number',
  'contact_email', 'contact_phone',
  'facebook_url', 'youtube_url', 'instagram_url', 'tiktok_url',
  'landing_content'
));