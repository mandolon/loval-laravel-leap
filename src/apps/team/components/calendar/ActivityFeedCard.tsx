import React from 'react';
import { ActivityItem } from './ActivityItem';
import { ActivityItemType } from '../../types';

interface ActivityFeedCardProps {
  items: ActivityItemType[];
  isLoading: boolean;
  isError: boolean;
  containerRef?: React.Ref<HTMLDivElement>;
}

export const ActivityFeedCard: React.FC<ActivityFeedCardProps> = ({
  items,
  isLoading,
  isError,
  containerRef,
}) => {
  return (
    <div
      ref={containerRef}
      className='md:w-96 lg:w-[400px] rounded-xl border border-neutral-200 bg-white/60 flex flex-col min-w-0 min-h-0 max-h-[400px] lg:max-h-[calc(100vh-14rem)] lg:h-full overflow-hidden'
    >
      <div className='flex items-center justify-between px-3 md:px-4 pt-3 md:pt-4 pb-3 border-b border-neutral-100 shadow-[0_6px_12px_-14px_rgba(0,0,0,0.4)]'>
        <h3 className='text-xs md:text-[13px] font-semibold text-[#202020]'>
          Activity Feed
        </h3>
        <div className='text-[10px] text-[#808080]'>Last 14 days</div>
      </div>

      <div className='flex-1 overflow-y-auto scrollbar-hide'>
        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-4 border-2 border-[#4c75d1] border-t-transparent rounded-full animate-spin' />
              <p className='text-sm text-[#808080]'>Loading activity...</p>
            </div>
          </div>
        ) : isError ? (
          <div className='flex flex-col items-center justify-center py-8 px-4'>
            <p className='text-sm text-red-600 text-center'>Failed to load activity</p>
            <button
              onClick={() => window.location.reload()}
              className='mt-2 text-xs text-[#4c75d1] hover:underline'
            >
              Retry
            </button>
          </div>
        ) : items.length > 0 ? (
          <>
            {items.map((item, index) => (
              <ActivityItem
                key={`${item.id}-${index}`}
                icon={item.icon}
                iconBg={item.iconBg}
                title={item.title}
                subtitle={item.subtitle}
                time={item.time}
                showBorder={index > 0}
                isFirst={index === 0}
                isLast={index === items.length - 1}
              />
            ))}
          </>
        ) : (
          <div className='flex items-center justify-center py-8'>
            <p className='text-sm text-[#808080]'>No activity in the last 14 days</p>
          </div>
        )}
      </div>
    </div>
  );
};
