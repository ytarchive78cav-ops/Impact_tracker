import { useState, useEffect } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Save } from "lucide-react";
import { type InsertSettings } from "@shared/routes";

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();

  const [form, setForm] = useState<Partial<InsertSettings>>({});

  useEffect(() => {
    if (settings) {
      setForm({
        volunteerFrequency: settings.volunteerFrequency,
        tier1Weight: settings.tier1Weight,
        tier2Weight: settings.tier2Weight,
        tier3Weight: settings.tier3Weight,
        preventRepeatsMonths: settings.preventRepeatsMonths,
        seasonalMode: settings.seasonalMode,
      });
    }
  }, [settings]);

  if (isLoading) return <div className="p-8 text-center">Loading settings...</div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  return (
    <div className="pt-4 md:pt-8 max-w-2xl mx-auto pb-12">
      <h1 className="text-3xl font-display font-bold text-foreground mb-2">Algorithm Settings</h1>
      <p className="text-muted-foreground mb-8">Tune how "Father Nature" picks your monthly causes.</p>

      <form onSubmit={handleSubmit} className="space-y-8 bg-card p-6 md:p-8 rounded-[2rem] shadow-soft border border-border">
        
        {/* Frequency */}
        <section>
          <h3 className="font-bold text-lg mb-4">Volunteer Frequency</h3>
          <p className="text-sm text-muted-foreground mb-4">How many months per year should prioritize volunteer tasks over donations?</p>
          <input 
            type="range" 
            min="1" 
            max="12" 
            value={form.volunteerFrequency || 3}
            onChange={(e) => setForm({...form, volunteerFrequency: Number(e.target.value)})}
            className="w-full accent-primary"
          />
          <div className="text-center font-bold text-primary mt-2">
            {form.volunteerFrequency} months / year
          </div>
        </section>

        <hr className="border-border" />

        {/* Weights */}
        <section>
          <h3 className="font-bold text-lg mb-4">Tier Weights</h3>
          <p className="text-sm text-muted-foreground mb-4">Higher weight means higher chance of being drawn.</p>
          <div className="space-y-4">
            {['tier1', 'tier2', 'tier3'].map((tier, idx) => {
              const key = `${tier}Weight` as keyof typeof form;
              return (
                <div key={tier} className="flex items-center">
                  <label className="w-24 font-bold text-sm">Tier {idx + 1}</label>
                  <input 
                    type="range" min="0" max="100" 
                    value={form[key] as number || 0}
                    onChange={(e) => setForm({...form, [key]: Number(e.target.value)})}
                    className="flex-1"
                  />
                  <span className="w-12 text-right font-bold text-sm">{form[key]}%</span>
                </div>
              );
            })}
          </div>
        </section>

        <hr className="border-border" />

        {/* Toggles & Numbers */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Prevent Repeats</h3>
              <p className="text-sm text-muted-foreground">Cooldown before a cause can be drawn again</p>
            </div>
            <select 
              value={form.preventRepeatsMonths || 6}
              onChange={(e) => setForm({...form, preventRepeatsMonths: Number(e.target.value)})}
              className="bg-input border-2 border-transparent focus:border-primary rounded-xl py-2 px-4 font-bold outline-none"
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Seasonal Mode</h3>
              <p className="text-sm text-muted-foreground">Prioritize causes with matching tags to the current season</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({...form, seasonalMode: !form.seasonalMode})}
              className={`w-14 h-8 rounded-full transition-colors relative ${form.seasonalMode ? 'bg-primary' : 'bg-muted'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${form.seasonalMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </section>

        <div className="pt-4">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="w-full py-4 bg-foreground text-background rounded-xl font-bold shadow-soft flex justify-center items-center btn-cute"
          >
            <Save className="w-5 h-5 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
