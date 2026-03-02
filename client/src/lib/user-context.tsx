import React, { createContext, useContext, useState, useEffect } from "react";

type UserProfile = "David" | "Arlayna" | null;

interface UserContextType {
  activeUser: UserProfile;
  setActiveUser: (user: UserProfile) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [activeUser, setActiveUser] = useState<UserProfile>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("monthly-impact-user") as UserProfile;
    if (stored) {
      setActiveUser(stored);
    }
    setIsLoaded(true);
  }, []);

  const handleSetUser = (user: UserProfile) => {
    setActiveUser(user);
    if (user) {
      localStorage.setItem("monthly-impact-user", user);
    } else {
      localStorage.removeItem("monthly-impact-user");
    }
  };

  if (!isLoaded) return null;

  return (
    <UserContext.Provider value={{ activeUser, setActiveUser: handleSetUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
