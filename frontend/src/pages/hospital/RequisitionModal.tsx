import React, { useState, useEffect } from "react";
import {
  FileText,
  Sparkles,
  Plus,
  RefreshCw,
  Languages,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { Component, BloodGroup, Urgency, Requisition } from "@pulsechain/shared";
import { api } from "../../api/client.js";
import { useAuth } from "../../auth/context.js";

export const RequisitionPage: React.FC = () => {
  const { facilityId, facilityName } = useAuth();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [aiText, setAiText] = useState("");
  const [parsingAi, setParsingAi] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    component: "PLATELETS" as Component,
    bloodGroup: "O-" as BloodGroup,
    unitsRequested: 2,
    urgency: "HIGH" as Urgency,
    neededHours: 18,
  });

  const loadRequisitions = async () => {
    setLoading(true);
    try {
      const items = await api.getRequisitions(facilityId);
      setRequisitions(items);
    } catch (err) {
      console.error("Could not load requisitions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequisitions();
  }, [facilityId]);

  const handleAiParse = async () => {
    if (!aiText.trim()) return;
    setParsingAi(true);
    try {
      const res = await api.parseRequisitionAI(aiText);
      if (res.success && res.data) {
        setFormData({
          component: res.data.component,
          bloodGroup: res.data.bloodGroup,
          unitsRequested: res.data.units,
          urgency: res.data.urgency,
          neededHours: 12,
        });
      }
    } catch (err: any) {
      alert(`AI parsing error: ${err.message}`);
    } finally {
      setParsingAi(false);
    }
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const neededBy = new Date(
        Date.now() + formData.neededHours * 3600 * 1000
      ).toISOString();

      await api.createRequisition(
        {
          hospitalId: facilityId,
          component: formData.component,
          bloodGroup: formData.bloodGroup,
          unitsRequested: Number(formData.unitsRequested),
          urgency: formData.urgency,
          neededBy,
          rawText: aiText || undefined,
        },
        facilityId
      );

      setShowModal(false);
      setAiText("");
      await loadRequisitions();
    } catch (err: any) {
      alert(`Could not create requisition: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white">Blood Requisitions & Emergency Demand</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-mono">
              {facilityId}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {facilityName} • Active blood requisitions that feed the matching and rescue engine
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadRequisitions}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-900/40 transition"
          >
            <Plus className="w-4 h-4" />
            Create Requisition (AI Support)
          </button>
        </div>
      </div>

      {/* Requisitions List */}
      {requisitions.length === 0 && !loading ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-300">No Active Blood Requisitions</h3>
          <p className="text-xs text-slate-500 mt-1">
            Create an open demand request to automatically receive priority matching from regional blood centres.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requisitions.map((req) => (
            <div
              key={req.reqId}
              className="glass-panel p-5 rounded-2xl border border-slate-800/80 transition-all glass-panel-hover"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400 font-extrabold text-sm">
                    {req.bloodGroup}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      {req.reqId}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {req.component}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Requested: {req.unitsRequested} units (Filled: {req.unitsFilled})
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${
                    req.urgency === "CRITICAL"
                      ? "bg-rose-950 text-rose-300 border border-rose-700 glow-urgent"
                      : req.urgency === "HIGH"
                      ? "bg-amber-950 text-amber-300 border border-amber-700"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {req.urgency}
                </span>
              </div>

              {req.rawText && (
                <div className="my-2.5 p-2 rounded-lg bg-slate-900/90 text-[11px] text-slate-400 italic border border-slate-800">
                  "{req.rawText}"
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Needed By:</span>
                <span className="font-mono text-slate-200">
                  {new Date(req.neededBy).toLocaleDateString()} {new Date(req.neededBy).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Multilingual AI Requisition Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-rose-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Blood Requisition</h3>
                  <p className="text-xs text-slate-400">AI-Assisted Natural Language Intake</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Bedrock LLM
              </span>
            </div>

            {/* AI Text Prompt Area */}
            <div className="mb-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5" />
                  Multilingual Free-Text Prompt (Tamil / Hindi / English)
                </span>
              </div>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder="Example: Emergency 2 bags of O negative platelets needed for surgery at Coimbatore East Hospital tomorrow morning 8 AM"
                className="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-rose-500 focus:outline-none resize-none"
              />
              <button
                type="button"
                onClick={handleAiParse}
                disabled={parsingAi || !aiText.trim()}
                className="mt-2 w-full py-2 rounded-lg bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-xs font-bold text-white shadow-md shadow-rose-900/30 transition flex items-center justify-center gap-1.5"
              >
                <Sparkles className={`w-3.5 h-3.5 ${parsingAi ? "animate-spin" : ""}`} />
                {parsingAi ? "Extracting with Bedrock AI..." : "Extract Fields with AI"}
              </button>
            </div>

            {/* Structured Form Fields */}
            <form onSubmit={handleCreateRequisition} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Component</label>
                  <select
                    value={formData.component}
                    onChange={(e) =>
                      setFormData({ ...formData, component: e.target.value as Component })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="PLATELETS">Platelets</option>
                    <option value="RBC">Red Blood Cells (RBC)</option>
                    <option value="PLASMA">Plasma (FFP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) =>
                      setFormData({ ...formData, bloodGroup: e.target.value as BloodGroup })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="O-">O Negative</option>
                    <option value="O+">O Positive</option>
                    <option value="A-">A Negative</option>
                    <option value="A+">A Positive</option>
                    <option value="B-">B Negative</option>
                    <option value="B+">B Positive</option>
                    <option value="AB-">AB Negative</option>
                    <option value="AB+">AB Positive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Units</label>
                  <input
                    type="number"
                    value={formData.unitsRequested}
                    onChange={(e) =>
                      setFormData({ ...formData, unitsRequested: Number(e.target.value) })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Urgency</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) =>
                      setFormData({ ...formData, urgency: e.target.value as Urgency })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical (SOS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Needed Within</label>
                  <input
                    type="number"
                    value={formData.neededHours}
                    onChange={(e) =>
                      setFormData({ ...formData, neededHours: Number(e.target.value) })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-lg shadow-rose-900/40"
                >
                  {actionLoading ? "Submitting..." : "Submit Requisition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
