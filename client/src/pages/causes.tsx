import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Search, Edit2, Trash2, ExternalLink } from "lucide-react";
import { CauseCardImage } from "@/components/cause-card-image";
import { useCauses, useCreateCause, useUpdateCause, useDeleteCause } from "@/hooks/use-causes";
import { useUser } from "@/lib/user-context";
import { getExternalHref, getScopeBadgeClass, getTierBadgeClass, getTypeBadgeClass } from "@/lib/cause-ui";
import { type InsertCause, type Cause } from "@shared/routes";

type CauseFormData = Omit<InsertCause, "workspaceId">;

export default function Causes() {
  const { data: causes, isLoading } = useCauses();
  const { canManageCauses } = useUser();
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCause, setEditingCause] = useState<Cause | null>(null);

  useEffect(() => {
    if (!isFormOpen) return;

    const scrollY = window.scrollY;
    const { style } = document.body;
    const previousOverflow = style.overflow;
    const previousPosition = style.position;
    const previousTop = style.top;
    const previousWidth = style.width;

    style.overflow = "hidden";
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.width = "100%";

    return () => {
      style.overflow = previousOverflow;
      style.position = previousPosition;
      style.top = previousTop;
      style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isFormOpen]);

  const filteredCauses = causes?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.tags?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleOpenForm = (cause?: Cause) => {
    if (!canManageCauses) return;
    if (cause) setEditingCause(cause);
    else setEditingCause(null);
    setIsFormOpen(true);
  };

  return (
    <div className="pt-4 md:pt-8 relative min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Giving Space Library</h1>
          <p className="text-muted-foreground mt-1">Manage the causes already in this Giving Space.</p>
        </div>
        <button
          disabled={!canManageCauses}
          onClick={() => handleOpenForm()}
          className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-bouncy flex items-center justify-center btn-cute disabled:opacity-50"
        >
          <Plus className="w-5 h-5 mr-2" /> Add Cause
        </button>
      </div>

      {!canManageCauses ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Members can browse causes and open links, but only owners and admins can change this Giving Space library.
        </div>
      ) : null}

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search causes or tags..."
          className="w-full bg-card border-2 border-border focus:border-primary rounded-2xl py-4 pl-12 pr-4 outline-none font-medium shadow-sm transition-all"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-card h-40 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-20">
          {filteredCauses.map((cause, i) => (
            <motion.div
              key={cause.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card p-4 md:p-5 rounded-3xl shadow-soft border border-border flex flex-col justify-between"
            >
              <CauseCardImage imageUrl={cause.photoUrl} title={cause.name} />

              <div>
                <div className="mb-3 mt-4 flex justify-between items-start gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${getTypeBadgeClass(cause.type)}`}>
                      {cause.type}
                    </span>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getTierBadgeClass(cause.tier)}`}>
                      Tier {cause.tier}
                    </span>
                    {cause.location ? (
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getScopeBadgeClass(cause.location)}`}>
                        {cause.location}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">
                    by {cause.submittedBy}
                  </span>
                </div>
                <h3 className="font-display font-bold text-xl text-foreground mb-2 line-clamp-1">{cause.name}</h3>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{cause.description}</p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t border-border/50">
                {getExternalHref(cause.link) && (
                  <a
                    href={getExternalHref(cause.link)!}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open website for ${cause.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground transition-colors hover:bg-muted"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {canManageCauses ? (
                  <button 
                    onClick={() => handleOpenForm(cause)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-transparent text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                ) : null}
                {/* Delete handled inside form or could be added here */}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Slide-over Form */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-[71] flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-border bg-background shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-5 md:px-8">
                <h2 className="text-2xl font-display font-bold">
                  {editingCause ? "Edit Cause" : "New Cause"}
                </h2>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 bg-muted rounded-full hover:bg-border transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 md:px-8 md:py-8">
                <CauseForm 
                  initialData={editingCause} 
                  onClose={() => setIsFormOpen(false)} 
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-component for the form
function CauseForm({ initialData, onClose }: { initialData: Cause | null, onClose: () => void }) {
  const createMutation = useCreateCause();
  const updateMutation = useUpdateCause();
  const deleteMutation = useDeleteCause();
  const { activeUser } = useUser();

  const [formData, setFormData] = useState<CauseFormData>({
    name: initialData?.name || "",
    type: initialData?.type || "either",
    tier: initialData?.tier || 2,
    submittedBy: initialData?.submittedBy || activeUser?.name || "",
    description: initialData?.description || "",
    link: initialData?.link || "",
    tags: initialData?.tags || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData) {
      updateMutation.mutate({ id: initialData.id, ...formData }, { onSuccess: onClose });
    } else {
      createMutation.mutate(formData as InsertCause, { onSuccess: onClose });
    }
  };

  const handleDelete = () => {
    if (!initialData) return;
    if (confirm("Are you sure you want to delete this cause?")) {
      deleteMutation.mutate(initialData.id, { onSuccess: onClose });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-full flex-col">
      <div className="space-y-6 pb-6">
        <div>
          <label className="block text-sm font-bold text-muted-foreground mb-2">Cause Name</label>
          <input
            required
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full bg-card border-2 border-border focus:border-primary rounded-xl py-3 px-4 outline-none font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-muted-foreground mb-2">Type</label>
            <select
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
              className="w-full bg-card border-2 border-border focus:border-primary rounded-xl py-3 px-4 outline-none font-medium"
            >
              <option value="donation">Donation</option>
              <option value="volunteer">Volunteer</option>
              <option value="either">Either</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-muted-foreground mb-2">Tier (1-3)</label>
            <select
              value={formData.tier}
              onChange={e => setFormData({...formData, tier: Number(e.target.value)})}
              className="w-full bg-card border-2 border-border focus:border-primary rounded-xl py-3 px-4 outline-none font-medium"
            >
              <option value={1}>Tier 1 (High)</option>
              <option value={2}>Tier 2 (Med)</option>
              <option value={3}>Tier 3 (Low)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-muted-foreground mb-2">Submitted By</label>
          <input
            required
            value={formData.submittedBy}
            onChange={e => setFormData({...formData, submittedBy: e.target.value})}
            className="w-full bg-card border-2 border-border focus:border-primary rounded-xl py-3 px-4 outline-none font-medium"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-muted-foreground mb-2">Description</label>
          <textarea
            required
            rows={4}
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="w-full bg-card border-2 border-border focus:border-primary rounded-xl py-3 px-4 outline-none font-medium resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-muted-foreground mb-2">Website Link (optional)</label>
          <input
            type="url"
            value={formData.link ?? ""}
            onChange={e => setFormData({...formData, link: e.target.value})}
            className="w-full bg-card border-2 border-border focus:border-primary rounded-xl py-3 px-4 outline-none font-medium"
          />
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto flex items-center gap-3 border-t border-border bg-background/95 px-1 pb-[max(12px,calc(var(--safe-area-bottom)+12px))] pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        {initialData && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="px-4 py-3 bg-destructive/10 text-destructive rounded-xl font-bold btn-cute hover:bg-destructive hover:text-white"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-bouncy btn-cute disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Cause"}
        </button>
      </div>
    </form>
  );
}
