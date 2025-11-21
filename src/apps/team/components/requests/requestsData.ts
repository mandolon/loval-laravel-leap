/**
 * Request data types and mock data for Requests feature
 */

/**
 * Request status in Rehome.
 * "open" maps to any request that still needs a response,
 * "closed" is a request that has been completed in the UI.
 */
export type RequestStatus = "open" | "closed";

/**
 * Request record as used on the Rehome Requests page.
 * This mirrors a future `requests` table shape:
 * - `id` → primary key for the request
 * - `title` → short, one-line summary of what is being requested
 * - `body` → full request description / context
 * - `createdByUserId` / `createdByName` → who created the request
 * - `assignedToUserId` → who the request is scoped to (the "Send to" user)
 * - `projectId` / `projectLabel` → optional project this request is tied to (usually the address)
 * - `createdAt` → when the request was created
 * - `respondBy` → optional date the sender is expecting a response by
 * - `status` → open / closed
 * - `isUnread` → local flag for unread state in the inbox
 */
export interface Request {
  id: string;
  title: string;
  body: string;
  createdByUserId: string;
  createdByName: string;
  assignedToUserId: string;
  projectId: string | null;
  projectLabel: string | null;
  createdAt: string;
  respondBy: string | null;
  status: RequestStatus;
  isUnread?: boolean;
}

const CURRENT_USER_ID = "armando";
const CURRENT_USER_NAME = "Armando Lopez";

export const SEED_REQUESTS: Request[] = [
  {
    id: "r1",
    title: "Confirm stair dimensions at U Street",
    body: "Need final stair dimensions at landings before sending the set to engineer.",
    createdByUserId: "piner",
    createdByName: "Matthew Piner",
    assignedToUserId: CURRENT_USER_ID,
    projectId: "500-u-st",
    projectLabel: "500–502 U Street",
    createdAt: "2025-06-12T10:30:00",
    respondBy: "2025-06-14",
    status: "open",
    isUnread: true,
  },
  {
    id: "r2",
    title: "Send updated cabin elevations",
    body: "Share the latest cabin interior elevations and south gable updates.",
    createdByUserId: "kristen_garrett",
    createdByName: "Kristen & Garrett",
    assignedToUserId: CURRENT_USER_ID,
    projectId: "echo-summit",
    projectLabel: "Echo Summit cabin",
    createdAt: "2025-06-10T09:15:00",
    respondBy: "2025-06-15",
    status: "open",
    isUnread: true,
  },
  {
    id: "r3",
    title: "Add laundry deck option",
    body: "Add the laundry deck alternate and flag any zoning concerns.",
    createdByUserId: "rod",
    createdByName: "Rod",
    assignedToUserId: CURRENT_USER_ID,
    projectId: "2709-t-st",
    projectLabel: "2709 T Street",
    createdAt: "2025-06-05T16:05:00",
    respondBy: "2025-06-20",
    status: "open",
    isUnread: false,
  },
  {
    id: "r4",
    title: "Clarify window schedule for duplex",
    body: "Confirm window types and counts on the latest duplex set.",
    createdByUserId: "alfredo",
    createdByName: "Alfredo",
    assignedToUserId: CURRENT_USER_ID,
    projectId: "1560-sonoma",
    projectLabel: "1560 Sonoma Ave duplex",
    createdAt: "2025-05-28T14:45:00",
    respondBy: "2025-06-01",
    status: "closed",
    isUnread: false,
  },
  {
    id: "r5",
    title: "Send proposal for ADU legalization",
    body: "Pull together scope and fee for the ADU legalization package.",
    createdByUserId: "brett",
    createdByName: "Brett",
    assignedToUserId: CURRENT_USER_ID,
    projectId: "1919-25th",
    projectLabel: "1919 25th St ADU",
    createdAt: "2025-05-22T11:20:00",
    respondBy: "2025-05-30",
    status: "open",
    isUnread: false,
  },
  // Sent by current user (outbox)
  {
    id: "s1",
    title: "Review roof framing for cabin",
    body: "Can you confirm the final roof framing layout before I rebuild the Revit model?",
    createdByUserId: CURRENT_USER_ID,
    createdByName: CURRENT_USER_NAME,
    assignedToUserId: "dustin",
    projectId: "echo-summit",
    projectLabel: "Echo Summit cabin",
    createdAt: "2025-06-08T13:10:00",
    respondBy: "2025-06-18",
    status: "open",
    isUnread: false,
  },
  {
    id: "s2",
    title: "Confirm ADU fee schedule",
    body: "Double-check the latest fee schedule for ADU legalization before I send the proposal.",
    createdByUserId: CURRENT_USER_ID,
    createdByName: CURRENT_USER_NAME,
    assignedToUserId: "piner",
    projectId: "1919-25th",
    projectLabel: "1919 25th St ADU",
    createdAt: "2025-05-26T09:00:00",
    respondBy: null,
    status: "closed",
    isUnread: false,
  },
];

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function getUserDisplayName(userId: string): string {
  if (!userId) return "—";
  if (userId === CURRENT_USER_ID) return CURRENT_USER_NAME;
  const map: Record<string, string> = {
    piner: "Matthew Piner",
    dustin: "Dustin",
    rod: "Rod",
    brett: "Brett",
    alfredo: "Alfredo",
    kristen_garrett: "Kristen & Garrett",
  };
  return map[userId] || userId;
}

export { CURRENT_USER_ID, CURRENT_USER_NAME };
