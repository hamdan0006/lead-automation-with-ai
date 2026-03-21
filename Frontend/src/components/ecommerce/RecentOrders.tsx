import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";



export default function RecentOrders({
  automations = [],
  filter = 'flows',
  onFilterChange
}: {
  automations?: any[],
  filter?: 'flows' | 'trobs',
  onFilterChange?: (filter: 'flows' | 'trobs') => void
}) {
  // If no automations provided, fallback to empty array or show a message
  const displayData = automations.length > 0 ? automations : [];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent Automations
          </h3>
          {onFilterChange && (
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => onFilterChange('flows')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filter === 'flows'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
              >
                Flows
              </button>
              <button
                onClick={() => onFilterChange('trobs')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filter === 'trobs'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
              >
                Trobs
              </button>
            </div>
          )}
        </div>
      </div>
      {displayData.length > 0 ? (
        <div className="max-w-full overflow-x-auto">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Automation Name
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Platform
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Created Date
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Status
                </TableCell>
              </TableRow>
            </TableHeader>

            {/* Table Body */}

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {displayData.map((automation) => (
                <TableRow key={automation.id} className="">
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90 truncate max-w-[200px]">
                          {automation.templateId || "Custom Automation"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400 capitalize">
                    {/* Attempt to guess platform if not explicit, usually defined in template or config */}
                    {(automation.templateId || "").includes("linkedin") ? "LinkedIn" : (automation.templateId || "").includes("twitter") ? "Twitter" : "Trob"}
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {new Date(automation.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    <Badge
                      size="sm"
                      color={
                        automation.status === "active"
                          ? "success"
                          : automation.status === "completed"
                            ? "info"
                            : "warning"
                      }
                    >
                      {automation.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <svg
            className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-base font-medium">
            No automations to show
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Your recent automations will appear here
          </p>
        </div>
      )}
    </div>
  );
}
