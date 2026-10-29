/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, isConfigured } from "../firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Sign up a user and write their role to Firestore
  async function signup(email, password, role) {
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Save role in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: email,
        role: role,
        createdAt: new Date().toISOString()
      });
      
      return user;
    } catch (error) {
      console.error("Signup error: ", error);
      setAuthError(error.message);
      throw error;
    }
  }

  // Log in with email and password
  async function login(email, password) {
    setAuthError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Login error: ", error);
      setAuthError(error.message);
      throw error;
    }
  }

  // Log out
  function logout() {
    setUserRole(null);
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          // Fetch role from Firestore /users/{uid}
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            setUserRole(userDocSnap.data().role);
          } else {
            console.warn(`No user document found at /users/${user.uid}`);
            // If they are logged in but don't have a role, default to null so app knows
            setUserRole(null);
          }
        } catch (err) {
          console.error("Error fetching user role from Firestore: ", err);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    loading,
    authError,
    setAuthError,
    login,
    signup,
    logout,
    isFirebaseConfigured: isConfigured
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
