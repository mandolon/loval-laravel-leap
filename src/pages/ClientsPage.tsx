import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSubhead } from "@/components/layout/PageSubhead";
import { DESIGN_TOKENS as T } from "@/lib/design-tokens";

const ClientsPage = () => {
  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#0B0E14] text-slate-700 dark:text-neutral-200 flex gap-1 p-1">
      <div className="relative min-h-0 flex-1 w-full overflow-hidden">
        <div className={`${T.panel} ${T.radius} min-h-0 min-w-0 grid grid-rows-[auto_1fr] overflow-hidden h-full`}>
          {/* Header */}
          <div className="h-9 px-3 border-b border-slate-200 dark:border-[#1d2230] flex items-center bg-white dark:bg-[#0E1118]">
            <span className="text-[12px] font-medium">Clients</span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-white dark:bg-[#0F1219] p-4">
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
        </div>
      </div>
    </div>
  );
};

export default ClientsPage;
