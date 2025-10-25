import DetailLibraryViewer from '@/components/detail-library/DetailLibraryViewer';

const DetailLibraryPage = () => {
  return (
    <div className="h-full w-full pb-6 pr-1 overflow-hidden text-[12px]">
      <div className="h-full w-full bg-white dark:bg-neutral-900 rounded-lg border border-[#bbbbbb] shadow-sm overflow-hidden">
        <div className="h-full w-full overflow-y-auto">
          <DetailLibraryViewer />
        </div>
      </div>
    </div>
  );
};

export default DetailLibraryPage;
