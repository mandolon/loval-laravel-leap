import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSubhead } from "@/components/layout/PageSubhead";

const ClientsPage = () => {
  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <PageHeader title="Clients" />
      </div>

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
