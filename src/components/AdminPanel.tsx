import React, { useEffect, useState } from "react";
import { db, collection, onSnapshot, doc, updateDoc, deleteDoc } from "../lib/firebase";
import { UserProfile, Site } from "../types";
import { Shield, UserCheck, ShieldAlert, Check, X, Building2, Trash2, ShieldCheck, UserMinus } from "lucide-react";

interface AdminPanelProps {
  sites: Site[];
  currentUserProfile: UserProfile | null;
}

export default function AdminPanel({ sites, currentUserProfile }: AdminPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const loaded: UserProfile[] = [];
      snapshot.forEach((doc) => {
        loaded.push(doc.data() as UserProfile);
      });
      // Sort: admins first, then approved, then pending
      loaded.sort((a, b) => {
        if (a.role === "admin" && b.role !== "admin") return -1;
        if (a.role !== "admin" && b.role === "admin") return 1;
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        return a.email.localeCompare(b.email);
      });
      setUsers(loaded);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleUpdateStatus = async (userUid: string, status: "approved" | "pending") => {
    try {
      await updateDoc(doc(db, "users", userUid), { status });
    } catch (err) {
      console.error("Error updating user status:", err);
      alert("Error updating user status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleUpdateRole = async (userUid: string, role: "admin" | "operator") => {
    // Prevent locking out oneself if they demote themselves
    if (userUid === currentUserProfile?.uid && role !== "admin") {
      alert("You cannot demote yourself from Admin role!");
      return;
    }
    try {
      await updateDoc(doc(db, "users", userUid), { role });
    } catch (err) {
      console.error("Error updating user role:", err);
    }
  };

  const handleToggleSiteAssignment = async (userUid: string, currentAssigned: string[], siteId: string) => {
    const isAssigned = currentAssigned.includes(siteId);
    const newAssigned = isAssigned
      ? currentAssigned.filter((id) => id !== siteId)
      : [...currentAssigned, siteId];

    try {
      await updateDoc(doc(db, "users", userUid), { assignedSiteIds: newAssigned });
    } catch (err) {
      console.error("Error updating site assignments:", err);
    }
  };

  const handleDeleteUser = async (userUid: string, userEmail: string) => {
    if (userUid === currentUserProfile?.uid) {
      alert("You cannot delete your own account!");
      return;
    }
    if (confirm(`Are you sure you want to remove user ${userEmail}?`)) {
      try {
        await deleteDoc(doc(db, "users", userUid));
      } catch (err) {
        console.error("Error deleting user profile:", err);
      }
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(query) ||
      u.displayName.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p className="text-xs text-slate-400">Loading user profiles...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 rounded-xl shadow-xl p-6 space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-400" />
            User Management Console
          </h2>
          <p className="text-[11px] text-slate-400 font-medium">
            Manage site operator permissions, assign construction sites, and approve access requests.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative shrink-0">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-950/80 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-64"
          />
        </div>
      </div>

      {/* Grid of users */}
      <div className="grid grid-cols-1 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No matching registered users found.
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isMe = user.uid === currentUserProfile?.uid;
            return (
              <div
                key={user.uid}
                className={`bg-slate-950/50 border rounded-xl p-4 flex flex-col lg:flex-row justify-between gap-4 ${
                  user.status === "pending"
                    ? "border-amber-500/20 bg-amber-500/5"
                    : isMe
                    ? "border-indigo-500/30 bg-indigo-500/5"
                    : "border-slate-800/80"
                }`}
              >
                
                {/* Identity Column */}
                <div className="space-y-2 lg:max-w-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        user.role === "admin"
                          ? "bg-purple-500/10 text-purple-300 border border-purple-500/30"
                          : "bg-blue-500/10 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {user.role}
                    </span>
                    
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${
                        user.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse"
                      }`}
                    >
                      {user.status === "approved" ? (
                        <ShieldCheck className="h-3 w-3" />
                      ) : (
                        <ShieldAlert className="h-3 w-3" />
                      )}
                      {user.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {user.displayName} {isMe && <span className="text-[9px] text-indigo-400">(You)</span>}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      Joined: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Site Assignment Column */}
                <div className="flex-1 space-y-1.5 bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Assigned Sites ({user.assignedSiteIds?.length || 0})
                  </span>
                  
                  {user.role === "admin" ? (
                    <p className="text-[11px] text-purple-300 font-semibold italic">
                      ★ Admins have permission to manage all sites automatically.
                    </p>
                  ) : (
                    <div>
                      <p className="text-[10px] text-slate-500 mb-2">
                        Select which sites this operator is allowed to log data for:
                      </p>
                      
                      {sites.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic">No registered sites available.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                          {sites.map((site) => {
                            const isAssigned = user.assignedSiteIds?.includes(site.id);
                            return (
                              <button
                                key={site.id}
                                type="button"
                                onClick={() => handleToggleSiteAssignment(user.uid, user.assignedSiteIds || [], site.id)}
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                  isAssigned
                                    ? "bg-indigo-600/25 border-indigo-500 text-indigo-200"
                                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700"
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${isAssigned ? "bg-indigo-400" : "bg-slate-600"}`}></span>
                                {site.siteNo} - {site.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Actions Column */}
                <div className="flex flex-row lg:flex-col justify-end items-center gap-2 shrink-0">
                  {user.status === "pending" ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(user.uid, "approved")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 hover:bg-emerald-500 transition-colors cursor-pointer w-full justify-center"
                    >
                      <UserCheck className="h-3.5 w-3.5" /> Approve
                    </button>
                  ) : (
                    !isMe && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(user.uid, "pending")}
                        className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer w-full justify-center border border-amber-600/30"
                      >
                        <UserMinus className="h-3.5 w-3.5" /> Suspend
                      </button>
                    )
                  )}

                  {/* Toggle Role Button */}
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => handleUpdateRole(user.uid, user.role === "admin" ? "operator" : "admin")}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer w-full justify-center"
                    >
                      <Shield className="h-3.5 w-3.5 text-purple-400" />
                      Make {user.role === "admin" ? "Operator" : "Admin"}
                    </button>
                  )}

                  {/* Delete User Profile */}
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(user.uid, user.email)}
                      className="px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-900/30 hover:border-red-900/60 text-red-400 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer w-full justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove Profile
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
