// frontend/app/admin-phoenix-2025/page.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [usuario, setUsuario] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [isRegister, setIsRegister] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isRegister ? "/admin/register" : "/admin/login";
      const payload = isRegister 
        ? { usuario, password } 
        : { usuario, password }; // ← ahora usamos "usuario"

      const res = await axios.post(`http://localhost:8000/api${endpoint}`, payload);
      
      // En tu página de login (admin-phoenix-2025/page.tsx o donde esté)
      if (!isRegister) {
        // ESTO ES LO ÚNICO QUE CAMBIA
        localStorage.setItem("access_token", res.data.access_token);
        router.push("/admin-phoenix-2025/dashboard");
      
      } else {
        alert("Admin creado! Ahora inicia sesión");
        setIsRegister(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-10 shadow-2xl">
        <h1 className="text-4xl font-bold text-center text-orange-600 mb-8">MERCADO FÉNIX</h1>
        <h2 className="text-2xl text-center mb-8">Panel Administrador</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>Usuario</Label>
            <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-lg py-6">
            {isRegister ? "Crear Admin" : "Iniciar Sesión"}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm">
          <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-orange-200 underline">
            {isRegister ? "Ya tengo cuenta" : "Primera vez? Crear admin"}
          </button>
        </p>
      </Card>
    </div>
  );
}