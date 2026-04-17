import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SystemConfigService } from "@/services/systemConfigService";

type AppRole = "admin" | "operador" | "lider" | "operador_lab" | "financeiro" | "viewer";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  roles: AppRole[];
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
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Buscar TODAS as roles do usuário (suporta múltiplas roles por user)
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.error("[AuthContext] Erro ao buscar roles:", error);
        setRoles([]);
        setRole("operador");
        return;
      }

      const list = (data ?? []).map((r: any) => r.role as AppRole);
      console.log("[AuthContext] userId:", userId, "roles carregadas:", list);
      setRoles(list);

      // Prioriza admin se existir; caso contrário pega a primeira role; fallback operador
      if (list.includes("admin")) {
        setRole("admin");
      } else if (list.length > 0) {
        setRole(list[0]);
      } else {
        setRole("operador");
      }
    } catch (err) {
      console.error("[AuthContext] Exceção ao buscar roles:", err);
      setRoles([]);
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
          // Evita liberar a UI antes de carregar as roles
          setTimeout(async () => {
            await fetchUserRole(currentSession.user.id);
            await SystemConfigService.syncToLocalStorage();
            setIsLoading(false);
          }, 0);
          return;
        } else {
          setRole(null);
          setRoles([]);
        }

        if (event === "SIGNED_OUT") {
          setRole(null);
          setRoles([]);
        }

        setIsLoading(false);
      }
    );

    // Buscar sessão inicial
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        await fetchUserRole(initialSession.user.id);
        await SystemConfigService.syncToLocalStorage();
      } else {
        setRole(null);
        setRoles([]);
      }

      setIsLoading(false);
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
    setRoles([]);
  };

  const value: AuthContextType = {
    user,
    session,
    role,
    roles,
    isAdmin: roles.includes("admin") || role === "admin",
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
