import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SITE_KEYS = [
  'bkash_number', 'nagad_number', 'rocket_number',
  'contact_email', 'contact_phone',
  'facebook_url', 'youtube_url', 'instagram_url', 'tiktok_url',
];

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await supabase.from('system_config').select('key, value').in('key', SITE_KEYS);
        const s: Record<string, string> = {};
        data?.forEach((d: any) => { s[d.key] = d.value; });
        setSettings(s);
      } catch {} finally { setLoading(false); }
    };
    fetch();
  }, []);

  return { settings, loading };
};
