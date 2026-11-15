import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadProfiles = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await api.getMyProfiles();
      const list = res.profiles || [];
      setProfiles(list);

      // Select active profile
      const savedActiveId = localStorage.getItem('eldercare_active_profile_id');
      const found = list.find(p => p.id === savedActiveId);

      if (found) {
        setActiveProfile(found);
      } else if (list.length > 0) {
        setActiveProfile(list[0]);
        localStorage.setItem('eldercare_active_profile_id', list[0].id);
      } else {
        setActiveProfile(null);
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadProfiles();
    } else {
      setProfiles([]);
      setActiveProfile(null);
    }
  }, [isAuthenticated]);

  const switchProfile = (profile) => {
    setActiveProfile(profile);
    localStorage.setItem('eldercare_active_profile_id', profile.id);
  };

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        loading,
        loadProfiles,
        switchProfile,
        hasProfile: profiles.length > 0,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within a ProfileProvider');
  return context;
}
