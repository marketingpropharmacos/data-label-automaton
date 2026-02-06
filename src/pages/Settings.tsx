import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LabelSettings from "@/components/LabelSettings";
import logoProPharmacos from "@/assets/logo-propharmacos.png";

const Settings = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-card via-card to-accent/30 border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="border-primary/20 hover:bg-accent" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5 text-primary" />
              </Link>
            </Button>
            <img 
              src={logoProPharmacos} 
              alt="ProPharmacos" 
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold text-primary">Configurações</h1>
              <p className="text-sm text-muted-foreground">Sistema de Rótulos</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <LabelSettings />
      </main>
    </div>
  );
};

export default Settings;
