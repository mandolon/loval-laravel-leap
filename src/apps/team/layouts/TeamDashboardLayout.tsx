import RehomeDoubleSidebar from '../components/TeamDashboardCore';

export default function TeamDashboardLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="animate-in fade-in duration-200">
      <RehomeDoubleSidebar>{children}</RehomeDoubleSidebar>
    </div>
  );
}
