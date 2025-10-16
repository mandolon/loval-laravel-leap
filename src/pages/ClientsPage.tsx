import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import type { Client } from "@/lib/api/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Mail, Phone, MapPin } from "lucide-react";

const ClientsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    setClients(api.clients.list());
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Clients</h1>
        <p className="text-muted-foreground text-lg">
          Manage your client information
        </p>
      </div>

      {/* Clients Grid */}
      {clients.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-semibold mb-2">No clients</h3>
          <p className="text-muted-foreground">
            Client information will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clients.map(client => (
            <Card key={client.id} className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl">{client.name}</CardTitle>
                    {client.company && (
                      <CardDescription className="text-base">{client.company}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{client.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
