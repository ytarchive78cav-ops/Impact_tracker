import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import { GlobeMascot } from "@/components/globe-mascot";

export default function Welcome() {
  const { setActiveUser } = useUser();
  const [, setLocation] = useLocation();

  const handleSelect = (name: "David" | "Arlayna") => {
    setActiveUser(name);
    setLocation("/");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-6">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="mb-8"
      >
        <GlobeMascot mood="happy" size={160} />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-display font-bold text-foreground mb-3">
          Welcome to Impact
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Your shared ritual for making the world a little brighter, month by month.
        </p>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm space-y-4"
      >
        <p className="text-center font-bold text-muted-foreground mb-4">Who is revealing this month?</p>
        
        <button
          onClick={() => handleSelect("David")}
          className="w-full bg-card p-6 rounded-3xl shadow-soft border-2 border-transparent hover:border-primary hover:shadow-bouncy transition-all duration-300 flex items-center justify-between group btn-cute"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-display font-bold text-xl mr-4 group-hover:scale-110 transition-transform">
              D
            </div>
            <span className="text-xl font-bold text-foreground">David</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
            →
          </div>
        </button>

        <button
          onClick={() => handleSelect("Arlayna")}
          className="w-full bg-card p-6 rounded-3xl shadow-soft border-2 border-transparent hover:border-accent hover:shadow-bouncy transition-all duration-300 flex items-center justify-between group btn-cute"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-display font-bold text-xl mr-4 group-hover:scale-110 transition-transform">
              A
            </div>
            <span className="text-xl font-bold text-foreground">Arlayna</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
            →
          </div>
        </button>
      </motion.div>
    </div>
  );
}
