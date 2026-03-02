import { motion } from "framer-motion";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { GlobeMascot } from "@/components/globe-mascot";
import { Heart, Clock, Award, Star } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading || !stats) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-24 h-24 bg-muted rounded-full mb-4" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const hasHighImpact = stats.totalDonated > 500 || stats.totalVolunteerHours > 20;

  return (
    <div className="pt-4 md:pt-8 pb-12">
      <header className="mb-10 text-center md:text-left flex flex-col md:flex-row items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Your Impact</h1>
          <p className="text-muted-foreground mt-2">Look at all the good you've done together.</p>
        </div>
        <div className="mt-6 md:mt-0">
          <GlobeMascot mood={hasHighImpact ? "excited" : "happy"} size={100} />
        </div>
      </header>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-[2rem] p-6 shadow-soft border border-border flex items-center"
        >
          <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-4">
            <Heart className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Donated</p>
            <p className="text-4xl font-display font-bold text-foreground">
              ${stats.totalDonated.toLocaleString()}
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-[2rem] p-6 shadow-soft border border-border flex items-center"
        >
          <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mr-4">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Volunteer Hours</p>
            <p className="text-4xl font-display font-bold text-foreground">
              {stats.totalVolunteerHours}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Breakdown */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1 bg-card rounded-[2rem] p-6 shadow-soft border border-border"
        >
          <h3 className="font-display font-bold text-xl mb-6 flex items-center">
            <Award className="w-5 h-5 mr-2 text-primary" /> Cause Tiers
          </h3>
          <div className="space-y-4">
            <TierBar label="Tier 1" value={stats.causesByTier.tier1} color="bg-primary" />
            <TierBar label="Tier 2" value={stats.causesByTier.tier2} color="bg-secondary" />
            <TierBar label="Tier 3" value={stats.causesByTier.tier3} color="bg-accent" />
          </div>
        </motion.div>

        {/* Milestones / Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-card rounded-[2rem] p-6 shadow-soft border border-border"
        >
          <h3 className="font-display font-bold text-xl mb-6 flex items-center">
            <Star className="w-5 h-5 mr-2 text-secondary" /> Milestones & Notes
          </h3>
          {stats.milestones.length === 0 ? (
            <div className="text-center py-8 bg-muted/50 rounded-2xl">
              <p className="text-muted-foreground font-medium">Keep completing causes to unlock milestones!</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {stats.milestones.map((m, i) => (
                <li key={i} className="flex items-start">
                  <div className="w-2 h-2 mt-2 rounded-full bg-secondary mr-3 flex-shrink-0" />
                  <p className="text-foreground font-medium">{m}</p>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function TierBar({ label, value, color }: { label: string, value: number, color: string }) {
  // Simple faux max for visual scale
  const max = 15; 
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div>
      <div className="flex justify-between text-sm font-bold mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span>{value}</span>
      </div>
      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}
