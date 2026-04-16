import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { motion } from 'framer-motion';
import { Bot, Check, ArrowRight, Zap, Shield, Code2, Globe, Sparkles, Phone, Mail, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentModal } from '@/components/tivo/PaymentModal';
import { BrandLogo } from '@/components/tivo/BrandLogo';

const plans = [
  {
    id: 'free', name: 'Free', price: '০', period: '/মাস',
    features: ['৫ ডেইলি ক্রেডিট', '৫০ মান্থলি ক্রেডিট', 'বেসিক AI চ্যাট', 'GitHub ইন্টিগ্রেশন'],
    cta: 'ফ্রিতে শুরু করুন', popular: false,
  },
  {
    id: 'standard', name: 'Standard', price: '২৯৯', period: '৳/মাস',
    features: ['৫০ ডেইলি ক্রেডিট', '১০০০ মান্থলি ক্রেডিট', 'সকল AI মোড', 'Vercel ডিপ্লয়', 'অটোমেশন', 'প্রায়োরিটি সাপোর্ট'],
    cta: 'Standard নিন', popular: true,
  },
  {
    id: 'pro', name: 'Pro', price: '৯৯৯', period: '৳/মাস',
    features: ['আনলিমিটেড ক্রেডিট', 'সকল ফিচার', 'কাস্টম API কনফিগ', 'টিম কলাবোরেশন', 'অ্যাডভান্সড অটোমেশন', 'ডেডিকেটেড সাপোর্ট'],
    cta: 'Pro নিন', popular: false,
  },
];

const features = [
  { icon: Code2, title: 'AI কোড জেনারেশন', desc: 'প্রম্পট দিন, কোড পান — GitHub-এ সরাসরি পুশ করুন।' },
  { icon: Zap, title: 'অটোমেশন', desc: 'GitHub Actions ট্রিগার, Vercel ডিপ্লয় — সব অটোমেটিক।' },
  { icon: Shield, title: 'সিকিউর টোকেন', desc: 'আপনার API কীগুলো শুধু আপনার ব্রাউজারে — আমরা দেখি না।' },
  { icon: Globe, title: 'ওয়ান-ক্লিক পাবলিশ', desc: 'প্রজেক্ট তৈরি করুন, প্রিভিউ দেখুন, লিঙ্ক শেয়ার করুন।' },
];

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
  const [paymentPlan, setPaymentPlan] = useState<string | null>(null);

  const handlePlanSelect = (planId: string) => {
    if (!user) { navigate('/auth'); return; }
    if (planId === 'free') { navigate('/dashboard'); } else { setPaymentPlan(planId); }
  };

  const paymentNumbers = [
    { key: 'bkash_number', label: 'বিকাশ', color: 'from-pink-500/20 to-pink-600/10', emoji: '💳' },
    { key: 'nagad_number', label: 'নগদ', color: 'from-orange-500/20 to-orange-600/10', emoji: '💰' },
    { key: 'rocket_number', label: 'রকেট', color: 'from-purple-500/20 to-purple-600/10', emoji: '🚀' },
  ].filter(p => settings[p.key]);

  const socialLinks = ['facebook_url', 'youtube_url', 'instagram_url', 'tiktok_url'].filter(k => settings[k]);
  const hasContact = settings.contact_email || settings.contact_phone;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <BrandLogo size={28} />
            <span className="font-bold text-lg gradient-text">TIVO DEV</span>
            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-mono">v7.0</span>
          </div>
          <Button onClick={() => navigate(user ? '/dashboard' : '/auth')} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
            {user ? 'ড্যাশবোর্ড' : 'Get Started'} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Autonomous AI SaaS Platform v7.0
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
              <span className="gradient-text">TIVO DEV AGENT</span><br />
              <span className="text-foreground">আপনার AI ডেভেলপমেন্ট পার্টনার</span>
            </h1>
            <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
              কোড লিখুন, GitHub-এ পুশ করুন, Vercel-এ ডিপ্লয় করুন — সবকিছু একটি চ্যাট উইন্ডো থেকে।
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex gap-3 justify-center">
            <Button onClick={() => navigate(user ? '/dashboard' : '/auth')} size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-base px-6">
              <Bot className="w-5 h-5" /> শুরু করুন
            </Button>
            <Button variant="outline" size="lg" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="text-base px-6">
              প্ল্যান দেখুন
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 text-foreground">কেন TIVO DEV?</h2>
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
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-foreground">প্ল্যান বেছে নিন</h2>
          <p className="text-center text-muted-foreground mb-6">বিকাশ, নগদ বা রকেট দিয়ে পেমেন্ট করুন</p>

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
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full bg-primary text-primary-foreground">জনপ্রিয়</span>
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
              <span className="text-[9px] text-muted-foreground font-mono">v7.0.0</span>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 TIVO DEV. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <PaymentModal plan={paymentPlan} onClose={() => setPaymentPlan(null)} />
    </div>
  );
};

export default Index;
