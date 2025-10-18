import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

const ClientsPage = () => {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Clients"
        subtitle="Client information is now embedded in projects"
      />

      <Card>
        <CardHeader>
          <CardTitle>Migration Complete</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Client data is now stored directly within each project. View client details in the Project Details page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientsPage;
