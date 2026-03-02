import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Gift, Heart, Clock, DollarSign, CheckCircle2, ChevronRight } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { useMonthlyLog, useRevealMonthlyLog, useCompleteMonthlyLog } from "@/hooks/use-monthly-logs";
import { useCauses } from "@/hooks/use-causes";
import { GlobeMascot } from "@/components/globe-mascot";

// Helper to get current YYYY-MM
function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(key: string) {
  const [year, month] = key.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function Home() {
  const { activeUser } = useUser();
  const currentMonthKey = getCurrentMonthKey();
  
  const { data: log, isLoading: logLoading } = useMonthlyLog(currentMonthKey);
  const { data: causes, isLoading: causesLoading } = useCauses();
  
  const revealMutation = useRevealMonthlyLog();
  const completeMutation = useCompleteMonthlyLog();

  const [isRevealing, setIsRevealing] = useState(false);
  const [showCompletionForm, setShowCompletionForm] = useState(false);

  // Form state
  const [amount, setAmount] = useState("");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");

  const cause = log ? causes?.find(c => c.id === log.causeId) : null;

  const handleReveal = () => {
    setIsRevealing(true);
    revealMutation.mutate(currentMonthKey, {
      onSuccess: () => {
        setTimeout(() => {
          setIsRevealing(false);
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#4ADE80', '#FCD34D', '#F87171']
          });
        }, 1500); // Faux loading for suspense
      },
      onError: () => setIsRevealing(false)
    });
  };

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!log) return;
    
    completeMutation.mutate({
      id: log.id,
      data: {
        amount: amount ? Number(amount) : undefined,
        hours: hours ? Number(hours) : undefined,
        note,
        dateCompleted: new Date().toISOString()
      }
    }, {
      onSuccess: () => {
        setShowCompletionForm(false);
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.5 },
          colors: ['#4ADE80']
        });
      }
    });
  };

  if (logLoading || causesLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <GlobeMascot mood="neutral" size={80} />
      </div>
    );
  }

  // STATE 1: Ready to Reveal
  if (!log) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-md mx-auto">
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-12"
        >
          <div className="inline-flex items-center justify-center px-4 py-2 bg-primary/10 text-primary rounded-full font-bold text-sm mb-6">
            {formatMonth(currentMonthKey)}
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Time for this month's ritual!
          </h1>
          <p className="text-muted-foreground text-lg">
            {activeUser}, press the button below to draw a cause from your library.
          </p>
        </motion.div>

        <motion.button
          onClick={handleReveal}
          disabled={isRevealing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            relative w-48 h-48 md:w-56 md:h-56 rounded-full flex flex-col items-center justify-center shadow-bouncy
            transition-all duration-500 overflow-hidden group
            ${isRevealing ? 'bg-secondary' : 'bg-primary'}
          `}
        >
          {isRevealing ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
              <Sparkles className="w-16 h-16 text-white" />
            </motion.div>
          ) : (
            <>
              <div className="absolute inset-0 bg-white/20 group-hover:translate-y-full transition-transform duration-700 rounded-full" />
              <Gift className="w-16 h-16 text-white mb-2" />
              <span className="text-white font-display font-bold text-xl">Reveal</span>
            </>
          )}
        </motion.button>
      </div>
    );
  }

  // STATE 2: Revealed & Active (or Completed)
  if (!cause) return <div>Error: Cause not found</div>;

  const isCompleted = log.isCompleted;

  return (
    <div className="max-w-2xl mx-auto pt-4 md:pt-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {formatMonth(currentMonthKey)}
          </h1>
          <p className="text-muted-foreground font-medium">
            Drawn by {cause.submittedBy}
          </p>
        </div>
        <GlobeMascot mood={isCompleted ? "happy" : "excited"} size={80} />
      </motion.div>

      {/* Main Cause Card */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="bg-card rounded-[2rem] p-6 md:p-8 shadow-soft border border-border relative overflow-hidden"
      >
        {isCompleted && (
          <div className="absolute top-0 right-0 bg-primary text-white px-6 py-2 rounded-bl-[2rem] font-bold flex items-center shadow-sm">
            <CheckCircle2 className="w-5 h-5 mr-2" /> Completed
          </div>
        )}

        <div className="flex items-center space-x-3 mb-6">
          <span className="px-3 py-1 bg-secondary/20 text-secondary-foreground font-bold rounded-full text-sm capitalize">
            {log.type}
          </span>
          <span className="px-3 py-1 bg-accent/20 text-accent-foreground font-bold rounded-full text-sm">
            Tier {cause.tier}
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
          {cause.name}
        </h2>
        
        <p className="text-muted-foreground text-lg mb-8 leading-relaxed whitespace-pre-wrap">
          {cause.description}
        </p>

        {cause.link && (
          <a 
            href={cause.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-primary font-bold hover:underline mb-8"
          >
            Visit Website <ChevronRight className="w-4 h-4 ml-1" />
          </a>
        )}

        {/* Action Area */}
        {!isCompleted && !showCompletionForm && (
          <button
            onClick={() => setShowCompletionForm(true)}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-bouncy btn-cute flex items-center justify-center"
          >
            <CheckCircle2 className="w-6 h-6 mr-2" />
            Mark as Completed
          </button>
        )}

        <AnimatePresence>
          {showCompletionForm && !isCompleted && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleComplete}
              className="mt-6 border-t border-border pt-6 overflow-hidden"
            >
              <h3 className="font-display font-bold text-xl mb-4">Log your impact</h3>
              
              <div className="space-y-4">
                {log.type === "donation" && (
                  <div>
                    <label className="block text-sm font-bold text-muted-foreground mb-2">Amount ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <input
                        type="number"
                        required
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-input/50 border-2 border-transparent focus:border-primary rounded-xl py-3 pl-10 pr-4 outline-none font-bold transition-colors"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}

                {log.type === "volunteer" && (
                  <div>
                    <label className="block text-sm font-bold text-muted-foreground mb-2">Hours Volunteered</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={hours}
                        onChange={e => setHours(e.target.value)}
                        className="w-full bg-input/50 border-2 border-transparent focus:border-primary rounded-xl py-3 pl-10 pr-4 outline-none font-bold transition-colors"
                        placeholder="2.5"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-2">Journal Note (optional)</label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full bg-input/50 border-2 border-transparent focus:border-primary rounded-xl py-3 px-4 outline-none resize-none h-24 transition-colors"
                    placeholder="How did it feel?"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCompletionForm(false)}
                    className="flex-1 py-3 bg-muted text-foreground rounded-xl font-bold btn-cute"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={completeMutation.isPending}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-bouncy btn-cute disabled:opacity-50 flex justify-center items-center"
                  >
                    {completeMutation.isPending ? "Saving..." : "Save Impact"}
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Completed State Info */}
        {isCompleted && (
          <div className="mt-6 bg-green-50 rounded-2xl p-4 flex items-start space-x-4 border border-green-100">
            <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0 text-green-700">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-green-900 mb-1">Impact Logged</p>
              {log.amount && <p className="text-green-800 text-sm font-medium">Donated: ${log.amount}</p>}
              {log.hours && <p className="text-green-800 text-sm font-medium">Volunteered: {log.hours} hours</p>}
              {log.note && <p className="text-green-700 text-sm mt-2 italic">"{log.note}"</p>}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
