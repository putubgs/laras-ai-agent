"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, GripVertical, Check, X, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { createPhase, updatePhase, deletePhase } from "@/lib/actions/phases";

type Phase = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  order: number;
  isActive: boolean;
};

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#14b8a6", "#3b82f6",
  "#64748b", "#0ea5e9", "#a855f7", "#f97316",
];

export default function PhaseManager({ phases: initialPhases }: { phases: Phase[] }) {
  const [phases, setPhases] = useState(initialPhases);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    color: "#6366f1",
  });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    startTransition(async () => {
      await createPhase({
        name: form.name,
        description: form.description,
        color: form.color,
        order: phases.length + 1,
      });
      setForm({ name: "", description: "", color: "#6366f1" });
      setShowNew(false);
    });
  };

  const handleUpdate = (phase: Phase) => {
    startTransition(async () => {
      await updatePhase(phase.id, {
        name: phase.name,
        description: phase.description ?? "",
        color: phase.color,
        order: phase.order,
        isActive: phase.isActive,
      });
      setEditingId(null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this phase? Applications using it will lose this phase.")) return;
    startTransition(async () => {
      await deletePhase(id);
      setPhases((p) => p.filter((ph) => ph.id !== id));
    });
  };

  const handleToggleActive = (phase: Phase) => {
    const updated = { ...phase, isActive: !phase.isActive };
    setPhases((p) => p.map((ph) => (ph.id === phase.id ? updated : ph)));
    startTransition(async () => {
      await updatePhase(phase.id, {
        name: phase.name,
        description: phase.description ?? "",
        color: phase.color,
        order: phase.order,
        isActive: !phase.isActive,
      });
    });
  };

  return (
    <div className="space-y-3">
      {phases
        .sort((a, b) => a.order - b.order)
        .map((phase) => {
          const isEditing = editingId === phase.id;

          if (isEditing) {
            return (
              <div key={phase.id} className="border-2 border-indigo-300 rounded-xl p-4 bg-primary/10/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1">Name</label>
                    <input
                      value={phase.name}
                      onChange={(e) =>
                        setPhases((p) =>
                          p.map((ph) => (ph.id === phase.id ? { ...ph, name: e.target.value } : ph))
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1">Description</label>
                    <input
                      value={phase.description ?? ""}
                      onChange={(e) =>
                        setPhases((p) =>
                          p.map((ph) =>
                            ph.id === phase.id ? { ...ph, description: e.target.value } : ph
                          )
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          setPhases((p) =>
                            p.map((ph) => (ph.id === phase.id ? { ...ph, color: c } : ph))
                          )
                        }
                        className={`w-7 h-7 rounded-full transition-all ${
                          phase.color === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : ""
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdate(phase)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 laras-btn-primary px-3 py-1.5 rounded-lg text-xs font-medium brightness-110 disabled:opacity-50 transition-colors"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex items-center gap-1.5 text-on-surface-variant px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-surface-container-high/80 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={phase.id}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                phase.isActive
                  ? "bg-white border-outline-variant"
                  : "bg-surface-container-low/80 border-outline-variant/50 opacity-60"
              }`}
            >
              <GripVertical className="w-4 h-4 text-on-surface-variant/50 flex-shrink-0 cursor-grab" />
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: phase.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface">{phase.name}</p>
                {phase.description && (
                  <p className="text-xs text-on-surface-variant truncate">{phase.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleActive(phase)}
                  disabled={isPending}
                  className="text-on-surface-variant/70 hover:text-on-surface-variant transition-colors"
                  title={phase.isActive ? "Deactivate" : "Activate"}
                >
                  {phase.isActive ? (
                    <ToggleRight className="w-5 h-5 text-indigo-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(phase.id)}
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-on-surface-variant/70 hover:text-primary transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(phase.id)}
                  disabled={isPending}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-on-surface-variant/70 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

      {/* New Phase Form */}
      {showNew ? (
        <div className="border-2 border-dashed border-indigo-300 rounded-xl p-4 bg-primary/10/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. System Design Interview"
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
                className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full transition-all ${
                    form.color === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!form.name.trim() || isPending}
              className="flex items-center gap-1.5 laras-btn-primary px-3 py-1.5 rounded-lg text-xs font-medium brightness-110 disabled:opacity-50 transition-colors"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Create Phase
            </button>
            <button
              type="button"
              onClick={() => { setShowNew(false); setForm({ name: "", description: "", color: "#6366f1" }); }}
              className="flex items-center gap-1.5 text-on-surface-variant px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-surface-container-high/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-outline-variant rounded-xl py-3 text-sm text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
        >
          <Plus className="w-4 h-4" />
          Add New Phase
        </button>
      )}
    </div>
  );
}
