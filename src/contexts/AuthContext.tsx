import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SystemConfigService } from "@/services/systemConfigService";

type AppRole = "admin" | "operador";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Buscar role do usuário
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Erro ao buscar role:", error);
        // Se não encontrar role, assume operador
        setRole("operador");
        return;
      }

      setRole(data?.role as AppRole || "operador");
    } catch (err) {
      console.error("Erro ao buscar role:", err);
      setRole("operador");
    }
  };

  useEffect(() => {
    // Configurar listener ANTES de buscar sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Usar setTimeout para evitar deadlock com Supabase
          setTimeout(async () => {
            await fetchUserRole(currentSession.user.id);
            // Sincronizar configs do Supabase → localStorage
            await SystemConfigService.syncToLocalStorage();
          }, 0);
        } else {
          setRole(null);
        }

        if (event === "SIGNED_OUT") {
          setRole(null);
        }

        setIsLoading(false);
      }
    );

    // Buscar sessão inicial
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        fetchUserRole(initialSession.user.id);
        // Sync configs on initial load too
        SystemConfigService.syncToLocalStorage();
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const value: AuthContextType = {
    user,
    session,
    role,
    isAdmin: role === "admin",
    isLoading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
