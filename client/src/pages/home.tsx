import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Gift, Heart, Clock, DollarSign, CheckCircle2, ChevronRight, Sparkles, Trash2, Edit2, Plus, Star } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { useMonthlyLog, useRevealMonthlyLog, useCompleteMonthlyLog, useDeleteMonthlyLog } from "@/hooks/use-monthly-logs";
import { useCauses } from "@/hooks/use-causes";
import { GlobeMascot } from "@/components/globe-mascot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  
  const { data: logs, isLoading: logsLoading } = useMonthlyLog(currentMonthKey);
  const { data: causes, isLoading: causesLoading } = useCauses();
  
  const revealMutation = useRevealMonthlyLog();
  const deleteMutation = useDeleteMonthlyLog();
  const completeMutation = useCompleteMonthlyLog();

  const [isRevealing, setIsRevealing] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);

  // Form state for editing/completing
  const [amount, setAmount] = useState("");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");

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
        }, 1000);
      },
      onError: () => setIsRevealing(false)
    });
  };

  const handleComplete = (e: React.FormEvent, logId: number) => {
    e.preventDefault();
    completeMutation.mutate({
      id: logId,
      data: {
        amount: amount ? Number(amount) : undefined,
        hours: hours ? Number(hours) : undefined,
        note,
        dateCompleted: new Date().toISOString()
      }
    }, {
      onSuccess: () => {
        setEditingLogId(null);
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.5 },
          colors: ['#4ADE80']
        });
      }
    });
  };

  const startEditing = (log: any) => {
    setEditingLogId(log.id);
    setAmount(log.amount || "");
    setHours(log.hours || "");
    setNote(log.note || "");
  };

  if (logsLoading || causesLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <GlobeMascot mood="neutral" size={80} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-4 md:pt-10 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {formatMonth(currentMonthKey)}
          </h1>
          <p className="text-muted-foreground font-medium">
            Monthly Ritual
          </p>
        </div>
        <GlobeMascot mood={logs && logs.length > 0 ? "happy" : "neutral"} size={80} />
      </div>

      <div className="space-y-6">
        {logs?.map((log) => {
          const cause = causes?.find(c => c.id === log.causeId);
          if (!cause) return null;
          const isEditing = editingLogId === log.id;

          return (
            <Card key={log.id} className="p-6 md:p-8 rounded-[2rem] shadow-soft border border-border overflow-hidden relative">
              {log.isCompleted && !isEditing && (
                <div className="absolute top-0 right-0 bg-primary text-white px-4 py-1 rounded-bl-[1.5rem] font-bold text-xs flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-secondary/20 text-secondary-foreground font-bold rounded-full text-xs capitalize">
                    {log.type}
                  </span>
                  <span className="px-3 py-1 bg-accent/20 text-accent-foreground font-bold rounded-full text-xs">
                    Tier {cause.tier}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => startEditing(log)} className="h-8 w-8 text-muted-foreground">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(log.id)} className="h-8 w-8 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                {cause.name}
              </h2>
              <p className="text-muted-foreground text-sm mb-4 italic">Drawn by {cause.submittedBy}</p>
              
              {!isEditing && (
                <>
                  <p className="text-muted-foreground mb-6 line-clamp-3">{cause.description}</p>
                  {!log.isCompleted ? (
                    <Button onClick={() => startEditing(log)} className="w-full rounded-xl font-bold">
                      <Plus className="w-4 h-4 mr-2" /> Log Progress
                    </Button>
                  ) : (
                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                      <div className="flex items-center text-green-700 font-bold mb-1">
                        <Heart className="w-4 h-4 mr-2" /> Impact Logged
                      </div>
                      <div className="text-sm text-green-800">
                        {log.amount && <span>${log.amount} donated • </span>}
                        {log.hours && <span>{log.hours} hours volunteered • </span>}
                        <span className="text-xs">{new Date(log.dateCompleted!).toLocaleDateString()}</span>
                      </div>
                      {log.note && <p className="text-xs text-green-700 mt-2">"{log.note}"</p>}
                    </div>
                  )}
                </>
              )}

              <AnimatePresence>
                {isEditing && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={(e) => handleComplete(e, log.id)}
                    className="mt-4 border-t pt-4 space-y-4"
                  >
                    {log.type === "donation" && (
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                          type="number"
                          required
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          className="w-full bg-muted/50 border-none rounded-xl py-2 pl-9 pr-4 text-sm font-bold"
                          placeholder="Amount donated"
                        />
                      </div>
                    )}
                    {log.type === "volunteer" && (
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                          type="number"
                          step="0.5"
                          required
                          value={hours}
                          onChange={e => setHours(e.target.value)}
                          className="w-full bg-muted/50 border-none rounded-xl py-2 pl-9 pr-4 text-sm font-bold"
                          placeholder="Hours volunteered"
                        />
                      </div>
                    )}
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className="w-full bg-muted/50 border-none rounded-xl py-2 px-4 text-sm min-h-[80px]"
                      placeholder="Optional notes..."
                    />
                    <div className="flex space-x-2">
                      <Button type="button" variant="outline" onClick={() => setEditingLogId(null)} className="flex-1 rounded-xl">Cancel</Button>
                      <Button type="submit" className="flex-1 rounded-xl">Save</Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </Card>
          );
        })}

        <div className="flex flex-col items-center pt-8">
          <Button 
            onClick={handleReveal} 
            disabled={isRevealing}
            size="lg"
            className="rounded-full h-16 px-8 font-bold text-lg shadow-bouncy group"
          >
            {isRevealing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                <Sparkles className="w-6 h-6" />
              </motion.div>
            ) : (
              <>
                <Gift className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
                Reveal Another Cause
              </>
            )}
          </Button>
          <p className="text-muted-foreground text-xs mt-4">Add multiple entries for this month's impact!</p>
        </div>
      </div>
    </div>
  );
}
