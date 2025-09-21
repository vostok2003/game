// src/context/UserContext.jsx
import React, { createContext, useEffect, useState } from "react";
import getSocket from "../socket";
const socket = getSocket();

export const UserContext = createContext({
  user: null,
  setUser: () => {},
});

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch (e) {
      return null;
    }
  });

  // Keep localStorage in sync whenever user changes
  useEffect(() => {
    try {
      if (user) localStorage.setItem("user", JSON.stringify(user));
      else {
        localStorage.removeItem("user");
      }
    } catch (e) {
      console.error("Failed to persist user to localStorage", e);
    }
  }, [user]);

  // Listen for rating updates from server and update user if it matches
  useEffect(() => {
    function onRatingUpdate(updatedArr) {
      // updatedArr: [{ _id, name, rating, rd }]
      if (!user) return;
      const me = updatedArr.find((u) => {
        // compare either by db _id or by name if _id not present in local user
        if (u._id && user._id) return String(u._id) === String(user._id);
        return u.name === user.name;
      });
      if (me) {
        setUser((prev) => ({ ...prev, rating: me.rating, rd: me.rd }));
      }
    }

    socket.on("ratingUpdate", onRatingUpdate);
    return () => {
      socket.off("ratingUpdate", onRatingUpdate);
    };
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}
