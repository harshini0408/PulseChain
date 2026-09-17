import React, { createContext, useContext, useState, useEffect } from "react";
import type { Role, Facility } from "@pulsechain/shared";
import { api } from "../api/client.js";

export interface UserContextType {
  role: Role;
  facilityId: string;
  facilityName: string;
  facilities: Facility[];
  switchPersona: (role: Role, facilityId: string, facilityName: string) => void;
  refreshFacilities: () => Promise<void>;
}

const AuthContext = createContext<UserContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>("BLOOD_CENTRE");
  const [facilityId, setFacilityId] = useState<string>("CBE-BC-01");
  const [facilityName, setFacilityName] = useState<string>("Coimbatore Central Blood Centre");
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const refreshFacilities = async () => {
    try {
      const list = await api.getFacilities();
      setFacilities(list);
    } catch (err) {
      console.warn("Could not load facilities list, using fallbacks:", err);
    }
  };

  useEffect(() => {
    refreshFacilities();
  }, []);

  const switchPersona = (newRole: Role, newFacId: string, newFacName: string) => {
    setRole(newRole);
    setFacilityId(newFacId);
    setFacilityName(newFacName);
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        facilityId,
        facilityName,
        facilities,
        switchPersona,
        refreshFacilities,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
