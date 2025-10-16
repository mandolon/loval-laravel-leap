import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const ClientsPage = () => {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold mb-2">Clients</h1>
        <p className="text-muted-foreground text-lg">
          Client information is now embedded in projects
        </p>
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
