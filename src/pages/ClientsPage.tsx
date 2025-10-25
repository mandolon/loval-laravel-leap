import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DESIGN_TOKENS as T } from "@/lib/design-tokens";

const ClientsPage = () => {
  return (
    <div className="h-full w-full text-[12px] overflow-hidden pb-6 pr-1">
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
  );
};

export default ClientsPage;