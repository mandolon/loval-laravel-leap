/**
 * Navigation Icons Component
 * Icon-based navigation tabs (Home, Workspace, TaskBoard, AI)
 */

import { cn } from '@/lib/utils'
import { navIconItems } from '@/utils/layout.utils'
import type { NavIconsProps } from '@/types/layout.types'

export function NavIcons({ collapsed, activeTab, onTabChange }: NavIconsProps) {
  return (
    <div className="flex-shrink-0">
      <div
        className={cn('mb-4 transition-all duration-300', collapsed ? 'px-2' : 'px-2')}
        data-collapsed={collapsed}
      >
        <div
          className={cn(
            'flex items-center transition-all duration-500 ease-in-out p-1.5',
            collapsed ? 'flex-col gap-2' : 'justify-center gap-2'
          )}
          data-layout={collapsed ? 'vertical' : 'horizontal'}
          style={{
            transitionProperty: 'all',
            transitionDuration: '500ms',
            transitionTimingFunction: 'ease-in-out',
            transform: collapsed ? 'translateY(0)' : 'translateX(0)'
          }}
        >
          {navIconItems.map((item, index) => {
            const Icon = item.icon
            const isActive = activeTab === item.tab
            const sharedClasses = cn(
              'flex items-center justify-center transition-all duration-300 ease-in-out',
              collapsed ? 'w-9 h-9' : 'w-8 h-8'
            )
            const iconSize = collapsed ? 'w-4 h-4' : 'w-4 h-4'

            return (
              <button
                key={item.tab}
                onClick={() => onTabChange(item.tab)}
                className={cn(
                  sharedClasses,
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed
                    ? 'border border-border rounded-lg shadow-sm hover:shadow-md'
                    : 'rounded'
                )}
                style={{ transitionDelay: collapsed ? `${index * 40}ms` : '0ms' }}
                title={item.label}
              >
                <Icon className={iconSize} />
                {!collapsed && <span className="sr-only">{item.label}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
