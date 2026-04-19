import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useLanguage } from '@/hooks/useLanguage';
import { motion } from 'framer-motion';
import { Bot, Check, ArrowRight, Zap, Shield, Code2, Globe, Sparkles, Phone, Mail, ExternalLink, Languages, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentModal } from '@/components/tivo/PaymentModal';
import { BrandLogo } from '@/components/tivo/BrandLogo';

const VERSION = '7.1.0';

const SocialIcon = ({ type }: { type: string }) => {
  const icons: Record<string, string> = {
    facebook_url: '📘', youtube_url: '▶️', instagram_url: '📸', tiktok_url: '🎵',
  };
  return <span className="text-sm">{icons[type] || '🔗'}</span>;
};

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const { lang, setLang, t } = useLanguage();
  const [paymentPlan, setPaymentPlan] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('desktop');

  // Apply view mode by clamping page width
  useEffect(() => {
    const root = document.documentElement;
    if (viewMode === 'mobile') {
      root.style.setProperty('--forced-max-w', '420px');
    } else {
      root.style.removeProperty('--forced-max-w');
    }
    return () => root.style.removeProperty('--forced-max-w');
  }, [viewMode]);

  const plans = [
    {
      id: 'free',
      name: t('Free', 'Free'),
      price: '০',
      period: t('/মাস', '/mo'),
      features: [
        t('৫ ডেইলি ক্রেডিট', '5 daily credits'),
        t('৫০ মান্থলি ক্রেডিট', '50 monthly credits'),
        t('বেসিক AI চ্যাট', 'Basic AI chat'),
        t('GitHub ইন্টিগ্রেশন', 'GitHub integration'),
      ],
      cta: t('ফ্রিতে শুরু করুন', 'Start Free'),
      popular: false,
    },
    {
      id: 'standard',
      name: t('Standard', 'Standard'),
      price: '২৯৯',
      period: t('৳/মাস', '৳/mo'),
      features: [
        t('৫০ ডেইলি ক্রেডিট', '50 daily credits'),
        t('১০০০ মান্থলি ক্রেডিট', '1000 monthly credits'),
        t('সকল AI মোড', 'All AI modes'),
        t('Vercel ডিপ্লয়', 'Vercel deploy'),
        t('অটোমেশন', 'Automation'),
        t('প্রায়োরিটি সাপোর্ট', 'Priority support'),
      ],
      cta: t('Standard নিন', 'Get Standard'),
      popular: true,
    },
    {
      id: 'pro',
      name: t('Pro', 'Pro'),
      price: '৯৯৯',
      period: t('৳/মাস', '৳/mo'),
      features: [
        t('আনলিমিটেড ক্রেডিট', 'Unlimited credits'),
        t('সকল ফিচার', 'All features'),
        t('কাস্টম API কনফিগ', 'Custom API config'),
        t('টিম কলাবোরেশন', 'Team collaboration'),
        t('অ্যাডভান্সড অটোমেশন', 'Advanced automation'),
        t('ডেডিকেটেড সাপোর্ট', 'Dedicated support'),
      ],
      cta: t('Pro নিন', 'Get Pro'),
      popular: false,
    },
  ];

  const features = [
    { icon: Code2, title: t('AI কোড জেনারেশন', 'AI Code Gen'), desc: t('প্রম্পট দিন, কোড পান — GitHub-এ সরাসরি পুশ করুন।', 'Prompt in, code out — push to GitHub instantly.') },
    { icon: Zap, title: t('অটোমেশন', 'Automation'), desc: t('GitHub Actions ট্রিগার, Vercel ডিপ্লয় — সব অটোমেটিক।', 'GitHub Actions, Vercel deploy — fully automated.') },
    { icon: Shield, title: t('সিকিউর টোকেন', 'Secure Tokens'), desc: t('আপনার API কীগুলো শুধু আপনার ব্রাউজারে — আমরা দেখি না।', 'Your API keys stay in your browser — we never see them.') },
    { icon: Globe, title: t('ওয়ান-ক্লিক পাবলিশ', 'One-click Publish'), desc: t('প্রজেক্ট তৈরি করুন, প্রিভিউ দেখুন, লিঙ্ক শেয়ার করুন।', 'Build, preview, share — all in one click.') },
  ];

  const handlePlanSelect = (planId: string) => {
    if (!user) { navigate('/auth'); return; }
    if (planId === 'free') { navigate('/dashboard'); } else { setPaymentPlan(planId); }
  };

  const paymentNumbers = [
    { key: 'bkash_number', label: t('বিকাশ', 'bKash'), color: 'from-pink-500/20 to-pink-600/10', emoji: '💳' },
    { key: 'nagad_number', label: t('নগদ', 'Nagad'), color: 'from-orange-500/20 to-orange-600/10', emoji: '💰' },
    { key: 'rocket_number', label: t('রকেট', 'Rocket'), color: 'from-purple-500/20 to-purple-600/10', emoji: '🚀' },
  ].filter(p => settings[p.key]);

  const socialLinks = ['facebook_url', 'youtube_url', 'instagram_url', 'tiktok_url'].filter(k => settings[k]);
  const hasContact = settings.contact_email || settings.contact_phone;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Page-wide width clamp wrapper for mobile preview mode */}
      <div
        className="mx-auto transition-all duration-300"
        style={viewMode === 'mobile' ? { maxWidth: '420px', boxShadow: '0 0 0 1px hsl(var(--border))', minHeight: '100vh' } : {}}
      >
        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <BrandLogo size={28} />
              <span className="font-bold text-lg gradient-text truncate">TIVO DEV</span>
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-mono shrink-0">v{VERSION}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Language switcher */}
              <button
                onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-xs font-semibold text-muted-foreground hover:text-foreground"
                aria-label="Toggle language"
              >
                <Languages className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'বাং' : 'EN'}</span>
              </button>
              {/* View mode toggle (hidden on smaller screens — only useful on big ones) */}
              <div className="hidden sm:flex items-center bg-muted/30 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('desktop')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'desktop' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-label="Desktop view"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('mobile')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'mobile' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-label="Mobile view"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
              <Button onClick={() => navigate(user ? '/dashboard' : '/auth')} className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
                {user ? t('ড্যাশবোর্ড', 'Dashboard') : t('শুরু করুন', 'Get Started')} <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative pt-28 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
                <Sparkles className="w-3.5 h-3.5" /> {t('Autonomous AI SaaS Platform', 'Autonomous AI SaaS Platform')} v{VERSION}
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
                <span className="gradient-text">TIVO DEV AGENT</span><br />
                <span className="text-foreground">{t('আপনার AI ডেভেলপমেন্ট পার্টনার', 'Your AI Development Partner')}</span>
              </h1>
              <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
                {t(
                  'কোড লিখুন, GitHub-এ পুশ করুন, Vercel-এ ডিপ্লয় করুন — সবকিছু একটি চ্যাট উইন্ডো থেকে।',
                  'Write code, push to GitHub, deploy on Vercel — all from one chat window.'
                )}
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex gap-3 justify-center flex-wrap">
              <Button onClick={() => navigate(user ? '/dashboard' : '/auth')} size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-base px-6">
                <Bot className="w-5 h-5" /> {t('শুরু করুন', 'Get Started')}
              </Button>
              <Button variant="outline" size="lg" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="text-base px-6">
                {t('প্ল্যান দেখুন', 'View Plans')}
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 text-foreground">{t('কেন TIVO DEV?', 'Why TIVO DEV?')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((f, i) => (
                <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                  className="glass-card rounded-xl p-5 space-y-3 card-hover">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-foreground">{t('প্ল্যান বেছে নিন', 'Choose a Plan')}</h2>
            <p className="text-center text-muted-foreground mb-6">{t('বিকাশ, নগদ বা রকেট দিয়ে পেমেন্ট করুন', 'Pay with bKash, Nagad or Rocket')}</p>

            {/* Payment Numbers from Admin */}
            {paymentNumbers.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {paymentNumbers.map(({ key, label, color, emoji }) => (
                  <div key={key} className={`bg-gradient-to-r ${color} border border-border/30 rounded-xl px-4 py-2.5 flex items-center gap-2`}>
                    <span className="text-lg">{emoji}</span>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                      <p className="text-sm font-bold text-foreground font-mono">{settings[key]}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map((plan, i) => (
                <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                  className={`relative glass-card rounded-2xl p-6 space-y-5 card-hover ${plan.popular ? 'border-primary/40 ring-1 ring-primary/20' : ''}`}>
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full bg-primary text-primary-foreground">{t('জনপ্রিয়', 'Popular')}</span>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-extrabold gradient-text">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button onClick={() => handlePlanSelect(plan.id)}
                    className={`w-full gap-2 ${plan.popular ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}>
                    {plan.cta} <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact & Footer */}
        <footer className="border-t border-border py-10 px-4">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Contact info from admin */}
            {(hasContact || socialLinks.length > 0) && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pb-6 border-b border-border/50">
                {settings.contact_email && (
                  <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="w-4 h-4 text-primary" /> {settings.contact_email}
                  </a>
                )}
                {settings.contact_phone && (
                  <a href={`tel:${settings.contact_phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Phone className="w-4 h-4 text-primary" /> {settings.contact_phone}
                  </a>
                )}
                {socialLinks.length > 0 && (
                  <div className="flex items-center gap-3">
                    {socialLinks.map(key => (
                      <a key={key} href={settings[key]} target="_blank" rel="noopener noreferrer"
                        className="w-9 h-9 rounded-xl glass-card flex items-center justify-center hover:bg-primary/10 transition-colors">
                        <SocialIcon type={key} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <BrandLogo size={20} />
                <span className="font-bold gradient-text">TIVO DEV AGENT</span>
                <span className="text-[9px] text-muted-foreground font-mono">v{VERSION}</span>
              </div>
              <p className="text-xs text-muted-foreground">© 2026 TIVO DEV. {t('সকল অধিকার সংরক্ষিত।', 'All rights reserved.')}</p>
            </div>
          </div>
        </footer>
      </div>

      <PaymentModal plan={paymentPlan} onClose={() => setPaymentPlan(null)} />
    </div>
  );
};

export default Index;
