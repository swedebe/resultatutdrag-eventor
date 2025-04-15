
import React from 'react';
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RunNotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-6">Körning hittades inte</h1>
      <p className="mb-6">Körningen du söker finns inte eller så har den tagits bort.</p>
      <Button onClick={() => navigate('/')}>
        <Home className="mr-2 h-4 w-4" />
        Tillbaka till startsidan
      </Button>
    </div>
  );
};

export default RunNotFound;
