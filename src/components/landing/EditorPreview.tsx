import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { 
  Play, 
  Terminal, 
  FileCode, 
  FolderTree,
  Circle,
  Minus,
  X,
  ChevronRight,
  Send
} from "lucide-react";

export const EditorPreview = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            শক্তিশালী <span className="gradient-text">ডেভেলপমেন্ট এনভায়রনমেন্ট</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI চ্যাট দিয়ে কোড করুন, রিয়েল-টাইম প্রিভিউ দেখুন
          </p>
        </motion.div>

        {/* Editor Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto"
        >
          <GlassCard className="p-0 overflow-hidden" hover={false}>
            {/* Window Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50">
              <div className="flex items-center gap-2">
                <div className="flex gap-2">
                  <Circle className="w-3 h-3 fill-destructive text-destructive" />
                  <Circle className="w-3 h-3 fill-accent text-accent" />
                  <Circle className="w-3 h-3 fill-primary text-primary" />
                </div>
                <span className="ml-4 text-sm text-muted-foreground font-mono">Auto Dev — my-ecommerce-project</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  Run
                </motion.button>
              </div>
            </div>

            {/* Editor Layout */}
            <div className="flex h-[500px]">
              {/* Sidebar - File Tree */}
              <div className="w-56 border-r border-border/50 bg-card/30 p-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-3">Explorer</div>
                <div className="space-y-1">
                  {[
                    { name: "src", isFolder: true, children: [
                      { name: "components", isFolder: true },
                      { name: "pages", isFolder: true },
                      { name: "App.tsx", isFolder: false },
                    ]},
                    { name: "public", isFolder: true },
                    { name: "package.json", isFolder: false },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted/50 cursor-pointer text-sm">
                        {item.isFolder ? (
                          <FolderTree className="w-4 h-4 text-primary" />
                        ) : (
                          <FileCode className="w-4 h-4 text-secondary" />
                        )}
                        <span className="text-foreground">{item.name}</span>
                      </div>
                      {item.children && (
                        <div className="ml-4 space-y-1 mt-1">
                          {item.children.map((child, j) => (
                            <div key={j} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted/50 cursor-pointer text-sm">
                              {child.isFolder ? (
                                <FolderTree className="w-4 h-4 text-primary/70" />
                              ) : (
                                <FileCode className="w-4 h-4 text-secondary/70" />
                              )}
                              <span className="text-muted-foreground">{child.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex">
                {/* Code Editor */}
                <div className="flex-1 bg-card/20 p-4 font-mono text-sm overflow-hidden">
                  <div className="text-muted-foreground mb-2">// App.tsx</div>
                  <pre className="text-foreground/80 leading-relaxed">
{`import { ProductGrid } from './components'
import { CartProvider } from './context'

export default function App() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Navbar />
        <ProductGrid />
        <Footer />
      </div>
    </CartProvider>
  )
}`}
                  </pre>
                </div>

                {/* AI Chat Panel */}
                <div className="w-80 border-l border-border/50 bg-card/30 flex flex-col">
                  <div className="p-3 border-b border-border/50">
                    <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-primary" />
                      AI Assistant
                    </div>
                  </div>
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                    <div className="glass-card p-3 rounded-xl">
                      <p className="text-sm text-muted-foreground">একটি ই-কমার্স সাইট বানাও প্রোডাক্ট গ্রিড ও কার্ট সহ</p>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
                      <p className="text-sm text-foreground">
                        <span className="text-primary font-medium">Auto Dev:</span> আমি একটি সম্পূর্ণ ই-কমার্স সাইট তৈরি করছি...
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-2 h-2 bg-primary rounded-full"
                        />
                        কোড জেনারেট হচ্ছে...
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-border/50">
                    <div className="flex items-center gap-2 glass-card rounded-xl px-3 py-2">
                      <input 
                        type="text" 
                        placeholder="প্রম্পট লিখুন..."
                        className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                      />
                      <button className="p-1.5 bg-primary rounded-lg text-primary-foreground">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
};
